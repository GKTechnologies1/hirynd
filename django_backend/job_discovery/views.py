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
