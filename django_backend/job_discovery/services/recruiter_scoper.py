"""
Recruiter Scoper Service:
Derives personalized job visibility dynamically from the recruiter's active candidate
assignments and confirmed job roles in the Hyrind database.
Enforces strict backend data isolation so recruiters only see relevant jobs.
"""
from typing import Dict, List, Any, Optional
from django.db.models import Q, QuerySet

from users.models import User
from candidates.models import Candidate, RoleSuggestion, RoleConfirmation
from recruiters.models import RecruiterAssignment
from ..models import DiscoveredJob


def get_recruiter_assigned_scope(recruiter_user: User) -> Dict[str, Any]:
    """
    Retrieves assigned candidates and their confirmed roles for the given recruiter.
    """
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
    base_qs: Optional[QuerySet] = None
) -> QuerySet:
    """
    Returns a QuerySet of DiscoveredJob restricted strictly to the candidate roles
    assigned to the authenticated recruiter.
    """
    if base_qs is None:
        base_qs = DiscoveredJob.objects.all()

    scope = get_recruiter_assigned_scope(recruiter_user)

    if not scope['has_candidates'] or not scope['roles']:
        # Recruiter has no active assignments or no confirmed roles -> empty result set
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
            return base_qs.none()
    else:
        target_roles = scope['roles']

    if not target_roles:
        return base_qs.none()

    # Build OR query across matching roles
    role_q = Q()
    for full_role in target_roles:
        # Split combo roles (e.g. "Data Analyst, Data Engineer, Data Scientist")
        sub_roles = [r.strip() for r in full_role.split(',') if r.strip()]
        for sub in sub_roles:
            role_q |= Q(target_role__iexact=sub) | Q(title__icontains=sub)

    return base_qs.filter(role_q).distinct()


def attach_matching_candidate_context(jobs_data: List[Dict[str, Any]], scope: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Attaches which assigned candidate(s) and role match each job in the list.
    """
    candidates = scope.get('candidates', [])
    for job in jobs_data:
        target_role = (job.get('target_role') or '').lower()
        title = (job.get('title') or '').lower()

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
                matching_cands.append({
                    'id': c['id'],
                    'name': c['name'],
                    'email': c['email'],
                })

        job['matching_candidates'] = matching_cands
        job['matching_roles'] = sorted(list(matching_roles))

    return jobs_data
