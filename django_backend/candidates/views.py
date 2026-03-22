from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone

from users.permissions import IsAdmin, IsApproved, IsRecruiter, IsCandidate
from audit.utils import log_action
from .models import (
    Candidate, ClientIntake, RoleSuggestion, CredentialVersion,
    Referral, InterviewLog, PlacementClosure, Payment,
)
from .serializers import (
    CandidateSerializer, CandidateListSerializer, ClientIntakeSerializer,
    RoleSuggestionSerializer, CredentialVersionSerializer,
    ReferralSerializer, InterviewLogSerializer, PlacementClosureSerializer,
    PaymentSerializer,
)


# ─── Candidate CRUD ───

@api_view(['GET'])
@permission_classes([IsApproved])
def candidate_me(request):
    """Return the Candidate record for the logged-in user, creating it lazily if needed."""
    if request.user.role != 'candidate':
        return Response({'error': 'Not a candidate user'}, status=status.HTTP_403_FORBIDDEN)
    candidate, created = Candidate.objects.get_or_create(
        user=request.user,
        defaults={'status': 'approved'},
    )
    if not created and candidate.status == 'pending_approval':
        candidate.status = 'approved'
        candidate.save(update_fields=['status'])
    return Response(CandidateSerializer(candidate).data)


@api_view(['GET'])
@permission_classes([IsApproved])
def candidate_list(request):
    if request.user.role in ('admin', 'team_lead', 'team_manager'):
        qs = Candidate.objects.select_related('user__profile').all()
    elif request.user.role in ('recruiter',):
        assigned_ids = request.user.recruiter_assignments.filter(
            is_active=True
        ).values_list('candidate_id', flat=True)
        qs = Candidate.objects.filter(id__in=assigned_ids).select_related('user__profile')
    else:
        qs = Candidate.objects.filter(user=request.user).select_related('user__profile')

    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)

    return Response(CandidateListSerializer(qs.order_by('-created_at'), many=True).data)


@api_view(['GET'])
@permission_classes([IsApproved])
def candidate_detail(request, candidate_id):
    try:
        candidate = Candidate.objects.select_related('user__profile').get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(CandidateSerializer(candidate).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def update_candidate_status(request, candidate_id):
    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    old_status = candidate.status
    candidate.status = new_status
    candidate.save()

    log_action(request.user, 'status_change', str(candidate.id), 'candidate',
               {'old': old_status, 'new': new_status})

    return Response({'message': f'Status updated to {new_status}'})


# ─── Intake ───

@api_view(['GET', 'POST'])
@permission_classes([IsApproved])
def intake(request, candidate_id):
    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        try:
            intake = ClientIntake.objects.get(candidate=candidate)
            return Response(ClientIntakeSerializer(intake).data)
        except ClientIntake.DoesNotExist:
            return Response({})

    # Check lock
    try:
        existing = ClientIntake.objects.get(candidate=candidate)
        if existing.is_locked:
            return Response({'error': 'Intake is locked. Contact admin to reopen.'}, status=status.HTTP_403_FORBIDDEN)
    except ClientIntake.DoesNotExist:
        pass

    # Accept both { data: {...} } (legacy) and flat field submission
    payload = request.data.get('data') if 'data' in request.data else request.data
    intake, created = ClientIntake.objects.update_or_create(
        candidate=candidate,
        defaults={'data': payload, 'submitted_at': timezone.now(), 'is_locked': True},
    )
    if candidate.status in ('approved', 'intake_pending', 'lead'):
        candidate.status = 'intake_submitted'
        candidate.save()
    log_action(request.user, 'intake_submitted', str(candidate.id), 'candidate', {})
    return Response(ClientIntakeSerializer(intake).data)


# ─── Roles ───

@api_view(['GET'])
@permission_classes([IsApproved])
def role_list(request, candidate_id):
    roles = RoleSuggestion.objects.filter(candidate_id=candidate_id)
    return Response(RoleSuggestionSerializer(roles, many=True).data)


@api_view(['POST'])
@permission_classes([IsRecruiter])
def add_role(request, candidate_id):
    data = request.data.copy()
    data['candidate'] = candidate_id
    data['suggested_by'] = request.user.id
    serializer = RoleSuggestionSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsCandidate])
