from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.db import transaction
import requests
import re
from bs4 import BeautifulSoup

from users.permissions import IsAdmin, IsApproved, IsRecruiter, IsAdminOrTeamLead
from candidates.models import Candidate
from audit.utils import log_action
from notifications.utils import send_email, get_styled_email_html, create_notification
from .models import RecruiterAssignment, DailySubmissionLog, JobLinkEntry
from .serializers import (
    RecruiterAssignmentSerializer, DailySubmissionLogSerializer, JobLinkEntrySerializer,
    RecruiterProfileSerializer, RecruiterBankDetailsSerializer,
    AdminRecruiterFullSerializer, MyAssignmentSerializer, DailyJournalSerializer,
    TeamMemberDetailSerializer,
)


@api_view(['GET'])
@permission_classes([IsApproved])
def assignments(request, candidate_id):
    from django.db.models import Count, Q
    qs = RecruiterAssignment.objects.filter(candidate_id=candidate_id).select_related(
        'recruiter__profile', 'candidate__user__profile'
    ).annotate(
        recruiter_active_count=Count('recruiter__recruiter_assignments', filter=Q(recruiter__recruiter_assignments__is_active=True))
    )
    return Response(RecruiterAssignmentSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def assign_recruiter(request):
    data = request.data.copy()
    data['assigned_by'] = request.user.id
    serializer = RecruiterAssignmentSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    
    recruiter_user = serializer.validated_data.get('recruiter')
    candidate_obj = serializer.validated_data.get('candidate')
    
    if recruiter_user and recruiter_user.approval_status == 'rejected':
        return Response({'error': 'Rejected recruiters cannot be assigned to candidates.'}, status=status.HTTP_400_BAD_REQUEST)
        
    if recruiter_user and candidate_obj:
        # Prevent duplicate active assignments
        if RecruiterAssignment.objects.filter(recruiter=recruiter_user, candidate=candidate_obj, is_active=True).exists():
            return Response({'error': 'This recruiter is already assigned to this candidate.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check client limit
        active_count = RecruiterAssignment.objects.filter(
            recruiter=recruiter_user, is_active=True
        ).count()
        
        profile = getattr(recruiter_user, 'recruiter_profile', None)
        max_clients = getattr(profile, 'max_clients', 3) if profile else 3
        if max_clients is None:
            max_clients = 3
            
        if active_count >= max_clients:
            return Response(
                {'error': f"Recruiter has reached their maximum limit of {max_clients} active clients."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
    instance = serializer.save()
    log_action(request.user, 'recruiter_assigned', str(data.get('candidate')), 'assignment', data)

    # ── Email & In-App Notifications: Recruiter Assigned ──
    try:
        candidate = instance.candidate
        recruiter = instance.recruiter
        cand_name = candidate.user.profile.full_name if hasattr(candidate.user, 'profile') else candidate.user.email
        rec_name = recruiter.profile.full_name if hasattr(recruiter, 'profile') else recruiter.email

        # 1. Send Email to Candidate
        send_email(
            to=candidate.user.email,
            subject='Your Recruiter Has Been Assigned',
            html=get_styled_email_html(
                cand_name,
                f'<p>A recruiter has been assigned to support you: <strong>{rec_name}</strong>.</p>'
                f'<p>They will log daily application activities and coordinate submission links with you.</p>',
                action_label="Go to Dashboard",
                action_url="/candidate-dashboard"
            )
        )

        # 2. Send Email to Recruiter
        send_email(
            to=recruiter.email,
            subject='Your Recruiter Has Been Assigned',
            html=get_styled_email_html(
                rec_name,
                f'<p>You have been assigned to support candidate: <strong>{cand_name}</strong> ({candidate.user.email}).</p>'
                f'<p>Please review their details and begin logging their daily applications.</p>',
                action_label="View Assignment",
                action_url="/recruiter-dashboard"
            )
        )

        # 3. In-App Notification to Candidate
        create_notification(
            candidate.user,
            'Recruiter Assigned',
            f'Recruiter {rec_name} has been assigned to your profile.',
            link='/candidate-dashboard'
        )

        # 4. In-App Notification to Recruiter
        create_notification(
            recruiter,
            'New Candidate Assigned',
            f'Candidate {cand_name} has been assigned to you.',
            link='/recruiter-dashboard'
        )
    except Exception:
        pass
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


@api_view(['GET'])
@permission_classes([IsRecruiter])
def my_assignments(request):
    """Return all active assignments for the logged-in recruiter with candidate details."""
    qs = RecruiterAssignment.objects.filter(
        recruiter=request.user, is_active=True
    ).select_related('candidate__user__profile').order_by('-assigned_at')
    return Response(MyAssignmentSerializer(qs, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsApproved])
def daily_logs(request, candidate_id):
    try:
        candidate_obj = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=404)

    is_allowed = request.user.role in ('admin', 'recruiter', 'team_lead', 'team_manager')
    
    if request.user.role == 'candidate':
        # Allow candidates to view their own logs via GET
        if str(request.user.id) == str(candidate_obj.user_id) and request.method == 'GET':
            is_allowed = True
    
    if not is_allowed:
        return Response({'error': 'Forbidden'}, status=403)

    if request.method == 'GET':
        logs = DailySubmissionLog.objects.filter(
            candidate_id=candidate_id,
            is_manual=True
        ).select_related('recruiter').order_by('-log_date', '-created_at')

        try:
            page = int(request.query_params.get('page', 0))
        except (ValueError, TypeError):
            page = 0
        try:
            page_size = int(request.query_params.get('page_size', 0))
        except (ValueError, TypeError):
            page_size = 0

        if page > 0 and page_size > 0:
            total = logs.count()
            start = (page - 1) * page_size
            sliced = logs[start:start + page_size]
            return Response({
                'total': total,
                'page': page,
                'page_size': page_size,
                'results': DailyJournalSerializer(sliced, many=True).data,
            })

        return Response(DailyJournalSerializer(logs, many=True).data)

    log = DailySubmissionLog.objects.create(
        candidate_id=candidate_id,
        recruiter=request.user,
        log_date=timezone.now().date(),
        applications_count=int(request.data.get('applications_count', 0)),
        notes=request.data.get('notes', ''),
        is_manual=True
    )
    candidate_obj.save() # Touch candidate to trigger updated_at refresh
    return Response(DailyJournalSerializer(log).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([IsApproved])
def job_applications(request, candidate_id):
    try:
        candidate_obj = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found'}, status=404)

    is_allowed = request.user.role in ('admin', 'recruiter', 'team_lead', 'team_manager')
    if request.user.role == 'candidate' and str(request.user.id) == str(candidate_obj.user_id):
        is_allowed = True
    
    if not is_allowed:
        return Response({'error': 'Forbidden'}, status=403)

    if request.method == 'GET':
        jobs = JobLinkEntry.objects.filter(
            candidate_id=candidate_id
        ).select_related('submission_log').order_by('-created_at')

        # Optional server-side pagination (backward-compatible: old clients get full list)
        try:
            page = int(request.query_params.get('page', 0))
        except (ValueError, TypeError):
            page = 0
        try:
            page_size = int(request.query_params.get('page_size', 0))
        except (ValueError, TypeError):
            page_size = 0

        if page > 0 and page_size > 0:
            total = jobs.count()
            start = (page - 1) * page_size
            sliced = jobs[start:start + page_size]
            return Response({
                'total': total,
                'page': page,
                'page_size': page_size,
                'results': JobLinkEntrySerializer(sliced, many=True).data,
            })

        return Response(JobLinkEntrySerializer(jobs, many=True).data)

    # POST: Create new job entries atomically with defensive validation & fallback logic
    try:
        with transaction.atomic():
            log = DailySubmissionLog.objects.create(
                candidate_id=candidate_id,
                recruiter=request.user,
                log_date=timezone.now().date(),
                notes="Job application submitted",
                is_manual=False
            )
            
            job_links = request.data.get('job_links', [])
            if not isinstance(job_links, list):
                return Response({'error': 'job_links must be a list'}, status=status.HTTP_400_BAD_REQUEST)

            valid_statuses = dict(JobLinkEntry.APPLICATION_STATUS_CHOICES)
            created_entries = []
            
            for jl in job_links:
                if not isinstance(jl, dict):
                    continue

                raw_url = str(jl.get('job_url', '') or '').strip()
                if raw_url and not (raw_url.startswith('http://') or raw_url.startswith('https://')):
                    raw_url = 'https://' + raw_url
                
                raw_resume = str(jl.get('resume_used', '') or '').strip()
                if raw_resume and not (raw_resume.startswith('http://') or raw_resume.startswith('https://')):
                    if '.' in raw_resume or 'drive.google.com' in raw_resume or 'docs.google.com' in raw_resume:
                        raw_resume = 'https://' + raw_resume

                raw_status = jl.get('status')
                if not raw_status or not isinstance(raw_status, str):
                    app_status = 'applied'
                else:
                    app_status = raw_status.strip().lower().replace(' ', '_')

                if app_status not in valid_statuses:
                    app_status = 'applied'

                entry = JobLinkEntry.objects.create(
                    submission_log=log,
                    candidate_id=candidate_id,
                    company_name=str(jl.get('company_name', '') or '').strip(),
                    role_title=str(jl.get('role_title', '') or '').strip(),
                    job_url=raw_url,
                    job_description=str(jl.get('job_description', '') or ''),
                    resume_used=raw_resume,
                    application_status=app_status,
                    employment_type=str(jl.get('employment_type', '') or '').strip(),
                    experience_required=str(jl.get('experience_required', '') or '').strip(),
                    work_mode=str(jl.get('work_mode', '') or '').strip(),
                    city=str(jl.get('city', '') or '').strip(),
                    state=str(jl.get('state', '') or '').strip(),
                    country=str(jl.get('country', '') or '').strip(),
                    salary=str(jl.get('salary', 'Not Disclosed') or 'Not Disclosed').strip(),
                    visa_eligibility=str(jl.get('visa_eligibility', '') or '').strip(),
                    submitted_by=request.user
                )
                created_entries.append(entry)

            log.save()
            candidate_obj.save() # Touch candidate to trigger updated_at refresh

            # Invalidate public job alerts cache when new applications are created
            try:
                from django.core.cache import cache
                cache.delete('public_job_alerts_total')
                cache.delete('job_alert_filter_options')
            except Exception:
                pass

            return Response(JobLinkEntrySerializer(created_entries, many=True).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': f"Failed to submit job applications: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST', 'PATCH', 'DELETE'])
@permission_classes([IsApproved])
def update_job_status(request, job_id):
    try:
        job = JobLinkEntry.objects.get(id=job_id)
    except JobLinkEntry.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        job.delete()
        try:
            from django.core.cache import cache
            cache.delete('public_job_alerts_total')
            cache.delete('job_alert_filter_options')
        except Exception:
            pass
        return Response({'message': 'Deleted successfully'})

    new_status = request.data.get('status') or request.data.get('application_status')
    if new_status:
        job.application_status = new_status
        job.candidate_response_status = new_status

    fields_to_update = [
        'employment_type', 'experience_required', 'work_mode',
        'city', 'state', 'country', 'salary', 'visa_eligibility',
        'company_name', 'role_title', 'notes', 'job_description', 'job_url', 'is_public'
    ]
    for field_name in fields_to_update:
        if field_name in request.data:
            setattr(job, field_name, request.data[field_name])

    job.save()
    if job.candidate:
        job.candidate.save()

    # Invalidate public job alerts cache when a job is modified
    try:
        from django.core.cache import cache
        cache.delete('public_job_alerts_total')
        cache.delete('job_alert_filter_options')
    except Exception:
        pass

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
    
    assigned_ids = RecruiterAssignment.objects.filter(
        recruiter=user, is_active=True
    ).values_list('candidate_id', flat=True)

    from candidates.models import InterviewLog

    # Sum of candidate applications
    total_apps = JobLinkEntry.objects.filter(candidate_id__in=assigned_ids).count()
    apps_week = JobLinkEntry.objects.filter(candidate_id__in=assigned_ids, created_at__date__gte=start_of_week).count()
    apps_today = JobLinkEntry.objects.filter(candidate_id__in=assigned_ids, created_at__date=today).count()

    # Sum of candidate interviews
    total_interviews = InterviewLog.objects.filter(candidate_id__in=assigned_ids).count()
    interviews_week = InterviewLog.objects.filter(candidate_id__in=assigned_ids, interview_date__gte=start_of_week).count()

    # Weekly offers
    offers_week = JobLinkEntry.objects.filter(
        candidate_id__in=assigned_ids,
        application_status='offer',
        updated_at__date__gte=start_of_week
    ).count()

    return Response({
        'apps_today': apps_today,
        'apps_week': apps_week,
        'total_apps': total_apps,
        'total_interviews': total_interviews,
        'interviews_week': interviews_week,
        'offers_week': offers_week
    })


@api_view(['GET', 'POST', 'PATCH'])
@permission_classes([IsRecruiter])
def recruiter_profile(request):
    from .models import RecruiterProfile
    profile, _ = RecruiterProfile.objects.get_or_create(user=request.user)
    
    if request.method in ('POST', 'PATCH'):
        serializer = RecruiterProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Validate that mandatory document fields are present
        updated_profile = RecruiterProfile.objects.get(id=profile.id)
        missing_docs = []
        if not updated_profile.highest_degree_certificate_id:
            missing_docs.append('highest_degree_certificate_id')
        if not updated_profile.government_id_card_id:
            missing_docs.append('government_id_card_id')
        if not updated_profile.pan_card_id:
            missing_docs.append('pan_card_id')
        if not updated_profile.bank_passbook_id:
            missing_docs.append('bank_passbook_id')
        
        if missing_docs:
            return Response(
                {'warning': 'Please upload all required documents', 'missing_documents': missing_docs},
                status=status.HTTP_202_ACCEPTED
            )
        
        log_action(request.user, 'recruiter_profile_updated', str(request.user.id), 'user', serializer.data)
        return Response(serializer.data)

    return Response(RecruiterProfileSerializer(profile).data)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAdmin])
def admin_update_profile(request, user_id):
    from .models import RecruiterProfile
    from users.models import User
    
    try:
        user_obj = User.objects.get(id=user_id)
        if user_obj.role not in ['recruiter', 'team_lead', 'team_manager']:
            return Response({'error': 'User is not a recruiter or team lead/manager'}, status=400)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    profile, _ = RecruiterProfile.objects.get_or_create(user=user_obj)
    
    if request.method == 'PATCH':
        serializer = AdminRecruiterFullSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_action(request.user, 'admin_updated_recruiter_profile', str(user_id), 'user', serializer.data)
        return Response(serializer.data)

    return Response(AdminRecruiterFullSerializer(profile).data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_get_assignments(request, user_id):
    """Admin: get all active assignments for a specific recruiter."""
    from users.models import User
    try:
        user_obj = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    qs = RecruiterAssignment.objects.filter(
        recruiter=user_obj, is_active=True
    ).select_related('candidate__user__profile').order_by('-assigned_at')
    
    return Response(MyAssignmentSerializer(qs, many=True).data)



@api_view(['GET', 'POST'])
@permission_classes([IsRecruiter])
def bank_details(request):
    from .models import RecruiterBankDetails
    bank, _ = RecruiterBankDetails.objects.get_or_create(recruiter=request.user)
    
    if request.method == 'POST':
        acc = request.data.get('account_number', '')
        rtn = request.data.get('routing_number', '') or request.data.get('ifsc_code', '')
        
        bank.bank_name = request.data.get('bank_name', bank.bank_name)
        if acc and not acc.startswith('****'):
            bank.account_number_last4 = acc[-4:]
            bank.account_number_encrypted = acc # In a real app, encrypt this properly
        if rtn and not rtn.startswith('****'):
            bank.routing_number_last4 = rtn[-4:]
            bank.routing_number_encrypted = rtn
        bank.save()
        
        log_action(request.user, 'bank_details_updated', str(request.user.id), 'recruiter_bank', {'bank_name': bank.bank_name})
        return Response(RecruiterBankDetailsSerializer(bank).data)

    return Response(RecruiterBankDetailsSerializer(bank).data)


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


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_productivity_report(request):
    """Export summary of recruiter productivity for admin dashboard."""
    from users.models import User
    from django.db.models import Count, Q
    
    # Use User model instead of RecruiterProfile to ensure we capture all recruiters
    # even if profile is missing (though it shouldn't be).
    recruiters = User.objects.filter(role='recruiter').select_related('profile')
    
    report_data = []
    for r in recruiters:
        # Total assignments (all time)
        total_assignments = r.recruiter_assignments.count()
        # Active assignments
        active_assignments = r.recruiter_assignments.filter(is_active=True).count()
        
        # Total submissions (JobLinkEntry + manual logs sum)
        from django.db.models import Sum
        manual_subs = DailySubmissionLog.objects.filter(recruiter=r, is_manual=True).aggregate(Sum('applications_count'))['applications_count__sum'] or 0
        total_submissions = JobLinkEntry.objects.filter(submitted_by=r).count() + manual_subs
        
        # Total interviews (InterviewLog records submitted by recruiter)
        from candidates.models import InterviewLog
        total_interviews = InterviewLog.objects.filter(submitted_by=r).count()
        
        # Total offers
        total_offers = JobLinkEntry.objects.filter(
            submitted_by=r, 
            application_status='offer'
        ).count()
        
        report_data.append({
            'recruiter_name': r.profile.full_name if hasattr(r, 'profile') else r.email,
            'email': r.email,
            'total_assignments': total_assignments,
            'active_assignments': active_assignments,
            'total_submissions': total_submissions,
            'total_interviews': total_interviews,
            'total_offers': total_offers,
        })
        
    return Response(report_data)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def public_job_alerts(request):
    from django.db.models import Q
    import datetime

    if request.method == 'POST':
        if not request.user or not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = JobLinkEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = serializer.save(submitted_by=request.user, is_public=True)

        # Invalidate cached totals/filter options when a new public job is posted
        try:
            from django.core.cache import cache
            cache.delete('public_job_alerts_total')
            cache.delete('job_alert_filter_options')
        except Exception:
            pass

        return Response(JobLinkEntrySerializer(job).data, status=status.HTTP_201_CREATED)

    # 1. Base queryset
    include_hidden = request.query_params.get('include_hidden', '').lower() in ('true', '1') or request.query_params.get('is_hidden', '').lower() in ('true', '1')
    if include_hidden:
        jobs = JobLinkEntry.objects.all().select_related('submission_log')
    else:
        jobs = JobLinkEntry.objects.filter(is_public=True).select_related('submission_log')

    # 2. Status filter
    status_param = request.query_params.get('status')
    if status_param and status_param != 'all':
        if status_param == 'applied':
            jobs = jobs.filter(Q(application_status='applied') | Q(application_status__isnull=True) | Q(application_status=''))
        else:
            jobs = jobs.filter(application_status=status_param)

    # 3. Global search
    search = request.query_params.get('search', '').strip()
    if search:
        jobs = jobs.filter(
            Q(role_title__icontains=search) |
            Q(company_name__icontains=search) |
            Q(job_description__icontains=search) |
            Q(city__icontains=search) |
            Q(state__icontains=search) |
            Q(country__icontains=search) |
            Q(notes__icontains=search)
        )

    # 4. Title / Role filter
    title = request.query_params.get('title') or request.query_params.get('role')
    if title:
        title_list = [t.strip() for t in title.split(',') if t.strip()]
        if title_list:
            q_title = Q()
            for t in title_list:
                q_title |= Q(role_title__icontains=t)
            jobs = jobs.filter(q_title)

    # 5. Company filter
    company = request.query_params.get('company')
    if company:
        jobs = jobs.filter(company_name__icontains=company)

    # 6. Skills filter
    skills = request.query_params.get('skills', '').strip()
    if skills:
        jobs = jobs.filter(Q(job_description__icontains=skills) | Q(notes__icontains=skills))

    # 7. Location filter (handles comma-separated multi-select values)
    location = request.query_params.get('location')
    if location:
        loc_list = [l.strip() for l in location.split(',') if l.strip()]
        if loc_list:
            q_loc = Q()
            for l in loc_list:
                q_loc |= Q(city__icontains=l) | Q(state__icontains=l) | Q(country__icontains=l)
            jobs = jobs.filter(q_loc)

    # 8. Work mode filter
    work_mode = request.query_params.get('work_mode')
    if work_mode:
        wm_list = [w.strip() for w in work_mode.split(',') if w.strip()]
        if wm_list:
            q_wm = Q()
            for w in wm_list:
                q_wm |= Q(work_mode__icontains=w)
            jobs = jobs.filter(q_wm)

    # 9. Employment type filter
    employment_type = request.query_params.get('employment_type')
    if employment_type:
        et_list = [e.strip() for e in employment_type.split(',') if e.strip()]
        if et_list:
            q_et = Q()
            for e in et_list:
                q_et |= Q(employment_type__icontains=e)
            jobs = jobs.filter(q_et)

    # 10. Experience filter
    experience_required = request.query_params.get('experience_required') or request.query_params.get('experience')
    if experience_required:
        exp_list = [x.strip() for x in experience_required.split(',') if x.strip()]
        if exp_list:
            q_exp = Q()
            for x in exp_list:
                q_exp |= Q(experience_required__icontains=x)
            jobs = jobs.filter(q_exp)

    # 11. Visa eligibility filter
    visa_eligibility = request.query_params.get('visa_eligibility') or request.query_params.get('visa')
    if visa_eligibility:
        visa_list = [v.strip() for v in visa_eligibility.split(',') if v.strip()]
        if visa_list:
            q_visa = Q()
            for v in visa_list:
                q_visa |= Q(visa_eligibility__icontains=v)
            jobs = jobs.filter(q_visa)

    # 12. Date Range filter
    from_date = request.query_params.get('from_date') or request.query_params.get('date_from')
    if from_date:
        try:
            from_dt = datetime.datetime.strptime(from_date.strip(), '%Y-%m-%d').date()
            jobs = jobs.filter(Q(created_at__date__gte=from_dt) | Q(submission_log__log_date__gte=from_dt))
        except (ValueError, TypeError):
            pass

    to_date = request.query_params.get('to_date') or request.query_params.get('date_to')
    if to_date:
        try:
            to_dt = datetime.datetime.strptime(to_date.strip(), '%Y-%m-%d').date()
            jobs = jobs.filter(Q(created_at__date__lte=to_dt) | Q(submission_log__log_date__lte=to_dt))
        except (ValueError, TypeError):
            pass

    # 13. Date timeframe filter (e.g. Posted Today, Past 3 Days, Past Week, Past Month)
    date_preset = request.query_params.get('date_preset')
    if date_preset:
        today = timezone.now().date()
        if 'today' in date_preset.lower():
            jobs = jobs.filter(Q(created_at__date=today) | Q(submission_log__log_date=today))
        elif '3' in date_preset:
            cutoff = today - datetime.timedelta(days=3)
            jobs = jobs.filter(Q(created_at__date__gte=cutoff) | Q(submission_log__log_date__gte=cutoff))
        elif 'week' in date_preset.lower() or '7' in date_preset:
            cutoff = today - datetime.timedelta(days=7)
            jobs = jobs.filter(Q(created_at__date__gte=cutoff) | Q(submission_log__log_date__gte=cutoff))
        elif 'month' in date_preset.lower() or '30' in date_preset:
            cutoff = today - datetime.timedelta(days=30)
            jobs = jobs.filter(Q(created_at__date__gte=cutoff) | Q(submission_log__log_date__gte=cutoff))

    # 14. Ordering
    ordering = request.query_params.get('ordering') or request.query_params.get('sort')
    if ordering in ('created_at', 'oldest', 'Oldest First'):
        jobs = jobs.order_by('created_at')
    else:
        jobs = jobs.order_by('-created_at')

    # 15. Pagination
    total = jobs.count()

    # Cache unfiltered_total to avoid an expensive full-table COUNT(*) on every request
    from django.core.cache import cache as django_cache
    unfiltered_total = django_cache.get('public_job_alerts_total')
    if unfiltered_total is None:
        unfiltered_total = JobLinkEntry.objects.filter(is_public=True).count()
        django_cache.set('public_job_alerts_total', unfiltered_total, 300)  # 5 min

    try:
        page = int(request.query_params.get('page', 0))
    except (ValueError, TypeError):
        page = 0

    try:
        page_size = int(request.query_params.get('page_size', 0))
    except (ValueError, TypeError):
        page_size = 0

    if page > 0 and page_size > 0:
        start = (page - 1) * page_size
        sliced_jobs = jobs[start:start + page_size]
        return Response({
            'total': total,
            'unfiltered_total': unfiltered_total,
            'results': JobLinkEntrySerializer(sliced_jobs, many=True).data,
        })

    return Response(JobLinkEntrySerializer(jobs, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_job_alert_filter_options(request):
    """
    Returns distinct filter options derived from all live jobs in the database.
    Response is cached for 5 minutes to avoid 7+ distinct queries on every page load.
    """
    from django.core.cache import cache as django_cache

    cached_result = django_cache.get('job_alert_filter_options')
    if cached_result is not None:
        return Response(cached_result)

    base_qs = JobLinkEntry.objects.filter(is_public=True)

    # Distinct Roles
    roles = list(
        base_qs.exclude(role_title__isnull=True)
        .exclude(role_title='')
        .values_list('role_title', flat=True)
        .distinct()
        .order_by('role_title')
    )

    # Distinct Structured Locations
    country_map = {}
    flat_locations_set = set()

    for entry in base_qs.values('city', 'state', 'country'):
        c = (entry.get('country') or '').strip()
        s = (entry.get('state') or '').strip()
        ci = (entry.get('city') or '').strip()

        if not c and not s and not ci:
            continue

        # Normalization / Default Country if missing
        if not c:
            if "india" in (s + ci).lower():
                c = "India"
            elif "canada" in (s + ci).lower():
                c = "Canada"
            elif "uk" in (s + ci).lower() or "kingdom" in (s + ci).lower():
                c = "United Kingdom"
            else:
                c = "United States"

        if c not in country_map:
            country_map[c] = {
                "states": {},
                "cities": set()
            }

        # Flat string representation for legacy queries
        parts = [p for p in [ci, s, c] if p]
        if parts:
            flat_locations_set.add(", ".join(parts))

        if s:
            if s not in country_map[c]["states"]:
                country_map[c]["states"][s] = set()
            if ci:
                country_map[c]["states"][s].add(ci)
                country_map[c]["cities"].add(f"{ci}, {s}")
            else:
                country_map[c]["cities"].add(f"{s} Province" if c == "Canada" and "Province" not in s else s)
        elif ci:
            country_map[c]["cities"].add(ci)

    # Convert sets to sorted lists for JSON serialization
    formatted_countries = {}
    for country, data in sorted(country_map.items()):
        formatted_states = {}
        for state, cities in sorted(data["states"].items()):
            formatted_states[state] = sorted(list(cities))
        formatted_countries[country] = {
            "states": formatted_states,
            "cities": sorted(list(data["cities"]))
        }

    locations_data = {
        "countries": formatted_countries,
        "all_countries": sorted(list(country_map.keys())),
        "flat": sorted(list(flat_locations_set))
    }

    # Distinct Employment Types
    employment_types = list(
        base_qs.exclude(employment_type__isnull=True)
        .exclude(employment_type='')
        .values_list('employment_type', flat=True)
        .distinct()
        .order_by('employment_type')
    )

    # Distinct Work Modes
    work_modes = list(
        base_qs.exclude(work_mode__isnull=True)
        .exclude(work_mode='')
        .values_list('work_mode', flat=True)
        .distinct()
        .order_by('work_mode')
    )

    # Distinct Experience Requirements
    experience_levels = list(
        base_qs.exclude(experience_required__isnull=True)
        .exclude(experience_required='')
        .values_list('experience_required', flat=True)
        .distinct()
        .order_by('experience_required')
    )

    # Distinct Visa Eligibilities
    visa_eligibilities = list(
        base_qs.exclude(visa_eligibility__isnull=True)
        .exclude(visa_eligibility='')
        .values_list('visa_eligibility', flat=True)
        .distinct()
        .order_by('visa_eligibility')
    )

    total_count = base_qs.count()

    result = {
        'roles': roles,
        'locations': locations_data,
        'employment_types': employment_types,
        'work_modes': work_modes,
        'experience_levels': experience_levels,
        'visa_eligibilities': visa_eligibilities,
        'total_count': total_count,
    }

    # Cache for 5 minutes — invalidated on job create/update/delete
    django_cache.set('job_alert_filter_options', result, 300)

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAdminOrTeamLead])
def my_team(request):
    from users.models import User
    from recruiters.models import RecruiterAssignment
    
    user = request.user
    if user.role == 'admin':
        queryset = User.objects.filter(role__in=['recruiter', 'team_lead', 'team_manager']).select_related('profile', 'recruiter_profile')
    elif user.role == 'team_manager':
        candidate_ids = RecruiterAssignment.objects.filter(
            recruiter=user, role_type='team_manager', is_active=True
        ).values_list('candidate_id', flat=True)
        assigned_user_ids = RecruiterAssignment.objects.filter(
            candidate_id__in=candidate_ids, is_active=True
        ).exclude(recruiter=user).values_list('recruiter_id', flat=True)
        queryset = User.objects.filter(
            id__in=assigned_user_ids, role__in=['recruiter', 'team_lead']
        ).select_related('profile', 'recruiter_profile')
    elif user.role == 'team_lead':
        candidate_ids = RecruiterAssignment.objects.filter(
            recruiter=user, role_type='team_lead', is_active=True
        ).values_list('candidate_id', flat=True)
        assigned_user_ids = RecruiterAssignment.objects.filter(
            candidate_id__in=candidate_ids, is_active=True
        ).exclude(recruiter=user).values_list('recruiter_id', flat=True)
        queryset = User.objects.filter(
            id__in=assigned_user_ids, role='recruiter'
        ).select_related('profile', 'recruiter_profile')
    else:
        return Response({'error': 'Permission denied'}, status=403)
        
    queryset = queryset.order_by('profile__full_name', 'email').distinct()
    serializer = TeamMemberDetailSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAdminOrTeamLead])
def my_team_detail(request, user_id):
    from users.models import User
    from recruiters.models import RecruiterAssignment
    from django.shortcuts import get_object_or_404
    
    target_user = get_object_or_404(User, id=user_id)
    user = request.user
    
    is_in_team = False
    if user.role == 'admin':
        is_in_team = target_user.role in ['recruiter', 'team_lead', 'team_manager']
    elif user.role == 'team_manager':
        candidate_ids = RecruiterAssignment.objects.filter(
            recruiter=user, role_type='team_manager', is_active=True
        ).values_list('candidate_id', flat=True)
        is_in_team = RecruiterAssignment.objects.filter(
            candidate_id__in=candidate_ids, recruiter=target_user, is_active=True
        ).exists() and target_user.role in ['recruiter', 'team_lead']
    elif user.role == 'team_lead':
        candidate_ids = RecruiterAssignment.objects.filter(
            recruiter=user, role_type='team_lead', is_active=True
        ).values_list('candidate_id', flat=True)
        is_in_team = RecruiterAssignment.objects.filter(
            candidate_id__in=candidate_ids, recruiter=target_user, is_active=True
        ).exists() and target_user.role == 'recruiter'
        
    if not is_in_team:
        return Response({'error': 'Permission denied or user not in your team'}, status=403)
        
    if request.method == 'PATCH':
        serializer = TeamMemberDetailSerializer(target_user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_action(user, 'team_member_profile_updated', str(target_user.id), 'user', serializer.data)
        return Response(serializer.data)
        
    serializer = TeamMemberDetailSerializer(target_user)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdminOrTeamLead])
