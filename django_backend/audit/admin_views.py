from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from users.permissions import IsAdmin

from candidates.models import Candidate, Referral, TrainingScheduleClick


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_referrals(request):
    refs = Referral.objects.select_related('candidate__user__profile').order_by('-created_at')
    data = []
    for r in refs:
        name = ''
        try:
            name = r.candidate.user.profile.full_name
        except Exception:
            pass
        data.append({
            'id': str(r.id),
            'referrer_name': name,
            'friend_name': r.friend_name,
            'friend_email': r.friend_email,
            'friend_phone': r.friend_phone or '',
            'status': r.status,
            'notes': r.notes or '',
            'created_at': r.created_at.isoformat(),
        })
    return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def admin_referral_update(request, referral_id):
    try:
        ref = Referral.objects.get(id=referral_id)
    except Referral.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    if 'status' in request.data:
        ref.status = request.data['status']
    if 'notes' in request.data:
        ref.notes = request.data['notes']
    ref.save()
    return Response({'message': 'Updated'})


@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def admin_config(request):
    from candidates.models import Candidate
    # Use a simple key-value model. For now store in a dict-like approach.
    # We'll use Django's cache or a simple model. Let's create inline.
    try:
        from django.apps import apps
        AdminConfig = apps.get_model('audit', 'AdminConfig')
    except LookupError:
        return Response({})

    if request.method == 'GET':
        configs = AdminConfig.objects.all()
        return Response([{'config_key': c.config_key, 'config_value': c.config_value} for c in configs])

    configs = request.data.get('configs', {})
    for key, value in configs.items():
        AdminConfig.objects.update_or_create(config_key=key, defaults={'config_value': value})
    return Response({'message': 'Saved'})


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_training_clicks(request):
    from django.utils import timezone
    from datetime import timedelta
    thirty_days_ago = timezone.now() - timedelta(days=30)
    clicks = TrainingScheduleClick.objects.filter(
        created_at__gte=thirty_days_ago
    ).select_related('candidate__user__profile').order_by('-created_at')[:50]

    data = []
    for c in clicks:
        name = ''
        try:
            name = c.candidate.user.profile.full_name
        except Exception:
            pass
        data.append({
            'id': str(c.id),
            'candidate_name': name,
            'training_type': c.training_type,
            'created_at': c.created_at.isoformat(),
        })
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def send_test_email(request):
    return Response({'message': 'Test email sent (placeholder)'})


@api_view(['GET'])
@permission_classes([IsAdmin])
def report_pipeline(request):
    candidates = Candidate.objects.select_related('user__profile').all()
    from recruiters.models import RecruiterAssignment
    data = []
    for c in candidates:
        name = email = ''
        try:
            name = c.user.profile.full_name
            email = c.user.profile.email or c.user.email
        except Exception:
            email = c.user.email
        assigns = RecruiterAssignment.objects.filter(candidate=c, is_active=True).select_related('recruiter__profile')
        recruiters = ', '.join([
            f"{a.recruiter.profile.full_name} ({a.role_type})" if hasattr(a.recruiter, 'profile') else a.role_type
            for a in assigns
        ])
        data.append({
            'candidate_name': name, 'email': email, 'status': c.status,
            'assigned_recruiters': recruiters,
            'created_at': c.created_at.isoformat(),
            'last_updated': c.updated_at.isoformat(),
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def report_recruiter_productivity(request):
    from recruiters.models import RecruiterAssignment, DailySubmissionLog
    from candidates.models import InterviewLog
    from users.models import User
    recruiter_ids = RecruiterAssignment.objects.filter(is_active=True).values_list('recruiter_id', flat=True).distinct()
    data = []
    for rid in recruiter_ids:
        try:
            user = User.objects.get(id=rid)
            name = user.profile.full_name if hasattr(user, 'profile') else user.email
            email = user.email
        except Exception:
            name = email = str(rid)
        candidate_count = RecruiterAssignment.objects.filter(recruiter_id=rid, is_active=True).count()
        total_submissions = sum(
            DailySubmissionLog.objects.filter(recruiter_id=rid).values_list('applications_count', flat=True)
        )
        interviews = InterviewLog.objects.filter(submitted_by_id=rid).count()
        data.append({
            'recruiter_name': name, 'email': email,
            'assigned_candidates': candidate_count,
            'total_submissions': total_submissions,
            'interviews_logged': interviews,
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def report_candidate_activity(request):
    from recruiters.models import DailySubmissionLog, JobLinkEntry
    from candidates.models import InterviewLog
    candidates = Candidate.objects.select_related('user__profile').all()
    data = []
    for c in candidates:
        name = ''
        try:
            name = c.user.profile.full_name
        except Exception:
            pass
        total_submissions = sum(
            DailySubmissionLog.objects.filter(candidate=c).values_list('applications_count', flat=True)
        )
        job_links = JobLinkEntry.objects.filter(candidate=c).count()
        interviews = InterviewLog.objects.filter(candidate=c).count()
        clicks = TrainingScheduleClick.objects.filter(candidate=c).count()
        data.append({
            'candidate_name': name,
            'total_submissions': total_submissions,
            'job_links': job_links,
            'interviews': interviews,
            'training_clicks': clicks,
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def report_subscription_ledger(request):
    from billing.models import Subscription, Payment
    from recruiters.models import RecruiterAssignment
    subs = Subscription.objects.select_related('candidate__user__profile').all()
    data = []
    for s in subs:
        name = ''
        try:
            name = s.candidate.user.profile.full_name
        except Exception:
            pass
        assigns = RecruiterAssignment.objects.filter(candidate=s.candidate, is_active=True).select_related('recruiter__profile')
        recruiters = ', '.join([
            a.recruiter.profile.full_name if hasattr(a.recruiter, 'profile') else 'Unknown'
            for a in assigns
        ])
        total_paid = sum(
            Payment.objects.filter(candidate=s.candidate, status='completed').values_list('amount', flat=True)
        )
        data.append({
            'candidate': name, 'recruiters': recruiters,
            'subscription_status': s.status,
            'next_billing_at': s.next_billing_at.isoformat() if s.next_billing_at else '',
            'last_payment': s.last_payment_at.isoformat() if s.last_payment_at else '',
            'total_paid': float(total_paid),
            'marketing_status': s.candidate.status,
        })
    return Response(data)
