from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
import requests
import re
from bs4 import BeautifulSoup

from users.permissions import IsAdmin, IsApproved, IsRecruiter
from candidates.models import Candidate
from audit.utils import log_action
from .models import RecruiterAssignment, DailySubmissionLog, JobLinkEntry
from .serializers import (
    RecruiterAssignmentSerializer, DailySubmissionLogSerializer, JobLinkEntrySerializer,
)


@api_view(['GET'])
@permission_classes([IsApproved])
def assignments(request, candidate_id):
    qs = RecruiterAssignment.objects.filter(candidate_id=candidate_id).select_related(
        'recruiter__profile', 'candidate__user__profile'
    )
    return Response(RecruiterAssignmentSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def assign_recruiter(request):
    data = request.data.copy()
    data['assigned_by'] = request.user.id
    serializer = RecruiterAssignmentSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    log_action(request.user, 'recruiter_assigned', str(data.get('candidate')), 'assignment', data)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAdmin])
def unassign_recruiter(request, assignment_id):
    try:
        a = RecruiterAssignment.objects.get(id=assignment_id)
    except RecruiterAssignment.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    a.is_active = False
    a.unassigned_at = timezone.now()
    a.save()
    log_action(request.user, 'recruiter_unassigned', str(a.candidate_id), 'assignment', {})
    return Response({'message': 'Unassigned'})


@api_view(['GET'])
@permission_classes([IsRecruiter])
def my_candidates(request):
    assigned_ids = RecruiterAssignment.objects.filter(
        recruiter=request.user, is_active=True
    ).values_list('candidate_id', flat=True)

    from candidates.serializers import CandidateListSerializer
    candidates = Candidate.objects.filter(id__in=assigned_ids).select_related('user__profile')
    return Response(CandidateListSerializer(candidates, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsApproved])
def daily_logs(request, candidate_id):
    try:
        candidate_obj = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=404)

    is_allowed = request.user.role in ('admin', 'recruiter', 'team_lead', 'team_manager')
    if request.user.role == 'candidate':
        # Check against the User ID, not the Candidate Record ID
        if str(request.user.id) != str(candidate_obj.user_id) or request.method != 'GET':
            is_allowed = False
    
    if not is_allowed:
        return Response({'error': 'Forbidden'}, status=403)

    if request.method == 'GET':
        logs = DailySubmissionLog.objects.filter(
            candidate_id=candidate_id
        ).prefetch_related('job_entries').order_by('-log_date')
        return Response(DailySubmissionLogSerializer(logs, many=True).data)

    log, created = DailySubmissionLog.objects.get_or_create(
        candidate_id=candidate_id,
        recruiter=request.user,
        log_date=timezone.now().date(),
    )
    
    log.applications_count += int(request.data.get('applications_count', 0))
    log.notes = (log.notes or "") + "\n" + request.data.get('notes', '')
    log.save()

    job_links = request.data.get('job_links', [])
    for jl in job_links:
        JobLinkEntry.objects.create(
            submission_log=log,
            candidate_id=candidate_id,
            company_name=jl.get('company_name', ''),
            role_title=jl.get('role_title', ''),
            job_url=jl.get('job_url', ''),
            resume_used=jl.get('resume_used', ''),
            application_status=jl.get('status', 'applied').lower().replace(' ', '_'),
            submitted_by=request.user
        )

    return Response(DailySubmissionLogSerializer(log).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsApproved])
def update_job_status(request, job_id):
    try:
        job = JobLinkEntry.objects.get(id=job_id)
    except JobLinkEntry.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    if new_status:
        job.candidate_response_status = new_status
        job.save()
    return Response(JobLinkEntrySerializer(job).data)


@api_view(['GET'])
@permission_classes([IsApproved])
def recruiter_stats(request):
    user = request.user
    user_id = request.query_params.get('user_id')
    
    # If admin/team_lead, they can peek at someone else's stats
    if user_id and user.role in ('admin', 'team_lead', 'team_manager'):
        from users.models import User
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

    today = timezone.now().date()
    start_of_week = today - timezone.timedelta(days=today.weekday())
    
    logs = DailySubmissionLog.objects.filter(recruiter=user)
    
    today_logs = logs.filter(log_date=today)
    week_logs = logs.filter(log_date__gte=start_of_week)
    
    # We can also count interviews/offers from JobLinkEntry
    jobs = JobLinkEntry.objects.filter(submitted_by=user)
    week_interviews = jobs.filter(application_status__icontains='interview', updated_at__date__gte=start_of_week).count()
    week_offers = jobs.filter(application_status='offer', updated_at__date__gte=start_of_week).count()

    return Response({
        'apps_today': sum(l.applications_count for l in today_logs),
        'apps_week': sum(l.applications_count for l in week_logs),
        'interviews_week': week_interviews,
        'offers_week': week_offers
    })


@api_view(['GET', 'POST', 'PATCH'])
@permission_classes([IsRecruiter])
def recruiter_profile(request):
    from .models import RecruiterProfile
    profile, _ = RecruiterProfile.objects.get_or_create(user=request.user)
    
    if request.method in ('POST', 'PATCH'):
        profile.city = request.data.get('city', profile.city)
        profile.state = request.data.get('state', profile.state)
        profile.country = request.data.get('country', profile.country)
        profile.linkedin_url = request.data.get('linkedin_url', profile.linkedin_url)
        profile.save()
        return Response({'message': 'Profile updated'})

    return Response({
        'city': profile.city,
        'state': profile.state,
        'country': profile.country,
        'linkedin_url': profile.linkedin_url
    })


@api_view(['GET', 'POST'])
@permission_classes([IsRecruiter])
def bank_details(request):
    from .models import RecruiterBankDetails
    bank, _ = RecruiterBankDetails.objects.get_or_create(recruiter=request.user)
    
    if request.method == 'POST':
        acc = request.data.get('account_number', '')
        rtn = request.data.get('routing_number', '')
        
        bank.bank_name = request.data.get('bank_name', bank.bank_name)
        if acc and not acc.startswith('****'):
            bank.account_number_last4 = acc[-4:]
            bank.account_number_encrypted = acc # Simple storage for now
        if rtn and not rtn.startswith('****'):
            bank.routing_number_last4 = rtn[-4:]
            bank.routing_number_encrypted = rtn
        bank.save()
        
        log_action(request.user, 'bank_details_updated', str(request.user.id), 'recruiter_bank', {'bank_name': bank.bank_name})
        return Response({'message': 'Bank details updated'})

    return Response({
        'bank_name': bank.bank_name,
        'account_number_last4': bank.account_number_last4,
        'routing_number_last4': bank.routing_number_last4
    })


@api_view(['POST'])
@permission_classes([IsRecruiter])
def fetch_job_details(request):
    url = request.data.get('url')
    if not url:
        return Response({'error': 'URL is required'}, status=400)
    
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            title = soup.title.string if soup.title else ""
            title = re.sub(r' \| .*', '', title)
            title = re.sub(r' - .*', '', title)
            
            company = ""
            og_site = soup.find('meta', property='og:site_name')
            if og_site:
                company = og_site.get('content', '')
            
            if 'linkedin.com' in url:
                company_meta = soup.find('meta', property='og:description')
                if company_meta:
                    match = re.search(r'at (.*?) in', company_meta.get('content', ''))
                    if match: company = match.group(1)
            
            return Response({'role_title': title.strip(), 'company_name': company.strip()})
    except:
        pass
    return Response({'role_title': '', 'company_name': ''})
