import re
import unicodedata
from typing import List
from candidates.models import RoleSuggestion, RoleConfirmation


def clean_role_display(title: str) -> str:
    """Format role title nicely: trim whitespace, capitalize words, preserve known acronyms."""
    if not title:
        return ""
    normalized = unicodedata.normalize('NFKC', str(title))
    normalized = re.sub(r'[_]+$', '', normalized)
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    words = normalized.split()
    acronyms = {
        'qa': 'QA', 'sqa': 'SQA', 'ui': 'UI', 'ux': 'UX', 'ai': 'AI', 'ml': 'ML',
        'ai/ml': 'AI/ML', 'aws': 'AWS', 'devops': 'DevOps', 'it': 'IT', 'cisco': 'Cisco',
        'se': 'SE', 'sde': 'SDE', 'sre': 'SRE', 'sdn': 'SDN', 'bi': 'BI', 'etl': 'ETL'
    }
    formatted = []
    for w in words:
        wl = w.lower()
        if wl in acronyms:
            formatted.append(acronyms[wl])
        elif '/' in w:
            parts = [acronyms.get(p.lower(), p.capitalize()) for p in w.split('/') if p]
            formatted.append('/'.join(parts))
        else:
            formatted.append(w.capitalize())
    return ' '.join(formatted)


def normalize_role_title(title: str) -> str:
    """Normalize role string for deduplication."""
    return clean_role_display(title)


def get_eligible_roles(limit: int = 50) -> List[dict]:
    """
    Retrieves distinct active job roles from Candidate Role Suggestions/Confirmations.
    Ensures:
      1. Role names are cleanly formatted and trimmed without collapsing distinct disciplines.
      2. Multi-role / comma-separated values are handled properly.
      3. The count displayed equals the number of DISTINCT candidates with that confirmed role.
      4. Double counting is completely eliminated.
    Returns list of dicts: [{'role': 'Software Engineer', 'source': 'candidate_confirmed', 'count': 5}, ...]
    """
    role_map = {}  # norm_key -> {'role': display, 'source': 'candidate_confirmed', 'candidate_ids': set()}

    # 1. Candidate confirmed suggestions
    confirmed_suggestions = RoleSuggestion.objects.filter(
        candidate_confirmed=True
    ).values('candidate_id', 'role_title')

    for item in confirmed_suggestions:
        cand_id = item['candidate_id']
        raw = item.get('role_title')
        if not raw:
            continue
        # Support comma-separated or multi-role values properly
        parts = [p.strip() for p in raw.split(',') if p.strip()]
        for p in parts:
            display = clean_role_display(p)
            if len(display) < 2:
                continue
            key = display.lower()
            if key not in role_map:
                role_map[key] = {
                    'role': display,
                    'source': 'candidate_confirmed',
                    'candidate_ids': set()
                }
            role_map[key]['candidate_ids'].add(cand_id)

    # 2. Confirmed custom role confirmations
    confirmed_rcs = RoleConfirmation.objects.filter(
        response='confirmed'
    ).select_related('suggestion').values('candidate_id', 'custom_role_title', 'suggestion__role_title')

    for rc in confirmed_rcs:
        cand_id = rc['candidate_id']
        raw = rc.get('custom_role_title') or rc.get('suggestion__role_title')
        if not raw:
            continue
        parts = [p.strip() for p in raw.split(',') if p.strip()]
        for p in parts:
            display = clean_role_display(p)
            if len(display) < 2:
                continue
            key = display.lower()
            if key not in role_map:
                role_map[key] = {
                    'role': display,
                    'source': 'candidate_confirmed',
                    'candidate_ids': set()
                }
            role_map[key]['candidate_ids'].add(cand_id)

    # Convert sets to distinct candidate counts
    result = []
    for k, data in role_map.items():
        result.append({
            'role': data['role'],
            'source': data['source'],
            'count': len(data['candidate_ids'])
        })

    # Fallback default roles if database has minimal data
    defaults = ['Software Engineer', 'Data Engineer', 'Data Analyst', 'Product Manager', 'DevOps Engineer']
    for d in defaults:
        key = d.lower()
        if key not in role_map:
            result.append({'role': d, 'source': 'default', 'count': 0})

    # Sort by count descending, then role name alphabetically
    result.sort(key=lambda x: (-x['count'], x['role']))
    return result[:limit]

