"""
Recruiter Scoper Service:
Derives personalized job visibility dynamically from the recruiter's active candidate
assignments and confirmed job roles in the Hyrind database.
Enforces strict backend data isolation, candidate-specific deduplication (excluding jobs
a candidate has already applied for), and tracks per-candidate application status.
"""
from typing import Dict, List, Any, Optional
from django.db.models import Q, QuerySet

from users.models import User
from candidates.models import Candidate, RoleSuggestion, RoleConfirmation
from recruiters.models import RecruiterAssignment, JobLinkEntry
from ..models import DiscoveredJob, RecruiterJobAssignment


def get_recruiter_assigned_scope(recruiter_user: User, target_candidate_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Retrieves assigned candidates and their confirmed roles for the given recruiter.
    Supports target_candidate_id for direct candidate queries by admin, recruiter, or candidate.
    """
    from candidates.models import Candidate

    assignments = RecruiterAssignment.objects.filter(
        recruiter=recruiter_user,
        is_active=True
    ).select_related('candidate', 'candidate__user')

    candidates_map = {}
    candidate_ids = []

    for a in assignments:
        cand = a.candidate
        if not cand or not cand.user:
            continue
        c_id = str(cand.id)
        candidate_ids.append(cand.id)
        cand_name = None
        try:
            if hasattr(cand.user, 'profile') and cand.user.profile and cand.user.profile.full_name:
                cand_name = cand.user.profile.full_name.strip()
        except Exception:
            pass
        if not cand_name:
            cand_name = cand.user.email.split('@')[0].replace('.', ' ').title()

        candidates_map[c_id] = {
            'id': c_id,
            'name': cand_name,
            'email': cand.user.email,
            'status': cand.status,
            'roles': [],
        }

    # If target_candidate_id provided, ensure candidate is in map (e.g. for Admin or direct candidate view)
    if target_candidate_id and target_candidate_id != 'all':
        tc_id = str(target_candidate_id)
        if tc_id not in candidates_map:
            try:
                cand = Candidate.objects.select_related('user').get(id=target_candidate_id)
                if cand.user:
                    candidate_ids.append(cand.id)
                    cand_name = None
                    try:
                        if hasattr(cand.user, 'profile') and cand.user.profile and cand.user.profile.full_name:
                            cand_name = cand.user.profile.full_name.strip()
                    except Exception:
                        pass
                    if not cand_name:
                        cand_name = cand.user.email.split('@')[0].replace('.', ' ').title()
                    candidates_map[tc_id] = {
                        'id': tc_id,
                        'name': cand_name,
                        'email': cand.user.email,
                        'status': cand.status,
                        'roles': [],
                    }
            except Exception:
                pass

    # If logged-in user is a candidate, include self
    if not candidate_ids and getattr(recruiter_user, 'role', None) == 'candidate':
        try:
            cand = Candidate.objects.select_related('user').get(user=recruiter_user)
            c_id = str(cand.id)
            candidate_ids.append(cand.id)
            candidates_map[c_id] = {
                'id': c_id,
                'name': recruiter_user.email.split('@')[0].replace('.', ' ').title(),
                'email': recruiter_user.email,
                'status': cand.status,
                'roles': [],
            }
        except Exception:
            pass

    if not candidate_ids:
        return {
            'has_candidates': False,
            'candidates': [],
            'roles': [],
            'candidate_roles_map': {},
        }

    # 1. Fetch confirmed roles from RoleSuggestion
    suggestions = RoleSuggestion.objects.filter(
        candidate_id__in=candidate_ids,
        candidate_confirmed=True
    ).values('candidate_id', 'role_title')

    for s in suggestions:
        c_id = str(s['candidate_id'])
        r_title = (s['role_title'] or '').strip()
        if r_title and c_id in candidates_map:
            if r_title not in candidates_map[c_id]['roles']:
                candidates_map[c_id]['roles'].append(r_title)

    # 2. Fetch accepted roles from RoleConfirmation
    confirmations = RoleConfirmation.objects.filter(
        candidate_id__in=candidate_ids,
        response='accepted'
    ).select_related('suggestion').values('candidate_id', 'suggestion__role_title', 'custom_role_title')

    for c in confirmations:
        c_id = str(c['candidate_id'])
        r_title = (c['custom_role_title'] or c['suggestion__role_title'] or '').strip()
        if r_title and c_id in candidates_map:
            if r_title not in candidates_map[c_id]['roles']:
                candidates_map[c_id]['roles'].append(r_title)

    # Collect distinct roles across all assigned candidates
    distinct_roles = set()
    for c_info in candidates_map.values():
        for r in c_info['roles']:
            distinct_roles.add(r)

    return {
        'has_candidates': True,
        'candidates': list(candidates_map.values()),
        'roles': sorted(list(distinct_roles)),
        'candidate_roles_map': candidates_map,
    }


def build_recruiter_jobs_queryset(
    recruiter_user: User,
    candidate_id: Optional[str] = None,
    role_filter: Optional[str] = None,
    base_qs: Optional[QuerySet] = None,
    disc_filter: Optional[str] = None
) -> QuerySet:
    """
    Returns a QuerySet of DiscoveredJob restricted strictly to the candidate roles
    assigned to the authenticated recruiter, combined with any explicitly distributed jobs.
    If a specific candidate_id is selected, excludes jobs that candidate has ALREADY applied for.
    """
    if base_qs is None:
        base_qs = DiscoveredJob.objects.all()

    scope = get_recruiter_assigned_scope(recruiter_user, target_candidate_id=candidate_id)

    # Fetch any jobs explicitly assigned to this recruiter by admin
    assigned_job_ids = list(
        RecruiterJobAssignment.objects.filter(recruiter=recruiter_user).values_list('job_id', flat=True)
    )

    if not scope['has_candidates'] and not assigned_job_ids:
        return base_qs.none()

    target_roles = []
    if candidate_id and candidate_id != 'all':
        cand_info = scope['candidate_roles_map'].get(str(candidate_id))
        if cand_info:
            target_roles = cand_info['roles']
        else:
            return base_qs.none()
    elif role_filter and role_filter != 'all':
        if role_filter in scope['roles']:
            target_roles = [role_filter]
        else:
            target_roles = []
    else:
        target_roles = scope['roles']

    # Build OR query across matching candidate roles + assigned jobs
    final_q = Q()
    if target_roles:
        role_q = Q()
        for full_role in target_roles:
            sub_roles = [r.strip() for r in full_role.split(',') if r.strip()]
            for sub in sub_roles:
                role_q |= Q(target_role__iexact=sub) | Q(title__icontains=sub)
        final_q |= role_q

    if assigned_job_ids and (not candidate_id or candidate_id == 'all'):
        final_q |= Q(id__in=assigned_job_ids)

    if not final_q:
        return base_qs.none()

    qs = base_qs.filter(final_q).distinct()

    # CANDIDATE-SPECIFIC SCOPING & STATUS HANDLING:
    if candidate_id and candidate_id != 'all':
        from ..models import CandidateJobOpportunity

        if disc_filter in ('DISMISSED', 'REJECTED'):
            # Only include jobs that are dismissed or rejected for this candidate!
            opp_job_ids = list(
                CandidateJobOpportunity.objects.filter(
                    candidate_id=candidate_id
                ).filter(
                    Q(discovery_status__in=['DISMISSED', 'REJECTED']) | Q(status='REJECTED')
                ).values_list('job_id', flat=True)
            )

            # Match DiscoveredJobs from rejected JobLinkEntry records
            rejected_entries = list(
                JobLinkEntry.objects.filter(
                    candidate_id=candidate_id,
                    application_status__iexact='rejected'
                ).values('company_name', 'role_title', 'job_url')
            )
            rej_urls = [e['job_url'].strip() for e in rejected_entries if e.get('job_url') and len(e['job_url'].strip()) > 10]
            
            rej_q = Q(id__in=opp_job_ids)
            if rej_urls:
                rej_q |= Q(job_url__in=rej_urls)
            for entry in rejected_entries:
                comp = (entry.get('company_name') or '').strip()
                role = (entry.get('role_title') or '').strip()
                if comp and role:
                    rej_q |= (
                        (Q(company_name__iexact=comp) | Q(company_name_norm__iexact=comp.lower())) &
                        (Q(title__icontains=role) | Q(target_role__iexact=role))
                    )
            return base_qs.filter(rej_q).distinct()

        else:
            # Active view: exclude jobs that this candidate already applied for or rejected
            applied_entries = JobLinkEntry.objects.filter(
                candidate_id=candidate_id
            ).values('company_name', 'role_title', 'job_url')

            applied_urls = [e['job_url'].strip() for e in applied_entries if e.get('job_url') and len(e['job_url'].strip()) > 10]
            if applied_urls:
                qs = qs.exclude(job_url__in=applied_urls)

            for entry in applied_entries:
                comp = (entry.get('company_name') or '').strip()
                role = (entry.get('role_title') or '').strip()
                if comp and role:
                    qs = qs.exclude(
                        (Q(company_name__iexact=comp) | Q(company_name_norm__iexact=comp.lower())) &
                        (Q(title__icontains=role) | Q(target_role__iexact=role))
                    )

            # Also exclude jobs marked dismissed or rejected in CandidateJobOpportunity
            opp_excluded_ids = list(
                CandidateJobOpportunity.objects.filter(
                    candidate_id=candidate_id
                ).filter(
                    Q(discovery_status__in=['DISMISSED', 'REJECTED']) | Q(status='REJECTED')
                ).values_list('job_id', flat=True)
            )
            if opp_excluded_ids:
                qs = qs.exclude(id__in=opp_excluded_ids)

    return qs


def attach_matching_candidate_context(jobs_data: List[Dict[str, Any]], scope: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Attaches which assigned candidate(s) and role match each job in the list,
    along with their current application status (whether candidate already applied).
    """
    candidates = scope.get('candidates', [])
    if not candidates:
        return jobs_data

    candidate_ids = [c['id'] for c in candidates]

    # Pre-fetch candidate applications in bulk to avoid N+1 queries
    existing_applications = list(
        JobLinkEntry.objects.filter(candidate_id__in=candidate_ids)
        .values('candidate_id', 'company_name', 'role_title', 'job_url', 'application_status', 'created_at')
    )

    from ..models import CandidateJobOpportunity
    job_ids = [j['id'] for j in jobs_data if 'id' in j]
    opps = list(
        CandidateJobOpportunity.objects.filter(
            candidate_id__in=candidate_ids,
            job_id__in=job_ids
        ).values(
            'candidate_id', 'job_id', 'status', 'discovery_status',
            'dismissal_reason', 'dismissal_comments', 'dismissed_at', 'dismissed_by__email', 'applied_at'
        )
    )
    opp_map = {
        (str(o['candidate_id']), str(o['job_id'])): o for o in opps
    }

    for job in jobs_data:
        target_role = (job.get('target_role') or '').lower()
        title = (job.get('title') or '').lower()
        company = (job.get('company_name') or '').lower()
        job_url = (job.get('job_url') or '').strip()
        job_id_str = str(job.get('id', ''))

        matching_cands = []
        matching_roles = set()

        for c in candidates:
            c_matches = False
            for r in c.get('roles', []):
                r_lower = r.lower()
                sub_parts = [p.strip() for p in r_lower.split(',') if p.strip()]
                for p in sub_parts:
                    if p in target_role or p in title:
                        c_matches = True
                        matching_roles.add(r)
                        break
                if c_matches:
                    break

            if c_matches:
                c_id_str = str(c['id'])
                # Check CandidateJobOpportunity first
                opp = opp_map.get((c_id_str, job_id_str))
                c_status = 'NOT_APPLIED'
                c_disc_status = 'ACTIVE'
                rejection_reason = None
                dismissal_reason = None
                dismissal_comments = None
                dismissed_date = None
                dismissed_by = None
                applied_date = None

                if opp:
                    c_status = opp['status']
                    c_disc_status = opp.get('discovery_status') or 'ACTIVE'
                    rejection_reason = opp.get('rejection_reason')
                    dismissal_reason = opp.get('dismissal_reason')
                    dismissal_comments = opp.get('dismissal_comments')
                    dismissed_date = opp['dismissed_at'].isoformat() if opp.get('dismissed_at') else None
                    dismissed_by = opp.get('dismissed_by__email')
                    applied_date = opp['applied_at'].date().isoformat() if opp.get('applied_at') else None
                else:
                    def _norm_url(u):
                        if not u:
                            return ''
                        u = u.strip().lower()
                        for p in ('https://', 'http://'):
                            if u.startswith(p):
                                u = u[len(p):]
                                break
                        if u.startswith('www.'):
                            u = u[4:]
                        return u.rstrip('/')

                    job_url_norm = _norm_url(job_url)

                    # Fallback check from existing JobLinkEntry records
                    for app in existing_applications:
                        if str(app['candidate_id']) == c_id_str:
                            app_url = (app.get('job_url') or '').strip()
                            app_comp = (app.get('company_name') or '').lower().strip()
                            app_role = (app.get('role_title') or '').lower().strip()
                            app_status = (app.get('application_status') or '').lower()

                            # Match by normalized URL or (company + role overlap)
                            url_match = bool(app_url and job_url_norm and _norm_url(app_url) == job_url_norm)
                            comp_match = bool(app_comp and (app_comp in company or company in app_comp) and (app_role in title or app_role in target_role or title in app_role or target_role in app_role))

                            if url_match or comp_match:
                                if app_status == 'rejected':
                                    c_status = 'REJECTED'
                                else:
                                    c_status = 'APPLIED'
                                applied_date = app['created_at'].date().isoformat() if app.get('created_at') else None
                                break

                has_applied = (c_status == 'APPLIED')

                matching_cands.append({
                    'id': c['id'],
                    'name': c['name'],
                    'email': c['email'],
                    'status': c_status,
                    'discovery_status': c_disc_status,
                    'is_dismissed': (c_disc_status == 'DISMISSED' or c_status == 'REJECTED'),
                    'dismissal_reason': dismissal_reason or rejection_reason,
                    'dismissal_comments': dismissal_comments,
                    'dismissed_date': dismissed_date,
                    'dismissed_by': dismissed_by,
                    'has_applied': has_applied,
                    'application_status': c_status.lower(),
                    'rejection_reason': rejection_reason or dismissal_reason,
                    'applied_date': applied_date,
                })

        job['matching_candidates'] = matching_cands
        job['matching_roles'] = sorted(list(matching_roles))
        job['has_applied_any'] = any(c['has_applied'] for c in matching_cands)
        job['all_applied'] = len(matching_cands) > 0 and all(c['has_applied'] for c in matching_cands)

    return jobs_data
