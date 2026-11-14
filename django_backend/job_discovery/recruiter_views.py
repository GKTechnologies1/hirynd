import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q
from django.core.paginator import Paginator
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from users.permissions import IsApproved, IsRecruiter
from .models import DiscoveredJob
from .serializers import DiscoveredJobListSerializer, DiscoveredJobDetailSerializer
from .services.recruiter_scoper import (
    get_recruiter_assigned_scope,
    build_recruiter_jobs_queryset,
    attach_matching_candidate_context,
)

logger = logging.getLogger('job_discovery')


@api_view(['GET'])
@permission_classes([IsApproved])
def list_recruiter_jobs(request):
    """
    GET /api/recruiter/job-discovery/jobs/
    Returns ONLY job listings relevant to candidates assigned to the logged-in recruiter.
    Attaches matched candidate badge data to each returned job record.
    """
    if request.user.role not in ('recruiter', 'team_lead', 'team_manager', 'admin', 'candidate'):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    candidate_id = request.GET.get('candidate_id')
    role_filter = request.GET.get('role')

    # Candidates can only access their own profile jobs
    if request.user.role == 'candidate':
        from candidates.models import Candidate
        try:
            cand = Candidate.objects.get(user=request.user)
            candidate_id = str(cand.id)
        except Candidate.DoesNotExist:
            return Response({'error': 'Candidate profile not found'}, status=status.HTTP_404_NOT_FOUND)

    scope = get_recruiter_assigned_scope(request.user, target_candidate_id=candidate_id)

    # Recruiter has no active assignments or no confirmed candidate roles
    if not scope['has_candidates'] or not scope['roles']:
        return Response({
            'count': 0,
            'num_pages': 1,
            'current_page': 1,
            'results': [],
            'has_candidates': scope['has_candidates'],
            'assigned_candidates': scope['candidates'],
            'message': 'No active candidates with confirmed roles are currently assigned to you.'
        })

    app_status = request.GET.get('status', 'all').strip().upper()
    disc_filter = request.GET.get('discovery_status', '').strip().upper()
    if not disc_filter:
        if app_status == 'DISMISSED':
            disc_filter = 'DISMISSED'
            app_status = 'ALL'
        else:
            disc_filter = 'ACTIVE'

    # Build scoped queryset restricted strictly to recruiter's candidate roles
    qs = build_recruiter_jobs_queryset(
        recruiter_user=request.user,
        candidate_id=candidate_id,
        role_filter=role_filter,
        disc_filter=disc_filter
    )

    # Search keyword filter (title, company, normalized company, role, description, location)
    search = request.GET.get('search', '').strip()
    if search:
        search_terms = search.split()
        search_q = Q()
        for term in search_terms:
            search_q &= (
                Q(title__icontains=term) |
                Q(company_name__icontains=term) |
                Q(company_name_norm__icontains=term) |
                Q(target_role__icontains=term) |
                Q(job_description__icontains=term) |
                Q(city__icontains=term) |
                Q(state__icontains=term) |
                Q(country__icontains=term)
            )
        qs = qs.filter(search_q)

    # Portal source filter
    source = request.GET.get('source', '').strip()
    if source and source != 'all':
        qs = qs.filter(source_portal__iexact=source)

    # Visa Grade filter (supports comma-separated 'A,B' or single 'A')
    visa_grade = request.GET.get('visa_grade', '').strip()
    if visa_grade and visa_grade != 'all':
        grades = [g.strip().upper() for g in visa_grade.split(',') if g.strip()]
        if len(grades) == 1:
            qs = qs.filter(visa_grade__iexact=grades[0])
        elif len(grades) > 1:
            qs = qs.filter(visa_grade__in=grades)

    # Visa score range filters
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

    # H1B only filter
    h1b_only = request.GET.get('h1b_only')
    if h1b_only is not None and h1b_only != '':
        if h1b_only.lower() == 'true':
            qs = qs.filter(Q(h1b_sponsor=True) | Q(h1b_approvals__gt=0))

    # Remote filter
    is_remote = request.GET.get('is_remote')
    if is_remote is not None and is_remote != '':
        qs = qs.filter(is_remote=is_remote.lower() == 'true')

    # Location filter
    location = request.GET.get('location', '').strip()
    if location:
        qs = qs.filter(
            Q(city__icontains=location) |
            Q(state__icontains=location) |
            Q(state_code__iexact=location) |
            Q(location_raw__icontains=location)
        )

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
    serialized_jobs = serializer.data

    # Dynamically attach candidate context
    enriched_jobs = attach_matching_candidate_context(serialized_jobs, scope)

    # Expand into individual records per matched candidate
    expanded_records = []
    for job in enriched_jobs:
        matching_cands = job.get('matching_candidates') or []
        if matching_cands:
            for mc in matching_cands:
                item = dict(job)
                item['opportunity_id'] = f"{job['id']}_{mc['id']}"
                item['candidate'] = mc
                item['candidate_id'] = mc['id']
                item['status'] = mc.get('status') or 'NOT_APPLIED'
                item['discovery_status'] = mc.get('discovery_status') or 'ACTIVE'
                item['is_dismissed'] = mc.get('is_dismissed', False)
                item['dismissal_reason'] = mc.get('dismissal_reason')
                item['dismissal_comments'] = mc.get('dismissal_comments')
                item['dismissed_date'] = mc.get('dismissed_date')
                item['dismissed_by'] = mc.get('dismissed_by')
                item['rejection_reason'] = mc.get('rejection_reason')
                item['has_applied'] = (item['status'] == 'APPLIED')
                expanded_records.append(item)
        else:
            item = dict(job)
            item['opportunity_id'] = str(job['id'])
            item['candidate'] = None
            item['candidate_id'] = None
            item['status'] = 'NOT_APPLIED'
            item['discovery_status'] = 'ACTIVE'
            item['is_dismissed'] = False
            item['dismissal_reason'] = None
            item['dismissal_comments'] = None
            item['dismissed_date'] = None
            item['dismissed_by'] = None
            item['rejection_reason'] = None
            item['has_applied'] = False
            expanded_records.append(item)

    if disc_filter == 'ACTIVE':
        expanded_records = [r for r in expanded_records if not r.get('is_dismissed') and r.get('status') != 'REJECTED']
    elif disc_filter in ('DISMISSED', 'REJECTED'):
        expanded_records = [r for r in expanded_records if r.get('is_dismissed') or r.get('status') == 'REJECTED' or r.get('discovery_status') in ('DISMISSED', 'REJECTED')]

    if app_status and app_status != 'ALL':
        expanded_records = [r for r in expanded_records if r['status'] == app_status]

    return Response({
        'count': len(expanded_records) if app_status != 'ALL' or len(expanded_records) != len(enriched_jobs) else paginator.count,
        'num_pages': paginator.num_pages,
        'current_page': page,
        'results': expanded_records,
        'assigned_candidates': scope['candidates'],
        'recruiter_roles': scope['roles'],
    })


