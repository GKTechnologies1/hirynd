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

from .models import ScraperExecution, DiscoveredJob, CompanyVisaHistory, CompanyAlias
from .serializers import (
    ScraperExecutionSerializer,
    DiscoveredJobListSerializer,
    DiscoveredJobDetailSerializer,
    DiscoveredJobReviewSerializer,
    ScraperRunRequestSerializer,
    ApproveForJobManagementSerializer,
    CompanyVisaHistorySerializer,
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
    companies_data = serializer.validated_data.get('companies') or []
    mode = serializer.validated_data.get('mode', 'VISA_FILTERED' if companies_data else 'STANDARD')
    minimum_score = serializer.validated_data.get('minimum_score', 0)

    execution = ScraperExecution.objects.create(
        trigger_type='manual',
        triggered_by=request.user,
        status='pending',
        config={
            'mode': mode,
            'roles': roles_data,
            'sources': sources_data,
            'companies': companies_data,
            'minimum_score': minimum_score,
        },
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


# ─── Visa Intelligence & Company Endpoints ────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsApproved, IsRecruiter])
def list_visa_companies(request):
    """
    GET /api/admin/job-scraper/companies/
    Lists/searches companies in CompanyVisaHistory.
    """
    qs = CompanyVisaHistory.objects.all()

    search = request.GET.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(company_name__icontains=search) |
            Q(company_name_norm__icontains=search)
        )

    grade = request.GET.get('grade', '').strip()
    if grade and grade != 'all':
        qs = qs.filter(visa_grade__iexact=grade)

    min_score = request.GET.get('min_score')
    if min_score:
        try:
            qs = qs.filter(visa_friendly_score__gte=int(min_score))
        except ValueError:
            pass

    min_filings = request.GET.get('min_filings')
    if min_filings:
        try:
            qs = qs.filter(h1b_total_filings__gte=int(min_filings))
        except ValueError:
            pass

    ordering = request.GET.get('ordering', '-h1b_total_filings')
    allowed_orderings = [
        '-h1b_total_filings', 'h1b_total_filings',
        '-visa_friendly_score', 'visa_friendly_score',
        'company_name', '-company_name',
        '-h1b_approvals', 'h1b_approvals'
    ]
    if ordering in allowed_orderings:
        qs = qs.order_by(ordering)
    else:
        qs = qs.order_by('-h1b_total_filings')

    page = int(request.GET.get('page', 1))
    page_size = min(int(request.GET.get('page_size', 20)), 100)

    paginator = Paginator(qs, page_size)
    page_obj = paginator.get_page(page)

    serializer = CompanyVisaHistorySerializer(page_obj.object_list, many=True)
    return Response({
        'count': paginator.count,
        'num_pages': paginator.num_pages,
        'current_page': page,
        'results': serializer.data,
    })


@api_view(['GET'])
@permission_classes([IsApproved, IsRecruiter])
def get_company_visa_detail(request, company_id):
    """
    GET /api/admin/job-scraper/companies/<company_id>/visa-details/
    Returns full visa intelligence for a specific company with factor breakdown.
    """
    try:
        company = CompanyVisaHistory.objects.get(id=company_id)
    except CompanyVisaHistory.DoesNotExist:
        return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = CompanyVisaHistorySerializer(company)
    data = serializer.data

    from .visa.scoring import compute_visa_score
    score_res = compute_visa_score(
        h1b_filings=company.h1b_total_filings,
        approvals=company.h1b_approvals,
        denials=company.h1b_denials,
        perm_filings=company.perm_total_filings,
        everify=bool(company.everify_enrolled),
        year=company.h1b_last_filing_year or 0
    )
    data['score_factors'] = score_res.get('factors', {})
    return Response(data)


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

    # Visa Grade breakdown
    grade_breakdown = list(
        base_qs.values('visa_grade')
        .annotate(count=Count('id'))
        .order_by('visa_grade')
    )
    visa_sponsored_count = base_qs.filter(Q(h1b_sponsor=True) | Q(h1b_approvals__gt=0)).count()

    return Response({
        'total_scraped': total_scraped,
        'scraped_today': scraped_today,
        'scraped_this_week': scraped_this_week,
        'pending_review': pending_review,
        'approved': approved,
        'rejected': rejected,
        'duplicates_detected': duplicates,
        'visa_sponsored_count': visa_sponsored_count,
        'by_role': top_roles,
        'by_source': sources_breakdown,
        'by_grade': grade_breakdown,
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

    company = request.GET.get('company', '').strip()
    if company:
        qs = qs.filter(
            Q(company_name__icontains=company) |
            Q(company_name_norm__icontains=company)
        )

    visa_grade = request.GET.get('visa_grade', '').strip()
    if visa_grade and visa_grade != 'all':
        grades = [g.strip().upper() for g in visa_grade.split(',') if g.strip()]
        if len(grades) == 1:
            qs = qs.filter(visa_grade__iexact=grades[0])
        elif len(grades) > 1:
            qs = qs.filter(visa_grade__in=grades)

    min_score = request.GET.get('min_score')
    if min_score is not None and min_score != '':
        try:
            qs = qs.filter(visa_friendly_score__gte=int(min_score))
        except ValueError:
            pass

    max_score = request.GET.get('max_score')
    if max_score is not None and max_score != '':
        try:
            qs = qs.filter(visa_friendly_score__lte=int(max_score))
        except ValueError:
            pass

    h1b_only = request.GET.get('h1b_only')
    if h1b_only is not None and h1b_only != '':
        if h1b_only.lower() == 'true':
            qs = qs.filter(Q(h1b_sponsor=True) | Q(h1b_approvals__gt=0))

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
        'target_role', '-target_role',
        '-visa_friendly_score', 'visa_friendly_score',
        '-h1b_approvals', 'h1b_approvals',
        '-h1b_filings_recent', 'h1b_filings_recent'
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

    companies = (
        DiscoveredJob.objects.order_by()
        .values_list('company_name', flat=True)
        .distinct()
        .exclude(company_name__isnull=True)
        .exclude(company_name='')[:40]
    )

    return Response({
        'roles': sorted(list(set(r for r in roles if r))),
        'sources': sorted(list(set(s for s in sources if s))),
        'locations': sorted(list(set(loc for loc in locations if loc))),
        'companies': sorted(list(set(c for c in companies if c))),
        'visa_grades': ['A', 'B', 'C', 'D', 'E', 'F'],
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


# ==============================================================================
# SCRAPING SESSION REPORTING, DRILL-DOWN & RECRUITER DISTRIBUTION (ADMIN)
# ==============================================================================

@api_view(['GET'])
@permission_classes([IsAdmin])
def get_execution_session_report(request, execution_id):
    """
    GET /api/admin/job-scraper/executions/<execution_id>/report/
    Returns comprehensive execution audit summary with exact counts for requested,
    collected, unique, duplicate, failed, scored, and below-threshold jobs.
    """
    try:
        ex = ScraperExecution.objects.select_related('triggered_by').get(id=execution_id)
    except ScraperExecution.DoesNotExist:
        return Response({'error': 'Scraper execution not found'}, status=status.HTTP_404_NOT_FOUND)

    config = ex.config or {}
    roles_cfg = config.get('roles', [])
    total_requested = sum(r.get('limit', 15) if isinstance(r, dict) else 15 for r in roles_cfg)
    min_score = int(config.get('minimum_score', 0) or 0)

    jobs_qs = ex.jobs.all()
    total_collected = ex.total_jobs_found
    total_unique = ex.total_inserted
    total_duplicates = ex.total_duplicates
    total_scored = jobs_qs.filter(visa_friendly_score__gt=0).count()
    total_below_threshold = jobs_qs.filter(visa_friendly_score__lt=min_score).count() if min_score > 0 else 0
    total_failed = max(0, total_requested - total_collected) if ex.status == 'completed' else 0

    started_by_str = 'System Scheduler' if ex.trigger_type == 'scheduled' else 'Anonymous'
    if ex.triggered_by:
        name = getattr(getattr(ex.triggered_by, 'profile', None), 'full_name', '')
        started_by_str = f"{name} ({ex.triggered_by.email})" if name else ex.triggered_by.email

    duration_sec = int((ex.completed_at - ex.started_at).total_seconds()) if ex.completed_at and ex.started_at else 0

    return Response({
        'session_id': str(ex.id),
        'trigger_type': ex.trigger_type.title(),
        'execution_mode': config.get('mode', 'STANDARD'),
        'status': ex.status.title(),
        'started_by': started_by_str,
        'started_at': ex.started_at.isoformat() if ex.started_at else None,
        'completed_at': ex.completed_at.isoformat() if ex.completed_at else None,
        'duration_seconds': duration_sec,
        'minimum_score': min_score,
        'total_roles_requested': ex.total_roles,
        'total_jobs_requested': total_requested,
        'total_jobs_collected': total_collected,
        'total_unique_jobs': total_unique,
        'total_duplicates': total_duplicates,
        'total_failed_jobs': total_failed,
        'total_scored_jobs': total_scored,
        'total_below_threshold': total_below_threshold,
        'total_cost_usd': float(ex.total_cost_usd or 0.0),
        'api_calls_count': ex.api_calls_count,
        'error_message': ex.error_message,
        'sources': config.get('sources', []),
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def get_execution_roles_breakdown(request, execution_id):
    """
    GET /api/admin/job-scraper/executions/<execution_id>/roles/
    Returns per-role audit table: Role | Requested | Collected | Unique | Duplicates | Scored | Assigned.
    """
    try:
        ex = ScraperExecution.objects.get(id=execution_id)
    except ScraperExecution.DoesNotExist:
        return Response({'error': 'Scraper execution not found'}, status=status.HTTP_404_NOT_FOUND)

    config = ex.config or {}
    roles_cfg = config.get('roles', [])
    jobs_qs = ex.jobs.all()

    breakdown = []
    for r in roles_cfg:
        r_name = r.get('role', '') if isinstance(r, dict) else str(r)
        limit = r.get('limit', 15) if isinstance(r, dict) else 15
        if not r_name:
            continue

        role_jobs = jobs_qs.filter(Q(target_role__iexact=r_name) | Q(title__icontains=r_name))
        collected = role_jobs.count()
        unique = role_jobs.filter(is_duplicate=False).count()
        duplicates = role_jobs.filter(is_duplicate=True).count()
        scored = role_jobs.filter(visa_friendly_score__gt=0).count()

        from .models import RecruiterJobAssignment
        assigned = RecruiterJobAssignment.objects.filter(job__in=role_jobs).values('job_id').distinct().count()

        breakdown.append({
            'role': r_name,
            'requested': limit,
            'collected': collected,
            'unique': unique,
            'duplicates': duplicates,
            'scored': scored,
            'assigned': assigned,
            'remaining': max(0, unique - assigned),
        })

    return Response(breakdown)


@api_view(['GET'])
@permission_classes([IsAdmin])
def get_execution_distribution(request, execution_id):
    """
    GET /api/admin/job-scraper/executions/<execution_id>/distribution/
    Returns recruiters who received jobs from this session and list of active recruiters for assignment.
    """
    from .models import RecruiterJobAssignment
    from users.models import User

    assignments = RecruiterJobAssignment.objects.filter(
        execution_id=execution_id
    ).select_related('recruiter', 'job')

    recruiter_map = {}
    for a in assignments:
        r_id = str(a.recruiter_id)
        if r_id not in recruiter_map:
            name = None
            try:
                name = a.recruiter.profile.full_name
            except Exception:
                pass
            recruiter_map[r_id] = {
                'recruiter_id': r_id,
                'name': name or a.recruiter.email.split('@')[0].title(),
                'email': a.recruiter.email,
                'assigned_jobs_count': 0,
                'roles': set(),
            }
        recruiter_map[r_id]['assigned_jobs_count'] += 1
        if a.job.target_role:
            recruiter_map[r_id]['roles'].add(a.job.target_role)

    distribution_list = []
    for r in recruiter_map.values():
        r['roles'] = sorted(list(r['roles']))
        distribution_list.append(r)

    # All active recruiters available for assignment
    all_recruiters = []
    recruiter_users = User.objects.filter(role__in=['recruiter', 'team_lead'], is_active=True).select_related('profile')
    for u in recruiter_users:
        name = getattr(getattr(u, 'profile', None), 'full_name', '')
        all_recruiters.append({
            'id': str(u.id),
            'name': name or u.email.split('@')[0].title(),
            'email': u.email,
            'role': u.role,
        })

    return Response({
        'distributed_recruiters': distribution_list,
        'available_recruiters': all_recruiters,
    })


@api_view(['POST'])
@permission_classes([IsAdmin])
def assign_execution_jobs(request, execution_id):
    """
    POST /api/admin/job-scraper/executions/<execution_id>/assign/
    Distributes selected roles or jobs from a session to one or more recruiters.
    Preserves global scraped job identity without duplicating records.
    """
    try:
        ex = ScraperExecution.objects.get(id=execution_id)
    except ScraperExecution.DoesNotExist:
        return Response({'error': 'Scraper execution not found'}, status=status.HTTP_404_NOT_FOUND)

    recruiter_ids = request.data.get('recruiter_ids', [])
    role_names = request.data.get('role_names', [])
    job_ids = request.data.get('job_ids', [])
    notes = request.data.get('notes', '').strip()

    if not recruiter_ids:
        return Response({'error': 'At least one recruiter must be selected.'}, status=status.HTTP_400_BAD_REQUEST)

    from users.models import User
    from .models import RecruiterJobAssignment

    recruiters = list(User.objects.filter(id__in=recruiter_ids))
    if not recruiters:
        return Response({'error': 'No valid recruiters found.'}, status=status.HTTP_400_BAD_REQUEST)

    target_jobs = ex.jobs.filter(is_duplicate=False)
    if job_ids:
        target_jobs = target_jobs.filter(id__in=job_ids)
    elif role_names and 'all' not in role_names:
        target_jobs = target_jobs.filter(target_role__in=role_names)

    created_count = 0
    for recruiter in recruiters:
        for job in target_jobs:
            _, created = RecruiterJobAssignment.objects.get_or_create(
                job=job,
                recruiter=recruiter,
                defaults={
                    'assigned_by': request.user,
                    'execution': ex,
                    'notes': notes,
                }
            )
            if created:
                created_count += 1

    return Response({
        'status': 'success',
        'message': f"Assigned {target_jobs.count()} jobs across {len(recruiters)} recruiter(s). {created_count} new assignments created.",
        'assigned_jobs_count': target_jobs.count(),
        'recruiters_count': len(recruiters),
        'new_assignments': created_count,
    }, status=status.HTTP_201_CREATED)


# ==============================================================================
# SCRAPING COST ANALYTICS – STRICTLY ADMIN ONLY
# ==============================================================================

@api_view(['GET'])
@permission_classes([IsAdmin])
def get_scraping_cost_reports(request):
    """
    GET /api/admin/job-scraper/cost-reports/
    Returns audited financial and usage analytics for scraping runs.
    Filters: date_from, date_to, portal, role, initiated_by.
    """
    from .models import ScraperCostRecord
    from django.db.models import Sum, Count

    qs = ScraperCostRecord.objects.select_related('execution', 'initiated_by', 'initiated_by__profile')

    date_from = request.GET.get('date_from')
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)

    date_to = request.GET.get('date_to')
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    portal = request.GET.get('portal')
    if portal and portal != 'all':
        qs = qs.filter(source_portal__iexact=portal)

    role = request.GET.get('role')
    if role and role != 'all':
        qs = qs.filter(role_name__icontains=role)

    initiated_by = request.GET.get('initiated_by')
    if initiated_by and initiated_by != 'all':
        qs = qs.filter(initiated_by_id=initiated_by)

    # Aggregates
    total_spend = qs.aggregate(Sum('cost_usd'))['cost_usd__sum'] or 0.0
    total_calls = qs.aggregate(Sum('api_calls'))['api_calls__sum'] or 0
    total_jobs = qs.aggregate(Sum('items_count'))['items_count__sum'] or 0

    # Group by portal
    by_portal_raw = qs.values('source_portal').annotate(
        cost=Sum('cost_usd'),
        calls=Sum('api_calls'),
        items=Sum('items_count')
    ).order_by('-cost')

    by_portal = [{
        'portal': p['source_portal'].upper(),
        'cost_usd': round(float(p['cost'] or 0.0), 4),
        'api_calls': p['calls'],
        'items_collected': p['items']
    } for p in by_portal_raw]

    # Group by role
    by_role_raw = qs.values('role_name').annotate(
        cost=Sum('cost_usd'),
        calls=Sum('api_calls'),
        items=Sum('items_count')
    ).order_by('-cost')[:10]

    by_role = [{
        'role': r['role_name'],
        'cost_usd': round(float(r['cost'] or 0.0), 4),
        'api_calls': r['calls'],
        'items_collected': r['items']
    } for r in by_role_raw]

    # Group by initiating profile
    by_profile_raw = qs.values(
        'initiated_by__id', 'initiated_by__email'
    ).annotate(
        cost=Sum('cost_usd'),
        calls=Sum('api_calls'),
        runs=Count('execution_id', distinct=True)
    ).order_by('-cost')

    by_profile = [{
        'user_id': str(u['initiated_by__id']) if u['initiated_by__id'] else None,
        'email': u['initiated_by__email'] or 'System Scheduler',
        'cost_usd': round(float(u['cost'] or 0.0), 4),
        'api_calls': u['calls'],
        'sessions_count': u['runs']
    } for u in by_profile_raw]

    from .serializers import ScraperCostRecordSerializer
    recent_records = ScraperCostRecordSerializer(qs.order_by('-created_at')[:25], many=True).data

    return Response({
        'total_spend_usd': round(float(total_spend), 4),
        'total_api_calls': total_calls,
        'total_jobs_scraped': total_jobs,
        'by_portal': by_portal,
        'by_role': by_role,
        'by_profile': by_profile,
        'recent_records': recent_records,
    })


# ==============================================================================
# EMPLOYER INTELLIGENCE & DISCOVERY DASHBOARD (ADMIN)
# ==============================================================================

@api_view(['GET'])
@permission_classes([IsAdmin])
def list_employers(request):
    """
    GET /api/admin/employers/
    Returns paginated list of employers from central intelligence database.
    Filters: search, industry, location, min_filings, has_placements, verification_status.
    """
    from .models import CompanyVisaHistory
    from .serializers import CompanyVisaHistorySerializer

    qs = CompanyVisaHistory.objects.all().prefetch_related('placements')

    search = request.GET.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(company_name__icontains=search) |
            Q(company_name_norm__icontains=search) |
            Q(industry__icontains=search) |
            Q(headquarters__icontains=search)
        )

    industry = request.GET.get('industry', '').strip()
    if industry and industry != 'all':
        qs = qs.filter(industry__iexact=industry)

    location = request.GET.get('location', '').strip()
    if location:
        qs = qs.filter(headquarters__icontains=location)

    has_placements = request.GET.get('has_placements')
    if has_placements is not None and has_placements.lower() == 'true':
        qs = qs.filter(placement_count__gt=0)

    has_h1b = request.GET.get('has_h1b')
    if has_h1b is not None and has_h1b.lower() == 'true':
        qs = qs.filter(h1b_total_filings__gt=0)

    has_lca = request.GET.get('has_lca')
    if has_lca is not None and has_lca.lower() == 'true':
        qs = qs.filter(perm_total_filings__gt=0)

    grade = request.GET.get('grade')
    if grade and grade != 'all':
        qs = qs.filter(visa_grade__iexact=grade)

    status_filter = request.GET.get('verification_status')
    if status_filter and status_filter != 'all':
        qs = qs.filter(verification_status__iexact=status_filter)

    # Sorting
    sort_by = request.GET.get('ordering', '-placement_count')
    allowed_sorts = [
        '-placement_count', 'placement_count',
        '-h1b_total_filings', 'h1b_total_filings',
        '-visa_friendly_score', 'visa_friendly_score',
        'company_name', '-company_name',
        '-updated_at', 'updated_at'
    ]
    if sort_by in allowed_sorts:
        qs = qs.order_by(sort_by)
    else:
        qs = qs.order_by('-placement_count', '-h1b_total_filings')

    page = int(request.GET.get('page', 1))
    page_size = min(int(request.GET.get('page_size', 20)), 100)

    paginator = Paginator(qs, page_size)
    page_obj = paginator.get_page(page)

    serializer = CompanyVisaHistorySerializer(page_obj.object_list, many=True)
    return Response({
        'count': paginator.count,
        'num_pages': paginator.num_pages,
        'current_page': page,
        'results': serializer.data,
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def employer_discovery_statistics(request):
    """
    GET /api/admin/employers/statistics/
    Overview metrics for employer intelligence dashboard.
    """
    from .models import CompanyVisaHistory, EmployerPlacement

    total = CompanyVisaHistory.objects.count()
    with_h1b = CompanyVisaHistory.objects.filter(h1b_total_filings__gt=0).count()
    with_lca = CompanyVisaHistory.objects.filter(perm_total_filings__gt=0).count()
    with_placements = CompanyVisaHistory.objects.filter(placement_count__gt=0).count()
    total_placements = EmployerPlacement.objects.count()
    verified = CompanyVisaHistory.objects.filter(verification_status='VERIFIED').count()
    unverified = CompanyVisaHistory.objects.filter(verification_status='UNVERIFIED').count()

    latest_refresh = CompanyVisaHistory.objects.order_by('-updated_at').values_list('updated_at', flat=True).first()

    return Response({
        'total_employers': total,
        'employers_with_h1b': with_h1b,
        'employers_with_lca': with_lca,
        'employers_with_placements': with_placements,
        'total_hyrind_placements': total_placements,
        'verified_employers': verified,
        'unverified_employers': unverified,
        'last_visa_refresh_date': latest_refresh.isoformat() if latest_refresh else None,
    })


@api_view(['GET', 'PATCH'])
@permission_classes([IsAdmin])
def get_or_update_employer_detail(request, company_id):
    """
    GET /api/admin/employers/<company_id>/
    PATCH /api/admin/employers/<company_id>/
    Returns or updates full employer intelligence profile, contacts, and verification info.
    """
    from .models import CompanyVisaHistory
    from .serializers import CompanyVisaHistorySerializer

    try:
        company = CompanyVisaHistory.objects.prefetch_related('placements').get(id=company_id)
    except CompanyVisaHistory.DoesNotExist:
        return Response({'error': 'Employer not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        data = request.data
        if 'website' in data:
            company.website = data['website']
        if 'industry' in data:
            company.industry = data['industry']
        if 'headquarters' in data:
            company.headquarters = data['headquarters']
        if 'contact_name' in data:
            company.contact_name = data['contact_name']
        if 'contact_email' in data:
            company.contact_email = data['contact_email']
        if 'contact_phone' in data:
            company.contact_phone = data['contact_phone']
        if 'verification_status' in data:
            company.verification_status = data['verification_status']
        if 'notes' in data:
            company.notes = data['notes']
        company.save()

    serializer = CompanyVisaHistorySerializer(company)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_employer(request):
    """
    POST /api/admin/employers/
    Creates a new employer record in the intelligence database.
    """
    from .models import CompanyVisaHistory
    from .serializers import CompanyVisaHistorySerializer

    company_name = request.data.get('company_name', '').strip()
    if not company_name:
        return Response({'error': 'company_name is required'}, status=status.HTTP_400_BAD_REQUEST)

    company_norm = company_name.lower().strip()
    existing = CompanyVisaHistory.objects.filter(company_name_norm=company_norm).first()
    if existing:
        return Response({
            'error': f"Employer '{company_name}' already exists.",
            'existing_id': existing.id
        }, status=status.HTTP_409_CONFLICT)

    company = CompanyVisaHistory.objects.create(
        company_name=company_name,
        company_name_norm=company_norm,
        website=request.data.get('website', ''),
        industry=request.data.get('industry', ''),
        headquarters=request.data.get('headquarters', ''),
        contact_name=request.data.get('contact_name', ''),
        contact_email=request.data.get('contact_email', ''),
        contact_phone=request.data.get('contact_phone', ''),
        verification_status=request.data.get('verification_status', 'VERIFIED'),
        data_sources=['MANUAL_ENTRY'],
        notes=request.data.get('notes', ''),
    )

    return Response(CompanyVisaHistorySerializer(company).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def manage_employer_placements(request, company_id):
    """
    GET /api/admin/employers/<company_id>/placements/
    POST /api/admin/employers/<company_id>/placements/
    Lists or adds verified placement / offer records for an employer.
    """
    from .models import CompanyVisaHistory, EmployerPlacement
    from .serializers import EmployerPlacementSerializer

    try:
        company = CompanyVisaHistory.objects.get(id=company_id)
    except CompanyVisaHistory.DoesNotExist:
        return Response({'error': 'Employer not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'POST':
        data = request.data
        role_title = data.get('role_title', '').strip()
        if not role_title:
            return Response({'error': 'role_title is required'}, status=status.HTTP_400_BAD_REQUEST)

        placement = EmployerPlacement.objects.create(
            company=company,
            candidate_name=data.get('candidate_name', 'Placed Candidate'),
            role_title=role_title,
            offer_salary=data.get('offer_salary'),
            currency=data.get('currency', 'USD'),
            start_date=data.get('start_date') or None,
            hr_contact=data.get('hr_contact', ''),
            verification_status=data.get('verification_status', 'VERIFIED'),
            offer_letter_url=data.get('offer_letter_url', ''),
            notes=data.get('notes', ''),
        )
        company.placement_count = company.placements.count()
        sources = list(company.data_sources or [])
        if 'HYRIND_PLACEMENT' not in sources:
            sources.append('HYRIND_PLACEMENT')
        company.data_sources = sources
        company.save(update_fields=['placement_count', 'data_sources'])

        return Response(EmployerPlacementSerializer(placement).data, status=status.HTTP_201_CREATED)

    placements = company.placements.all()
    return Response(EmployerPlacementSerializer(placements, many=True).data)