def confirm_roles(request, candidate_id):
    decisions = request.data.get('decisions', {})
    for role_id, confirmed in decisions.items():
        RoleSuggestion.objects.filter(id=role_id, candidate_id=candidate_id).update(
            candidate_confirmed=confirmed, confirmed_at=timezone.now()
        )
    candidate = Candidate.objects.get(id=candidate_id)
    if candidate.status == 'roles_suggested':
        candidate.status = 'roles_confirmed'
        candidate.save()
    return Response({'message': 'Roles confirmed'})


# ─── Credentials ───

@api_view(['GET'])
@permission_classes([IsApproved])
def credential_list(request, candidate_id):
    versions = CredentialVersion.objects.filter(candidate_id=candidate_id).select_related('edited_by__profile')
    return Response(CredentialVersionSerializer(versions, many=True).data)


@api_view(['POST'])
@permission_classes([IsApproved])
def upsert_credential(request, candidate_id):
    last_version = CredentialVersion.objects.filter(candidate_id=candidate_id).order_by('-version').first()
    new_version = (last_version.version + 1) if last_version else 1
    cred = CredentialVersion.objects.create(
        candidate_id=candidate_id,
        data=request.data.get('data', {}),
        edited_by=request.user,
        version=new_version,
    )
    log_action(request.user, 'credential_edit', str(candidate_id), 'credential', {'version': new_version})
    return Response(CredentialVersionSerializer(cred).data, status=status.HTTP_201_CREATED)


# ─── Referrals ───

@api_view(['GET', 'POST'])
@permission_classes([IsApproved])
def referrals(request, candidate_id):
    if request.method == 'GET':
        refs = Referral.objects.filter(referrer_id=candidate_id)
        return Response(ReferralSerializer(refs, many=True).data)

    data = request.data.copy()
    data['referrer'] = candidate_id
    serializer = ReferralSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


# ─── Interviews ───

@api_view(['GET', 'POST'])
@permission_classes([IsApproved])
def interviews(request, candidate_id):
    if request.method == 'GET':
        logs = InterviewLog.objects.filter(candidate_id=candidate_id)
        return Response(InterviewLogSerializer(logs, many=True).data)

    data = request.data.copy()
    data['candidate'] = candidate_id
    data['submitted_by'] = request.user.id
    serializer = InterviewLogSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


# ─── Candidate Payments ───

@api_view(['GET'])
@permission_classes([IsApproved])
def candidate_payments(request, candidate_id):
    payments = Payment.objects.filter(candidate_id=candidate_id).order_by('-due_date')
    return Response(PaymentSerializer(payments, many=True).data)


# ─── Admin Referrals ───

@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_referrals(request):
    refs = Referral.objects.select_related('referrer__user__profile').all().order_by('-created_at')
    data = []
    for ref in refs:
        row = ReferralSerializer(ref).data
        try:
            row['referrer_name'] = ref.referrer.user.profile.full_name
        except Exception:
            row['referrer_name'] = 'Unknown'
        data.append(row)
    return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def update_referral(request, referral_id):
    try:
        ref = Referral.objects.get(id=referral_id)
    except Referral.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    ref_status = request.data.get('status')
    notes_val = request.data.get('notes')
    if ref_status:
        ref.status = ref_status
    if notes_val is not None:
        ref.notes = notes_val
    ref.save()
    row = ReferralSerializer(ref).data
    try:
        row['referrer_name'] = ref.referrer.user.profile.full_name
    except Exception:
        row['referrer_name'] = 'Unknown'
    return Response(row)


# ─── Placement ───

@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def placement(request, candidate_id):
    if request.method == 'GET':
        try:
            p = PlacementClosure.objects.get(candidate_id=candidate_id)
            return Response(PlacementClosureSerializer(p).data)
        except PlacementClosure.DoesNotExist:
            return Response({})

    data = request.data.copy()
    data['candidate'] = candidate_id
    data['closed_by'] = request.user.id
    serializer = PlacementClosureSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save()

    Candidate.objects.filter(id=candidate_id).update(status='placed')
    log_action(request.user, 'placement_closed', str(candidate_id), 'candidate', data)
    return Response(serializer.data, status=status.HTTP_201_CREATED)