@api_view(['GET'])
@permission_classes([IsApproved, IsRecruiter])
def get_recruiter_job_detail(request, job_id):
    """
    GET /api/recruiter/job-discovery/jobs/<job_id>/
    Returns full details of a discovered job if it matches the recruiter's candidate scope.
    """
    try:
        job = DiscoveredJob.objects.select_related('canonical_job', 'reviewed_by').get(id=job_id)
    except DiscoveredJob.DoesNotExist:
        return Response({'error': 'Discovered job not found'}, status=status.HTTP_404_NOT_FOUND)

    scope = get_recruiter_assigned_scope(request.user)

    # Enforce recruiter scope boundary (Admins bypass isolation)
    if request.user.role != 'admin':
        target_role = (job.target_role or '').lower()
        title = (job.title or '').lower()
        matched = False
        for cand in scope['candidates']:
            for r in cand.get('roles', []):
                sub_parts = [p.strip().lower() for p in r.split(',') if p.strip()]
                for p in sub_parts:
                    if p in target_role or p in title:
                        matched = True
                        break
                if matched:
                    break
            if matched:
                break

        if not matched:
            return Response({
                'error': 'This job is outside your assigned candidate scope.'
            }, status=status.HTTP_403_FORBIDDEN)

    serializer = DiscoveredJobDetailSerializer(job)
    job_dict = serializer.data

    # Attach candidate matching context
    attach_matching_candidate_context([job_dict], scope)

    return Response(job_dict)


