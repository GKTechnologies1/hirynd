from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator

from users.permissions import IsAdmin, IsApproved, IsRecruiter, IsCandidate
from audit.utils import log_action
from .models import (
    Candidate, ClientIntake, RoleSuggestion, RoleConfirmation, CredentialVersion,
    Referral, InterviewLog, PlacementClosure, CandidateLegacyPayment, InterestedCandidate,
    WorkExperience, Certification,
)
from billing.models import Payment
from .serializers import (
    CandidateSerializer, CandidateListSerializer, ClientIntakeSerializer,
    RoleSuggestionSerializer, CredentialVersionSerializer,
    ReferralSerializer, InterviewLogSerializer, PlacementClosureSerializer,
    PaymentSerializer, InterestedCandidateSerializer,
)
from billing.utils import ensure_default_subscription


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

    search = request.query_params.get('search', '').strip()
    if search:
        from django.db.models import Q
        qs = qs.filter(
            Q(user__email__icontains=search) |
            Q(user__profile__full_name__icontains=search)
        )

    qs = qs.order_by('-created_at')
    total = qs.count()
    page = int(request.query_params.get('page', 0))
    page_size = int(request.query_params.get('page_size', 0))
    if page > 0 and page_size > 0:
        start = (page - 1) * page_size
        data = CandidateListSerializer(qs[start:start + page_size], many=True).data
        return Response({'total': total, 'results': data})

    return Response(CandidateListSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsApproved])
