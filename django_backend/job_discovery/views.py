import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q
from django.core.paginator import Paginator
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from users.permissions import IsAdmin, IsRecruiter, IsApproved
from candidates.models import Candidate
from recruiters.models import JobLinkEntry, DailySubmissionLog
from jobs.models import JobOpening

from .models import ScraperExecution, DiscoveredJob
from .serializers import (
    ScraperExecutionSerializer,
    DiscoveredJobListSerializer,
    DiscoveredJobDetailSerializer,
    DiscoveredJobReviewSerializer,
    ScraperRunRequestSerializer,
    ApproveForJobManagementSerializer,
)
from .services.role_provider import get_eligible_roles
from .services.scraper_engine import trigger_async_scrape

logger = logging.getLogger('job_discovery')


# ─── Scraper Execution Endpoints ──────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsApproved, IsRecruiter])
def list_eligible_roles(request):
    """
    GET /api/admin/job-scraper/roles/
    Returns eligible job roles collected from Candidate confirmed roles,
    job openings, and recruiter submissions.
    """
    limit = int(request.GET.get('limit', 50))
    roles = get_eligible_roles(limit=limit)
    return Response({'results': roles, 'count': len(roles)})


@api_view(['POST'])
@permission_classes([IsApproved, IsAdmin])
def run_scraper(request):
    """
    POST /api/admin/job-scraper/run/
    Triggers manual scraping run for specified roles and portals in the background.
    Immediately returns execution ID.
    """
    # Concurrency guard: check if another execution is actively running
    active_run = ScraperExecution.objects.filter(status='running').first()
    if active_run:
        # If it has been running for less than 15 minutes, prevent duplicate concurrent runs
        if timezone.now() - active_run.started_at < timedelta(minutes=15):
            return Response({
                'error': f'Another scraping run ({active_run.id}) is currently in progress. Please wait for it to complete.',
                'execution_id': str(active_run.id),
                'status': active_run.status,
            }, status=status.HTTP_409_CONFLICT)

    serializer = ScraperRunRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    roles_data = serializer.validated_data['roles']
    sources_data = serializer.validated_data.get('sources') or [
        'linkedin', 'indeed', 'glassdoor', 'dice'
    ]

    execution = ScraperExecution.objects.create(
        trigger_type='manual',
        triggered_by=request.user,
        status='pending',
        config={'roles': roles_data, 'sources': sources_data},
        total_roles=len(roles_data),
    )

    # Launch background thread
    trigger_async_scrape(execution.id)

    return Response({
        'message': 'Job scraping run initiated in background.',
        'execution_id': str(execution.id),
        'status': 'pending',
        'roles_count': len(roles_data),
    }, status=status.HTTP_202_ACCEPTED)


@api_view(['GET'])
@permission_classes([IsApproved, IsRecruiter])
def list_executions(request):
    """
    GET /api/admin/job-scraper/executions/
    Returns paginated history of scraping runs.
    """
    qs = ScraperExecution.objects.all().select_related('triggered_by').order_by('-started_at')

    status_filter = request.GET.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)

    page = int(request.GET.get('page', 1))
    page_size = min(int(request.GET.get('page_size', 20)), 100)

    paginator = Paginator(qs, page_size)
    page_obj = paginator.get_page(page)

    serializer = ScraperExecutionSerializer(page_obj.object_list, many=True)
    return Response({
        'count': paginator.count,
        'num_pages': paginator.num_pages,
        'current_page': page,
        'results': serializer.data,
    })


