import re
import unicodedata
from typing import List
from candidates.models import RoleSuggestion, RoleConfirmation
from jobs.models import JobOpening
from recruiters.models import JobLinkEntry


def normalize_role_title(title: str) -> str:
    """Normalize role string for deduplication."""
    if not title:
        return ""
    normalized = unicodedata.normalize('NFKC', str(title))
    normalized = re.sub(r'[_]+$', '', normalized)  # Clean trailing underscores
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    return normalized


def get_eligible_roles(limit: int = 50) -> List[dict]:
    """
    Retrieves distinct active job roles from Candidate Role Suggestions/Confirmations,
    internal Job Openings, and recruiter Job Link Entries.
    Returns list of dicts: [{'role': 'Software Engineer', 'source': 'candidate_confirmed', 'count': 5}, ...]
    """
    seen = {}

    # 1. Candidate confirmed/suggested roles
    confirmed_suggestions = RoleSuggestion.objects.filter(
        candidate_confirmed=True
    ).values_list('role_title', flat=True)

    for r in confirmed_suggestions:
        norm = normalize_role_title(r)
        if norm and len(norm) > 2:
            key = norm.lower()
            if key not in seen:
                seen[key] = {'role': norm, 'source': 'candidate_confirmed', 'count': 1}
            else:
                seen[key]['count'] += 1

    all_suggestions = RoleSuggestion.objects.filter(
        role_title__isnull=False
    ).exclude(role_title='').values_list('role_title', flat=True)

    for r in all_suggestions:
        norm = normalize_role_title(r)
        if norm and len(norm) > 2:
            key = norm.lower()
            if key not in seen:
                seen[key] = {'role': norm, 'source': 'candidate_suggested', 'count': 1}
            else:
                seen[key]['count'] += 1

    # 2. Internal Job Openings
    open_jobs = JobOpening.objects.filter(status='open').values_list('title', flat=True)
    for r in open_jobs:
        norm = normalize_role_title(r)
        if norm and len(norm) > 2:
            key = norm.lower()
            if key not in seen:
                seen[key] = {'role': norm, 'source': 'job_opening', 'count': 1}
            else:
                seen[key]['count'] += 1

    # 3. Recent recruiter Job Link Entries
    recent_roles = JobLinkEntry.objects.values_list('role_title', flat=True)[:100]
    for r in recent_roles:
        norm = normalize_role_title(r)
        if norm and len(norm) > 2:
            key = norm.lower()
            if key not in seen:
                seen[key] = {'role': norm, 'source': 'recruiter_activity', 'count': 1}
            else:
                seen[key]['count'] += 1

    # Fallback default roles if database has minimal data
    defaults = ['Software Engineer', 'Data Engineer', 'Data Analyst', 'Product Manager', 'DevOps Engineer']
    for d in defaults:
        key = d.lower()
        if key not in seen:
            seen[key] = {'role': d, 'source': 'default', 'count': 0}

    # Sort by count descending, then role name
    sorted_roles = sorted(seen.values(), key=lambda x: (-x['count'], x['role']))
    return sorted_roles[:limit]