def my_team_assignments(request, user_id):
    from users.models import User
    from recruiters.models import RecruiterAssignment
    from django.shortcuts import get_object_or_404
    
    target_user = get_object_or_404(User, id=user_id)
    user = request.user
    
    is_in_team = False
    candidate_ids = []
    if user.role == 'admin':
        is_in_team = target_user.role in ['recruiter', 'team_lead', 'team_manager']
    elif user.role == 'team_manager':
        candidate_ids = RecruiterAssignment.objects.filter(
            recruiter=user, role_type='team_manager', is_active=True
        ).values_list('candidate_id', flat=True)
        is_in_team = RecruiterAssignment.objects.filter(
            candidate_id__in=candidate_ids, recruiter=target_user, is_active=True
        ).exists() and target_user.role in ['recruiter', 'team_lead']
    elif user.role == 'team_lead':
        candidate_ids = RecruiterAssignment.objects.filter(
            recruiter=user, role_type='team_lead', is_active=True
        ).values_list('candidate_id', flat=True)
        is_in_team = RecruiterAssignment.objects.filter(
            candidate_id__in=candidate_ids, recruiter=target_user, is_active=True
        ).exists() and target_user.role == 'recruiter'
        
    if not is_in_team:
        return Response({'error': 'Permission denied or user not in your team'}, status=403)
        
    if user.role == 'admin':
        qs = RecruiterAssignment.objects.filter(recruiter=target_user, is_active=True)
    else:
        qs = RecruiterAssignment.objects.filter(
            recruiter=target_user,
            candidate_id__in=candidate_ids,
            is_active=True
        )
    qs = qs.select_related('candidate__user__profile').order_by('-assigned_at')
    
    return Response(MyAssignmentSerializer(qs, many=True).data)