@api_view(['GET'])
@permission_classes([IsApproved, IsRecruiter])
def get_execution_detail(request, execution_id):
    """
    GET /api/admin/job-scraper/executions/<execution_id>/
    Returns real-time progress and details of a specific execution.
    """
    try:
        execution = ScraperExecution.objects.select_related('triggered_by').get(id=execution_id)
    except ScraperExecution.DoesNotExist:
        return Response({'error': 'Execution not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ScraperExecutionSerializer(execution)
    return Response(serializer.data)


# ─── Job Discovery Endpoints ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsApproved, IsRecruiter])
def job_discovery_statistics(request):
    """
    GET /api/admin/job-discovery/statistics/
    Computes summary metrics accurately derived from the database.
    """
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    base_qs = DiscoveredJob.objects.all()

    total_scraped = base_qs.count()
    scraped_today = base_qs.filter(created_at__gte=today_start).count()
    scraped_this_week = base_qs.filter(created_at__gte=week_start).count()

    pending_review = base_qs.filter(review_status='PENDING_REVIEW').count()
    approved = base_qs.filter(review_status='APPROVED').count()
    rejected = base_qs.filter(review_status='REJECTED').count()
    duplicates = base_qs.filter(Q(is_duplicate=True) | Q(review_status='ALREADY_EXISTS')).count()

    # Top roles breakdown
    top_roles = list(
        base_qs.values('target_role')
        .annotate(count=Count('id'))
        .order_by('-count')[:5]
    )

    # Portal breakdown
    sources_breakdown = list(
        base_qs.values('source_portal')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return Response({
        'total_scraped': total_scraped,
        'scraped_today': scraped_today,
        'scraped_this_week': scraped_this_week,
        'pending_review': pending_review,
        'approved': approved,
        'rejected': rejected,
        'duplicates_detected': duplicates,
        'by_role': top_roles,
        'by_source': sources_breakdown,
    })


@api_view(['GET'])
@permission_classes([IsApproved, IsRecruiter])
def list_discovered_jobs(request):
    """
    GET /api/admin/job-discovery/jobs/
    Database-side filtered, searchable, and paginated job listing.
    """
    qs = DiscoveredJob.objects.all().select_related('reviewed_by')

    # Search (title, company, description)
    search = request.GET.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(title__icontains=search) |
            Q(company_name__icontains=search) |
            Q(job_description__icontains=search)
        )

    # Filters
    role = request.GET.get('role', '').strip()
    if role and role != 'all':
        qs = qs.filter(target_role__iexact=role)

    source = request.GET.get('source', '').strip()
    if source and source != 'all':
        qs = qs.filter(source_portal__iexact=source)

    review_status_param = request.GET.get('review_status', '').strip()
    if review_status_param and review_status_param != 'all':
        qs = qs.filter(review_status=review_status_param)

    is_remote = request.GET.get('is_remote')
    if is_remote is not None and is_remote != '':
        qs = qs.filter(is_remote=is_remote.lower() == 'true')

    location = request.GET.get('location', '').strip()
    if location:
        qs = qs.filter(
            Q(city__icontains=location) |
            Q(state__icontains=location) |
            Q(state_code__iexact=location) |
            Q(location_raw__icontains=location)
        )

    is_duplicate = request.GET.get('is_duplicate')
    if is_duplicate is not None and is_duplicate != '':
        qs = qs.filter(is_duplicate=is_duplicate.lower() == 'true')

    # Date range filters
    date_from = request.GET.get('date_from')
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)

    date_to = request.GET.get('date_to')
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    # Sorting
    sort_by = request.GET.get('ordering', '-created_at')
    allowed_sorts = [
        '-created_at', 'created_at',
        '-date_posted', 'date_posted',
        'title', '-title',
        'company_name', '-company_name',
        'target_role', '-target_role'
    ]
    if sort_by in allowed_sorts:
        qs = qs.order_by(sort_by)
    else:
        qs = qs.order_by('-created_at')

    page = int(request.GET.get('page', 1))
    page_size = min(int(request.GET.get('page_size', 20)), 100)

    paginator = Paginator(qs, page_size)
    page_obj = paginator.get_page(page)

    serializer = DiscoveredJobListSerializer(page_obj.object_list, many=True)
    return Response({
        'count': paginator.count,
        'num_pages': paginator.num_pages,
        'current_page': page,
        'results': serializer.data,
    })


@api_view(['GET'])
@permission_classes([IsApproved, IsRecruiter])
def get_discovered_job_detail(request, job_id):
    """
    GET /api/admin/job-discovery/jobs/<job_id>/
    Returns full details of a discovered job.
    """
    try:
        job = DiscoveredJob.objects.select_related('canonical_job', 'reviewed_by').get(id=job_id)
    except DiscoveredJob.DoesNotExist:
        return Response({'error': 'Discovered job not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = DiscoveredJobDetailSerializer(job)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsApproved, IsRecruiter])
def review_discovered_job(request, job_id):
    """
    PATCH /api/admin/job-discovery/jobs/<job_id>/review/
    Updates review status (APPROVED, REJECTED, ALREADY_EXISTS, PENDING_REVIEW)
    and optional review notes.
    """
    try:
        job = DiscoveredJob.objects.get(id=job_id)
    except DiscoveredJob.DoesNotExist:
        return Response({'error': 'Discovered job not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = DiscoveredJobReviewSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    job.review_status = serializer.validated_data['review_status']
    if 'review_notes' in serializer.validated_data:
        job.review_notes = serializer.validated_data['review_notes']

    job.reviewed_by = request.user
    job.reviewed_at = timezone.now()
    job.save()

    return Response({
        'message': f'Job status updated to {job.review_status}',
        'job': DiscoveredJobListSerializer(job).data,
    })


@api_view(['GET'])
@permission_classes([IsApproved, IsRecruiter])
def get_job_discovery_filters(request):
    """
    GET /api/admin/job-discovery/filters/
    Returns distinct filter options available in the database.
    """
    roles = (
        DiscoveredJob.objects.order_by()
        .values_list('target_role', flat=True)
        .distinct()
        .exclude(target_role='')
    )
    sources = (
        DiscoveredJob.objects.order_by()
        .values_list('source_portal', flat=True)
        .distinct()
        .exclude(source_portal='')
    )
    locations = (
        DiscoveredJob.objects.order_by()
        .values_list('state', flat=True)
        .distinct()
        .exclude(state__isnull=True)
        .exclude(state='')
    )

    return Response({
        'roles': sorted(list(set(r for r in roles if r))),
        'sources': sorted(list(set(s for s in sources if s))),
        'locations': sorted(list(set(loc for loc in locations if loc))),
        'statuses': [
            {'value': 'PENDING_REVIEW', 'label': 'Pending Review'},
            {'value': 'APPROVED', 'label': 'Approved'},
            {'value': 'REJECTED', 'label': 'Rejected'},
            {'value': 'ALREADY_EXISTS', 'label': 'Already Exists'},
        ],
    })


# ─── Requirement D Bridge: Future Integration ────────────────────────────────

@api_view(['POST'])
@permission_classes([IsApproved, IsAdmin])
def approve_for_job_management(request, job_id):
    """
    POST /api/admin/job-discovery/jobs/<job_id>/approve-for-job-management/
    Bridges an approved DiscoveredJob into existing JobLinkEntry or JobOpening.
    Keeps systems decoupled while supporting optional promotion.
    """
    try:
        job = DiscoveredJob.objects.get(id=job_id)
    except DiscoveredJob.DoesNotExist:
        return Response({'error': 'Discovered job not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ApproveForJobManagementSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    candidate_id = serializer.validated_data.get('candidate_id')
    create_job_opening = serializer.validated_data.get('create_job_opening', False)
    notes = serializer.validated_data.get('notes', '')

    job.review_status = 'APPROVED'
    job.reviewed_by = request.user
    job.reviewed_at = timezone.now()
    if notes:
        job.review_notes = (job.review_notes or '') + f"\n[Approved for Management]: {notes}"
    job.save()

    created_entities = {}

    # Option A: Convert to JobLinkEntry for a Candidate
    if candidate_id:
        try:
            cand = Candidate.objects.get(id=candidate_id)
            log, _ = DailySubmissionLog.objects.get_or_create(
                candidate=cand,
                recruiter=request.user,
                log_date=timezone.now().date(),
                defaults={
                    'notes': 'Discovered Job Candidate Match',
                    'is_manual': False,
                    'applications_count': 0,
                    'screening_count': 0,
                    'interview_count': 0,
                    'offer_count': 0,
                }
            )
            link_entry = JobLinkEntry.objects.create(
                submission_log=log,
                candidate=cand,
                company_name=job.company_name,
                role_title=job.title,
                job_url=job.job_url,
                job_description=job.job_description,
                application_status='applied',
                employment_type=job.employment_type or 'contract',
                city=job.city,
                state=job.state,
                country=job.country,
                salary=job.salary_raw or (f"${job.salary_min}" if job.salary_min else ""),
                notes=f"Created from Discovered Job {job.id}. {notes}".strip(),
                submitted_by=request.user,
                is_public=True,
            )
            # Update application count on the log
            log.applications_count = JobLinkEntry.objects.filter(submission_log=log).count()
            log.save()
            created_entities['job_link_entry_id'] = str(link_entry.id)
        except Candidate.DoesNotExist:
            return Response({'error': 'Candidate not found'}, status=status.HTTP_404_NOT_FOUND)

    # Option B: Convert to internal JobOpening
    if create_job_opening:
        job_opening = JobOpening.objects.create(
            title=job.title,
            company=job.company_name,
            location=f"{job.city}, {job.state}" if job.city and job.state else (job.location_raw or ""),
            remote=job.is_remote,
            description=job.job_description or "",
            salary_range=job.salary_raw or "",
            employment_type='contract',
            status='open',
            posted_by=request.user,
        )
        created_entities['job_opening_id'] = str(job_opening.id)

    return Response({
        'message': 'Discovered job approved and promoted to job management.',
        'job_id': str(job.id),
        'created_entities': created_entities,
    }, status=status.HTTP_201_CREATED)
