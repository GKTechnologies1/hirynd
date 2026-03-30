"""
Jobs & Candidate Submissions views.

Admin  — full CRUD on JobOpenings and CandidateSubmissions
Recruiter — read jobs, manage submissions for their candidates
Candidate — view jobs they've been submitted to (read-only)
"""
import logging

from django.db.models import Count, Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from audit.utils import log_action
from candidates.models import Candidate
from users.permissions import IsAdmin, IsApproved

from .models import CandidateSubmission, JobOpening
from .serializers import CandidateSubmissionSerializer, JobOpeningSerializer

logger = logging.getLogger(__name__)


# ─── Job Openings ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsApproved])
def list_jobs(request):
    """
    GET /api/jobs/
    Query params: status, employment_type, search, page, page_size
    """
    qs = JobOpening.objects.annotate(sub_count=Count('submissions'))

    s = request.query_params.get('status')
    if s:
        qs = qs.filter(status=s)

    et = request.query_params.get('employment_type')
    if et:
        qs = qs.filter(employment_type=et)

    search = request.query_params.get('search', '').strip()
    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(company__icontains=search))

    # Optional pagination
    total = qs.count()
    page = int(request.query_params.get('page', 0))
    page_size = int(request.query_params.get('page_size', 0))
    if page > 0 and page_size > 0:
        start = (page - 1) * page_size
        qs = qs[start:start + page_size]

    return Response({
        'total': total,
        'results': JobOpeningSerializer(qs, many=True).data,
    })


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_job(request):
    serializer = JobOpeningSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    job = serializer.save(posted_by=request.user)
    log_action(request.user, 'job_created', str(job.id), 'job_opening', {'title': job.title})
    return Response(JobOpeningSerializer(job).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsApproved])
def manage_job(request, job_id):
    try:
        job = JobOpening.objects.get(id=job_id)
    except JobOpening.DoesNotExist:
        return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        subs = job.submissions.select_related('candidate__user__profile', 'submitted_by__profile')
        return Response({
            **JobOpeningSerializer(job).data,
            'submissions': CandidateSubmissionSerializer(subs, many=True).data,
        })

    if request.user.role not in ('admin', 'team_lead', 'team_manager'):
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'DELETE':
        log_action(request.user, 'job_deleted', str(job_id), 'job_opening', {'title': job.title})
        job.delete()
        return Response({'detail': 'Deleted'})

    serializer = JobOpeningSerializer(job, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    log_action(request.user, 'job_updated', str(job_id), 'job_opening', request.data)
    return Response(serializer.data)


# ─── Candidate Submissions ────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsApproved])
def list_submissions(request):
    """
    GET /api/jobs/submissions/
    Admin/Recruiter: all submissions with optional filters
    """
    qs = CandidateSubmission.objects.select_related(
        'job', 'candidate__user__profile', 'submitted_by__profile'
    )
    if request.user.role not in ('admin', 'team_lead', 'team_manager'):
        # Recruiters see only submissions they made
        qs = qs.filter(submitted_by=request.user)

    s = request.query_params.get('status')
    if s:
        qs = qs.filter(status=s)

    job_id = request.query_params.get('job')
    if job_id:
        qs = qs.filter(job_id=job_id)

    cand_id = request.query_params.get('candidate')
    if cand_id:
        qs = qs.filter(candidate_id=cand_id)

    search = request.query_params.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(candidate__user__profile__full_name__icontains=search) |
            Q(job__title__icontains=search) |
            Q(job__company__icontains=search)
        )

    total = qs.count()
    page = int(request.query_params.get('page', 0))
    page_size = int(request.query_params.get('page_size', 0))
    if page > 0 and page_size > 0:
        start = (page - 1) * page_size
        qs = qs[start:start + page_size]

    return Response({
        'total': total,
        'results': CandidateSubmissionSerializer(qs, many=True).data,
    })


@api_view(['POST'])
@permission_classes([IsApproved])
def create_submission(request):
    """Submit a candidate to a job opening."""
    job_id = request.data.get('job')
    candidate_id = request.data.get('candidate')

    if not job_id or not candidate_id:
        return Response({'error': 'job and candidate are required'}, status=400)

    try:
        job = JobOpening.objects.get(id=job_id)
    except JobOpening.DoesNotExist:
        return Response({'error': 'Job not found'}, status=404)

    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=404)

    sub, created = CandidateSubmission.objects.get_or_create(
        job=job, candidate=candidate,
        defaults={
            'submitted_by': request.user,
            'status': 'submitted',
            'notes': request.data.get('notes', ''),
        },
    )
    if not created:
        return Response({'error': 'This candidate is already submitted to this job'}, status=400)

    log_action(
        request.user, 'candidate_submitted', str(sub.id), 'submission',
        {'job': job.title, 'candidate': candidate.user.email},
    )
    return Response(CandidateSubmissionSerializer(sub).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsApproved])
def manage_submission(request, submission_id):
    try:
        sub = CandidateSubmission.objects.select_related(
            'job', 'candidate__user__profile'
        ).get(id=submission_id)
    except CandidateSubmission.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        if request.user.role not in ('admin', 'team_lead', 'team_manager'):
            return Response({'error': 'Admin only'}, status=403)
        log_action(request.user, 'submission_deleted', str(submission_id), 'submission', {})
        sub.delete()
        return Response({'detail': 'Deleted'})

    serializer = CandidateSubmissionSerializer(sub, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    log_action(
        request.user, 'submission_updated', str(submission_id), 'submission',
        {'status': request.data.get('status', '')},
    )
    return Response(serializer.data)


# ─── Stats for admin dashboard ────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdmin])
def jobs_stats(request):
    return Response({
        'total_jobs': JobOpening.objects.count(),
        'open_jobs': JobOpening.objects.filter(status='open').count(),
        'total_submissions': CandidateSubmission.objects.count(),
        'placed': CandidateSubmission.objects.filter(status='placed').count(),
        'interviewing': CandidateSubmission.objects.filter(status='interviewing').count(),
        'by_status': list(
            CandidateSubmission.objects.values('status').annotate(count=Count('id'))
        ),
    })