@api_view(['GET'])
@permission_classes([IsApproved, IsRecruiter])
def recruiter_job_discovery_statistics(request):
    """
    GET /api/recruiter/job-discovery/statistics/
    Computes summary metrics specific to the logged-in recruiter's candidate scope.
    """
    scope = get_recruiter_assigned_scope(request.user)

    if not scope['has_candidates'] or not scope['roles']:
        return Response({
            'total_matching_jobs': 0,
            'matching_today': 0,
            'matching_week': 0,
            'assigned_candidates_count': 0,
            'by_candidate': [],
            'by_role': [],
            'by_grade': [],
        })

    qs = build_recruiter_jobs_queryset(request.user)

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    total_matching = qs.count()
    matching_today = qs.filter(created_at__gte=today_start).count()
    matching_week = qs.filter(created_at__gte=week_start).count()

    # Per-candidate job count breakdown
    by_candidate = []
    for cand in scope['candidates']:
        cand_qs = build_recruiter_jobs_queryset(request.user, candidate_id=cand['id'])
        by_candidate.append({
            'id': cand['id'],
            'name': cand['name'],
            'email': cand['email'],
            'roles': cand['roles'],
            'matching_jobs_count': cand_qs.count(),
        })

    # Roles breakdown
    by_role = list(
        qs.values('target_role')
        .annotate(count=Count('id'))
        .order_by('-count')[:5]
    )

    # Visa Grade breakdown
    by_grade = list(
        qs.values('visa_grade')
        .annotate(count=Count('id'))
        .order_by('visa_grade')
    )

    return Response({
        'total_matching_jobs': total_matching,
        'matching_today': matching_today,
        'matching_week': matching_week,
        'assigned_candidates_count': len(scope['candidates']),
        'by_candidate': by_candidate,
        'by_role': by_role,
        'by_grade': by_grade,
    })


@api_view(['GET'])
@permission_classes([IsApproved, IsRecruiter])
def get_recruiter_job_discovery_filters(request):
    """
    GET /api/recruiter/job-discovery/filters/
    Returns filter choices populated directly from recruiter's actual candidate data.
    """
    scope = get_recruiter_assigned_scope(request.user)
    qs = build_recruiter_jobs_queryset(request.user)

    sources = sorted(list(set(qs.values_list('source_portal', flat=True).distinct().exclude(source_portal=''))))
    locations = sorted(list(set(loc for loc in qs.values_list('state', flat=True).distinct() if loc)))

    return Response({
        'candidates': scope['candidates'],
        'roles': scope['roles'],
        'sources': sources,
        'locations': locations,
        'visa_grades': ['A', 'B', 'C', 'D', 'E', 'F'],
    })