def candidate_detail(request, candidate_id):
    try:
        try:
            candidate = Candidate.objects.select_related('user__profile').get(id=candidate_id)
        except (Candidate.DoesNotExist, ValueError, ValidationError):
            # Fallback for when a User ID is passed instead of Candidate ID
            candidate = Candidate.objects.select_related('user__profile').get(user_id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(CandidateSerializer(candidate).data)


@api_view(['GET'])
@permission_classes([IsRecruiter])
def interested_candidate_list(request):
    qs = InterestedCandidate.objects.all().order_by('-created_at')
    search = request.query_params.get('search', '').strip()
    if search:
        from django.db.models import Q
        qs = qs.filter(
            Q(name__icontains=search) |
            Q(email__icontains=search) |
            Q(university__icontains=search) |
            Q(referral_source__icontains=search)
        )
    return Response(InterestedCandidateSerializer(qs, many=True).data)


@api_view(['GET', 'PATCH'])
@permission_classes([IsRecruiter])
def interested_candidate_detail(request, lead_id):
    try:
        lead = InterestedCandidate.objects.get(id=lead_id)
    except InterestedCandidate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        serializer = InterestedCandidateSerializer(lead, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    return Response(InterestedCandidateSerializer(lead).data)


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

def validate_intake_data(data):
    """Comprehensive validation for intake form data"""
    errors = {}
    
    # Required personal fields
    required_personal = ['first_name', 'last_name', 'date_of_birth', 'phone_number', 'email', 'current_address', 'city', 'state', 'country', 'zip_code']
    for field in required_personal:
        if not data.get(field):
            errors[field] = f"{field.replace('_', ' ').title()} is required"
    
    # Required education fields
    required_education = ['university_name', 'major', 'graduation_date', 'highest_degree']
    for field in required_education:
        if not data.get(field):
            errors[field] = f"{field.replace('_', ' ').title()} is required"
    
    # Required authorization fields
    required_auth = ['visa_type', 'work_authorization_status']
    for field in required_auth:
        if not data.get(field):
            errors[field] = f"{field.replace('_', ' ').title()} is required"
    
    # Required job preference fields
    required_prefs = ['desired_experience', 'industry_preference', 'shift_preference']
    for field in required_prefs:
        if not data.get(field):
            errors[field] = f"{field.replace('_', ' ').title()} is required"
    
    # Required experience fields
    if not data.get('years_of_experience'):
        errors['years_of_experience'] = "Years of Experience is required"
    
    # File URL validation
    document_urls = ['resume_url', 'passport_url', 'government_id_url', 'work_authorization_url']
    for url_field in document_urls:
        if data.get(url_field):
            try:
                URLValidator()(data[url_field])
            except ValidationError:
                errors[url_field] = f"Invalid URL format for {url_field}"
    
    # Date format validation
    from datetime import datetime
    date_fields = ['date_of_birth', 'graduation_date', 'first_entry_us', 'visa_expiry_date', 'ready_to_start_date']
    for date_field in date_fields:
        if data.get(date_field):
            try:
                datetime.strptime(data[date_field], '%m-%d-%Y')
            except (ValueError, TypeError):
                errors[date_field] = f"{date_field} must be in MM-DD-YYYY format"
    
    # Phone validation (basic)
    if data.get('phone_number'):
        phone = data['phone_number'].replace('-', '').replace(' ', '')
        if not phone.isdigit() or len(phone) < 10:
            errors['phone_number'] = "Invalid phone number format"
    
    return errors


@api_view(['GET', 'POST'])
@permission_classes([IsApproved])
def intake(request, candidate_id):
    try:
        candidate = Candidate.objects.select_related('user__profile').get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        try:
            intake = ClientIntake.objects.get(candidate=candidate)
            return Response(ClientIntakeSerializer(intake).data)
        except ClientIntake.DoesNotExist:
            # Fallback: Pre-populate from Candidate + User Profile for initial form load
            initial_data = {
                'full_name': candidate.user.profile.full_name,
                'phone': candidate.user.profile.phone,
                'email': candidate.user.email,
                'university': candidate.university,
                'major': candidate.major,
                'degree': candidate.degree,
                'graduation_year': candidate.graduation_year or (str(candidate.graduation_date.year) if candidate.graduation_date else ""),
                'visa_status': candidate.visa_status,
                'linkedin_url': candidate.linkedin_url,
                'portfolio_url': candidate.portfolio_url,
                'current_location': candidate.current_location,
                'notes': candidate.notes,
            }
            return Response({'candidate': str(candidate_id), 'data': initial_data, 'is_locked': False})

    # Check lock
    try:
        existing = ClientIntake.objects.get(candidate=candidate)
        if existing.is_locked:
            return Response({'error': 'Intake is locked. Contact admin to reopen.'}, status=status.HTTP_403_FORBIDDEN)
    except ClientIntake.DoesNotExist:
        pass

    # Accept both { data: {...} } (legacy) and flat field submission
    payload = request.data.get('data') if 'data' in request.data else request.data
    
    # Validate intake data
    validation_errors = validate_intake_data(payload)
    if validation_errors:
        return Response({
            'error': 'Validation failed',
            'validation_errors': validation_errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    intake, created = ClientIntake.objects.update_or_create(
        candidate=candidate,
        defaults={'data': payload, 'submitted_at': timezone.now(), 'is_locked': True},
    )
    
    # Process work experiences and certifications from payload
    if payload.get('experiences'):
        WorkExperience.objects.filter(candidate=candidate).delete()
        for exp in payload['experiences']:
            WorkExperience.objects.create(
                candidate=candidate,
                job_title=exp.get('job_title', ''),
                company_name=exp.get('company_name', ''),
                company_address=exp.get('company_address', ''),
                start_date=exp.get('start_date'),
                end_date=exp.get('end_date'),
                job_type=exp.get('job_type', 'full_time'),
                responsibilities=exp.get('responsibilities', ''),
            )
    
    if payload.get('certifications'):
        Certification.objects.filter(candidate=candidate).delete()
        for cert in payload['certifications']:
            Certification.objects.create(
                candidate=candidate,
                name=cert.get('name', ''),
                organization=cert.get('organization', ''),
                issued_date=cert.get('issued_date'),
                expires_date=cert.get('expires_date'),
                credential_url=cert.get('credential_url', ''),
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
    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=status.HTTP_404_NOT_FOUND)

    payload = request.data
    decisions = payload.get('decisions', {})
    notes = payload.get('notes', {})
    custom_role = payload.get('custom_role')
    
    for role_id, decision in decisions.items():
        status_val = True if decision == 'accepted' else False if decision == 'declined' else None
        RoleSuggestion.objects.filter(id=role_id, candidate_id=candidate_id).update(
            candidate_confirmed=status_val,
            confirmed_at=timezone.now(),
            change_request_note=notes.get(role_id, '') if decision == 'change_requested' else None
        )
    
    if custom_role and custom_role.get('title'):
        RoleConfirmation.objects.create(
            candidate_id=candidate_id,
            response='change_requested',
            custom_role_title=custom_role['title'],
            custom_reason=custom_role.get('reason')
        )

    if candidate.status in ('roles_suggested', 'roles_published', 'intake_submitted'):
        candidate.status = 'payment_pending'
        candidate.save()
        
    # AUTOMATION: Ensure the $400 subscription exists
    ensure_default_subscription(candidate)
    
    return Response({'message': 'Roles confirmed'})


@api_view(['POST'])
@permission_classes([IsAdmin])
def reopen_intake(request, candidate_id):
    try:
        intake = ClientIntake.objects.get(candidate_id=candidate_id)
        intake.is_locked = False
        intake.save()
        log_action(request.user, 'intake_reopened', str(candidate_id), 'intake', {})
        return Response({'message': 'Intake reopened'})
    except ClientIntake.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAdmin])
def reopen_roles(request, candidate_id):
    try:
        RoleSuggestion.objects.filter(candidate_id=candidate_id).update(
            candidate_confirmed=None,
            confirmed_at=None,
            change_request_note=None
        )
        candidate = Candidate.objects.get(id=candidate_id)
        candidate.status = 'intake_submitted'
        candidate.save()
        log_action(request.user, 'roles_reopened', str(candidate_id), 'roles', {})
        return Response({'message': 'Roles reopened and status reset'})
    except Candidate.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


# ─── Credentials ───

@api_view(['GET'])
@permission_classes([IsApproved])
def credentials(request, candidate_id):
    versions = CredentialVersion.objects.filter(candidate_id=candidate_id).select_related('edited_by__profile')
    return Response(CredentialVersionSerializer(versions, many=True).data)


@api_view(['POST'])
@permission_classes([IsApproved])
def upsert_credential(request, candidate_id):
    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    # Accept both { data: {...} } and flat submission
    payload = request.data.get('data') if 'data' in request.data else request.data

    last_version = CredentialVersion.objects.filter(candidate=candidate).order_by('-version').first()
    new_version = (last_version.version + 1) if last_version else 1
    cred = CredentialVersion.objects.create(
        candidate=candidate,
        data=payload,
        edited_by=request.user,
        version=new_version,
    )

    if candidate.status in ('payment_completed', 'roles_confirmed', 'pending_payment'):
        candidate.status = 'credentials_submitted'
        candidate.save(update_fields=['status'])

    log_action(request.user, 'credential_edit', str(candidate.id), 'credential', {'version': new_version})
    return Response(CredentialVersionSerializer(cred).data, status=status.HTTP_201_CREATED)


# ─── Referrals ───

@api_view(['GET', 'POST'])
@permission_classes([IsApproved])
def referrals(request, candidate_id):
    if request.method == 'GET':
        refs = Referral.objects.filter(referrer_id=candidate_id)
        return Response(ReferralSerializer(refs, many=True).data)

    data = request.data.copy()
    serializer = ReferralSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save(referrer_id=candidate_id)
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
    serializer = InterviewLogSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save(submitted_by=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


# ─── Candidate Payments ───

@api_view(['GET'])
@permission_classes([IsApproved])
def candidate_payments(request, candidate_id):
    # USE THE UPDATED BILLING PAYMENT MODEL INSTEAD OF LEGACY
    payments = Payment.objects.filter(candidate_id=candidate_id).order_by('-created_at')
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
    serializer = PlacementClosureSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save(closed_by=request.user)

    Candidate.objects.filter(id=candidate_id).update(status='placed_closed')
    log_action(request.user, 'placement_closed', str(candidate_id), 'candidate', data)
    return Response(serializer.data, status=status.HTTP_201_CREATED)
