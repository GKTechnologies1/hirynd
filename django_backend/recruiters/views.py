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

    log = DailySubmissionLog.objects.create(
        candidate_id=candidate_id,
        recruiter=request.user,
        applications_count=request.data.get('applications_count', 0),
        notes=request.data.get('notes', ''),
    )

    job_links = request.data.get('job_links', [])
    for jl in job_links:
        JobLinkEntry.objects.create(
            submission_log=log,
            candidate_id=candidate_id,
            company_name=jl.get('company_name', ''),
            role_title=jl.get('role_title', ''),
            job_url=jl.get('job_url', ''),
            resume_used=jl.get('resume_used', ''),
            status=jl.get('status', 'applied'),
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