@api_view(['POST'])
@permission_classes([IsApproved])
def mark_job_as_applied(request, job_id):
    """
    POST /api/recruiter/job-discovery/jobs/<job_id>/mark-applied/
    Marks a discovered job as applied for an assigned candidate, creating
    or updating a JobLinkEntry in the Candidate Applications tracking system.
    """
    candidate_id = request.data.get('candidate_id')
    notes = request.data.get('notes', '').strip()

    if not candidate_id:
        return Response({'error': 'candidate_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    from candidates.models import Candidate
    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=status.HTTP_404_NOT_FOUND)

    # Validate candidate assignment (Admins, Team Leads, Team Managers bypass isolation)
    if request.user.role not in ('admin', 'team_lead', 'team_manager'):
        if request.user.role == 'candidate':
            if str(candidate.user_id) != str(request.user.id):
                return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        else:
            from recruiters.models import RecruiterAssignment
            is_assigned = RecruiterAssignment.objects.filter(
                recruiter=request.user,
                candidate_id=candidate_id,
                is_active=True
            ).exists()
            if not is_assigned:
                return Response(
                    {'error': 'You are not assigned to manage this candidate.'},
                    status=status.HTTP_403_FORBIDDEN
                )

    try:
        job = DiscoveredJob.objects.get(id=job_id)
    except DiscoveredJob.DoesNotExist:
        return Response({'error': 'Discovered job not found'}, status=status.HTTP_404_NOT_FOUND)

    from recruiters.models import JobLinkEntry, DailySubmissionLog

    # Check for existing matching application for this candidate
    existing = None
    if job.job_url:
        existing = JobLinkEntry.objects.filter(
            candidate=candidate,
            job_url=job.job_url
        ).first()

    if not existing:
        existing = JobLinkEntry.objects.filter(
            candidate=candidate,
            company_name__iexact=job.company_name,
            role_title__icontains=job.target_role
        ).first()

    if existing:
        return Response({
            'status': 'already_applied',
            'message': f'This job is already applied for {candidate.user.email} (Status: {existing.application_status}).',
            'application_id': str(existing.id),
            'application_status': existing.application_status,
            'applied_date': existing.created_at.date().isoformat() if existing.created_at else None,
        })

    # Associate with or create today's DailySubmissionLog
    today = timezone.now().date()
    log = DailySubmissionLog.objects.filter(
        candidate=candidate,
        recruiter=request.user,
        log_date=today
    ).order_by('-created_at').first()

    if not log:
        log = DailySubmissionLog.objects.create(
            candidate=candidate,
            recruiter=request.user,
            log_date=today,
            notes='Job Discovery Application',
            is_manual=False,
            applications_count=0,
            screening_count=0,
            interview_count=0,
            offer_count=0,
        )

    sal_val = job.salary_raw or ""
    if not sal_val and job.salary_min:
        period_str = f" / {job.salary_period.title()}" if job.salary_period else ""
        if job.salary_max and job.salary_max != job.salary_min:
            sal_val = f"${int(job.salary_min):,} – ${int(job.salary_max):,}{period_str}"
        else:
            sal_val = f"${int(job.salary_min):,}{period_str}"

    work_mode_val = 'Remote' if job.is_remote else ('Hybrid' if job.is_hybrid else 'Onsite')
    exp_val = job.experience_level or 'Not Specified'

    entry = JobLinkEntry.objects.create(
        submission_log=log,
        candidate=candidate,
        company_name=job.company_name,
        role_title=job.title,
        job_url=job.job_url or '',
        job_description=job.job_description or '',
        application_status='applied',
        employment_type=job.employment_type or 'Full-Time',
        experience_required=exp_val,
        work_mode=work_mode_val,
        city=job.city or '',
        state=job.state or '',
        country=job.country or 'USA',
        salary=sal_val,
        visa_eligibility=f"Grade {job.visa_grade}" if job.visa_grade else "",
        notes=f"Applied from Job Discovery. {notes}".strip(),
        submitted_by=request.user,
        is_public=True,
    )

    # Track candidate-job opportunity state
    from .models import CandidateJobOpportunity
    CandidateJobOpportunity.objects.update_or_create(
        candidate=candidate,
        job=job,
        defaults={
            'status': 'APPLIED',
            'recruiter': request.user,
            'job_link_entry': entry,
            'applied_at': timezone.now(),
        }
    )

    # Update daily log counts
    log.applications_count = JobLinkEntry.objects.filter(submission_log=log).count()
    log.save(update_fields=['applications_count'])

    return Response({
        'status': 'success',
        'message': f'Successfully marked as Applied for {candidate.user.email}.',
        'application_id': str(entry.id),
        'application_status': 'applied',
        'applied_date': entry.created_at.date().isoformat() if entry.created_at else today.isoformat(),
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsApproved])
def reject_job(request, job_id):
    """
    POST /api/recruiter/job-discovery/jobs/<job_id>/reject/
    Marks a discovered job opportunity as REJECTED for a specific candidate with a mandatory reason.
    Rejecting for Candidate A does NOT affect Candidate B for the same shared job.
    """
    candidate_id = request.data.get('candidate_id')
    reason = request.data.get('reason', '').strip()

    if not candidate_id:
        return Response({'error': 'candidate_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not reason:
        return Response({'error': 'A rejection reason is mandatory'}, status=status.HTTP_400_BAD_REQUEST)

    from candidates.models import Candidate
    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=status.HTTP_404_NOT_FOUND)

    # Validate assignment (Admins, Team Leads, Team Managers bypass isolation)
    if request.user.role not in ('admin', 'team_lead', 'team_manager'):
        if request.user.role == 'candidate':
            if str(candidate.user_id) != str(request.user.id):
                return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        else:
            from recruiters.models import RecruiterAssignment
            is_assigned = RecruiterAssignment.objects.filter(
                recruiter=request.user,
                candidate_id=candidate_id,
                is_active=True
            ).exists()
            if not is_assigned:
                return Response(
                    {'error': 'You are not assigned to manage this candidate.'},
                    status=status.HTTP_403_FORBIDDEN
                )

    try:
        job = DiscoveredJob.objects.get(id=job_id)
    except DiscoveredJob.DoesNotExist:
        return Response({'error': 'Discovered job not found'}, status=status.HTTP_404_NOT_FOUND)

    from .models import CandidateJobOpportunity
    opp, _ = CandidateJobOpportunity.objects.update_or_create(
        candidate=candidate,
        job=job,
        defaults={
            'status': 'REJECTED',
            'rejection_reason': reason,
            'recruiter': request.user,
            'rejected_at': timezone.now(),
        }
    )

    return Response({
        'status': 'success',
        'message': f'Job successfully marked as Rejected for {candidate.user.email}.',
        'opportunity_id': str(opp.id),
        'candidate_id': str(candidate.id),
        'job_id': str(job.id),
        'opportunity_status': 'REJECTED',
        'rejection_reason': reason,
    })


@api_view(['POST'])
@permission_classes([IsApproved, IsRecruiter])
def dismiss_job(request, job_id):
    """
    POST /api/recruiter/job-discovery/jobs/<job_id>/dismiss/
    Dismisses a recommendation for a specific candidate.
    Requires candidate_id and a valid dismissal reason.
    If reason is 'Other', comments are mandatory.
    Cannot dismiss if the job has already been applied for by this candidate.
    Candidate A's dismissal never impacts Candidate B.
    """
    candidate_id = request.data.get('candidate_id')
    reason = (request.data.get('reason') or '').strip()
    comments = (request.data.get('comments') or '').strip()

    if not candidate_id:
        return Response({'error': 'candidate_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not reason:
        return Response({'error': 'Dismissal reason is required'}, status=status.HTTP_400_BAD_REQUEST)
    if reason.lower() == 'other' and not comments:
        return Response({'error': 'Please provide an explanation when selecting "Other" as the reason.'}, status=status.HTTP_400_BAD_REQUEST)

    # Permission check for recruiter assignment
    if request.user.role != 'admin':
        from recruiters.models import RecruiterAssignment
        is_assigned = RecruiterAssignment.objects.filter(
            recruiter=request.user,
            candidate_id=candidate_id,
            is_active=True
        ).exists()
        if not is_assigned:
            return Response({'error': 'You are not assigned to manage this candidate.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        job = DiscoveredJob.objects.get(id=job_id)
    except DiscoveredJob.DoesNotExist:
        return Response({'error': 'Discovered job not found'}, status=status.HTTP_404_NOT_FOUND)

    from candidates.models import Candidate
    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=status.HTTP_404_NOT_FOUND)

    from .models import CandidateJobOpportunity
    opp = CandidateJobOpportunity.objects.filter(candidate=candidate, job=job).first()
    if opp and opp.status == 'APPLIED':
        return Response({'error': 'This job has already been applied for and cannot be dismissed.'}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.now()
    if not opp:
        opp = CandidateJobOpportunity.objects.create(
            candidate=candidate,
            job=job,
            recruiter=request.user,
            status='NOT_APPLIED',
            discovery_status='DISMISSED',
            dismissal_reason=reason,
            dismissal_comments=comments,
            dismissed_by=request.user,
            dismissed_at=now,
            previous_discovery_status='ACTIVE'
        )
    else:
        opp.previous_discovery_status = opp.discovery_status
        opp.discovery_status = 'DISMISSED'
        opp.dismissal_reason = reason
        opp.dismissal_comments = comments
        opp.dismissed_by = request.user
        opp.dismissed_at = now
        opp.recruiter = request.user
        opp.save()

    return Response({
        'status': 'success',
        'message': f'Job recommendation successfully dismissed for {candidate.user.email}.',
        'opportunity_id': f"{job.id}_{candidate.id}",
        'candidate_id': str(candidate.id),
        'job_id': str(job.id),
        'discovery_status': 'DISMISSED',
        'dismissal_reason': reason,
        'dismissal_comments': comments,
        'dismissed_at': now.isoformat(),
        'dismissed_by': request.user.email,
    })


@api_view(['POST'])
@permission_classes([IsApproved, IsRecruiter])
def restore_job(request, job_id):
    """
    POST /api/recruiter/job-discovery/jobs/<job_id>/restore/
    Restores a dismissed job recommendation back to ACTIVE status for a candidate.
    """
    candidate_id = request.data.get('candidate_id')
    if not candidate_id:
        return Response({'error': 'candidate_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    if request.user.role != 'admin':
        from recruiters.models import RecruiterAssignment
        is_assigned = RecruiterAssignment.objects.filter(
            recruiter=request.user,
            candidate_id=candidate_id,
            is_active=True
        ).exists()
        if not is_assigned:
            return Response({'error': 'You are not assigned to manage this candidate.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        job = DiscoveredJob.objects.get(id=job_id)
    except DiscoveredJob.DoesNotExist:
        return Response({'error': 'Discovered job not found'}, status=status.HTTP_404_NOT_FOUND)

    from candidates.models import Candidate
    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=status.HTTP_404_NOT_FOUND)

    from .models import CandidateJobOpportunity
    opp = CandidateJobOpportunity.objects.filter(candidate=candidate, job=job).first()
    if not opp or (opp.discovery_status != 'DISMISSED' and opp.status != 'REJECTED'):
        return Response({'message': 'Job recommendation is already active.', 'discovery_status': 'ACTIVE'})

    opp.previous_discovery_status = opp.discovery_status
    opp.discovery_status = 'ACTIVE'
    opp.dismissal_reason = None
    opp.dismissal_comments = None
    opp.dismissed_by = None
    opp.dismissed_at = None
    if opp.status == 'REJECTED':
        opp.status = 'NOT_APPLIED'
        opp.rejection_reason = None
        opp.rejected_at = None
    opp.save()

    return Response({
        'status': 'success',
        'message': f'Job recommendation restored to active recommendations for {candidate.user.email}.',
        'opportunity_id': f"{job.id}_{candidate.id}",
        'candidate_id': str(candidate.id),
        'job_id': str(job.id),
        'discovery_status': 'ACTIVE',
    })



