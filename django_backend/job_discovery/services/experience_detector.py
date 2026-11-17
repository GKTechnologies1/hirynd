import re
from typing import Dict, Any, Optional, Tuple

DETECTION_VERSION = "2.0"

# Standard taxonomy tiers used across Hyrind (frontend & backend)
TIER_INTERN = "Intern/New Grad"
TIER_0_TO_2 = "0–2 Years"
TIER_2_TO_5 = "2–5 Years"
TIER_5_PLUS = "5+ Years"
TIER_10_PLUS = "10+ Years"
TIER_SENIOR = "Senior Level"
TIER_LEAD_STAFF = "Lead / Staff"

STANDARD_EXPERIENCE_LEVELS = [
    TIER_INTERN,
    TIER_0_TO_2,
    TIER_2_TO_5,
    TIER_5_PLUS,
    TIER_10_PLUS,
    TIER_SENIOR,
    TIER_LEAD_STAFF,
]

WORD_TO_NUM = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
    'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
    'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
    'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'twenty': 20,
}

NUM_PATTERN = r'(?:\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|twenty)\b|\d+(?:\.\d+)?)(?:\s*\(\s*\d+(?:\.\d+)?\s*\))?'

# Disqualifiers / false-positive phrases that refer to company history, benefits, driver's licenses, etc.
DISQUALIFIERS = [
    re.compile(
        r'\b(?:our\s+history\s+spans|company\s+has\s+been|established\s+for|founded\s+in|founded\s+over|operating\s+for|in\s+business\s+for|serving\s+for|revolutionizing\s+commerce\s+globally\s+for|industry\s+leader\s+for)\s+(?:more\s+than\s+|over\s+)?\d+\s+years?\b',
        re.IGNORECASE
    ),
    re.compile(r'\b(?:for\s+more\s+than|for\s+over)\s+\d{2,}\s+years\b', re.IGNORECASE),
    re.compile(r'\bcombined\s+(?:years\s+of\s+)?experience\b', re.IGNORECASE),
    re.compile(r'\bvesting\b', re.IGNORECASE),
    re.compile(r'\bdriver\'?s\s+license\b', re.IGNORECASE),
    re.compile(r'\b(?:per\s+year|\/\s*yr|\ba\s+year)\b', re.IGNORECASE),
    re.compile(r'\bwithin\s+(?:the\s+last\s+|the\s+past\s+)?\d+\s+years?\b', re.IGNORECASE),
    re.compile(r'\bwarranty\b', re.IGNORECASE),
]

# Patterns for extracting candidate required experience
EXP_PATTERNS = [
    # 1. Range: X - Y years of experience
    re.compile(
        rf'\b(?P<min>{NUM_PATTERN})\s*(?:-|to|–|—)\s*(?P<max>{NUM_PATTERN})\s*\+?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+[a-zA-Z0-9_\-/\s]{{0,60}}?\s*(?:experience|expertise|background|work|track\s+record))?\b',
        re.IGNORECASE
    ),
    # 2. X+ years / X or more years of ... experience
    re.compile(
        rf'\b(?P<min>{NUM_PATTERN})\s*(?:\+|plus|\s+or\s+more)?\s*(?:years?|yrs?|exp\.?|experience)?(?:\s+of)?\s*(?:[a-zA-Z0-9_\-/\s]{{0,60}}?)\s*(?:experience|expertise|background|track\s+record|software\s+development|software\s+engineering)\b',
        re.IGNORECASE
    ),
    # 3. Minimum / at least X years
    re.compile(
        rf'\b(?:at\s+least|minimum(?:\s+of)?|min\.?|req(?:uired)?)\s*(?P<min>{NUM_PATTERN})\s*(?:\+|plus|\s+or\s+more)?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+[a-zA-Z0-9_\-/\s]{{0,50}}?\s*(?:experience|expertise|background))?',
        re.IGNORECASE
    ),
    # 4. Degree + X years experience (e.g. BS/MS + 5 Years Experience)
    re.compile(
        rf'\b(?:degree|diploma|bachelor\'?s|master\'?s|phd|high\s+school)\b[^\n\r.]{{0,50}}?(?:\+|and|\/)\s*(?P<min>{NUM_PATTERN})\s*(?:\+|plus|\s+or\s+more)?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+[a-zA-Z0-9_\-/\s]{{0,40}}?\s*(?:experience|background))?',
        re.IGNORECASE
    ),
    # 5. Experience: X years / Experience required: X years / Experience: X+
    re.compile(
        rf'\bexperience\s*(?:required)?\s*[:\-]\s*(?:at\s+least\s+)?(?P<min>{NUM_PATTERN})\s*(?:\+|plus|\s+or\s+more|\s*(?:-|to|–|—)\s*(?P<max>{NUM_PATTERN}))?\s*(?:years?|yrs?)?\b',
        re.IGNORECASE
    ),
    # 6. Bringing X+ years of experience / expertise
    re.compile(
        rf'\bbring(?:ing)?\s+(?P<min>{NUM_PATTERN})\s*(?:\+|plus|\s+or\s+more)?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+[a-zA-Z0-9_\-/\s]{{0,40}}?\s*(?:experience|expertise|background))?',
        re.IGNORECASE
    ),
    # 7. X years in / as / developing / engineering / working
    re.compile(
        rf'\b(?P<min>{NUM_PATTERN})\s*(?:\+|plus|\s+or\s+more)?\s*(?:years?|yrs?)\s+(?:in|as\s+a|with|working|developing|engineering|building|automating|designing)\b',
        re.IGNORECASE
    ),
]

# Seniority & Level Keywords (Title & Explicit Cues)
INTERN_TITLE_PATTERN = re.compile(
    r'\b(?:intern\b|internship\b|co-?op\b|graduate\s+trainee\b|apprentice\b|new\s+grad(?:uate)?\s+program)\b',
    re.IGNORECASE
)
INTERN_DESC_ROLE_PATTERN = re.compile(
    r'\b(?:this\s+(?:is\s+an?\s+)?internship|internship\s+program|internship\s+opportunity|summer\s+intern|co-?op\s+position|10-12\s+week\s+internship)\b',
    re.IGNORECASE
)

LEVEL_4_LEAD_PATTERN = re.compile(
    r'\b(?:lead\b|team\s+lead\b|tech\s+lead\b|staff\b|principal\b|chief\b|architect\b|director\b|head\s+of\b|vp\b|vice\s+president|(?:engineer|developer)\s+(?:iv|v)\b|level\s+[45]\b)\b',
    re.IGNORECASE
)
LEVEL_3_SENIOR_PATTERN = re.compile(
    r'\b(?:senior\b|sr\.?\b|(?:software|test|qa|sdet|data|devops|cloud|systems|platform|frontend|backend|full[- ]stack)?\s*engineer\s+iii\b|(?:developer|analyst)\s+iii\b|level\s+3\b)\b',
    re.IGNORECASE
)
LEVEL_2_MID_PATTERN = re.compile(
    r'\b(?:mid[- ]level\b|intermediate\b|(?:software|test|qa|sdet|data|devops|cloud|systems|platform|frontend|backend|full[- ]stack)?\s*engineer\s+ii\b|(?:developer|analyst)\s+ii\b|level\s+2\b)\b',
    re.IGNORECASE
)
LEVEL_1_ENTRY_PATTERN = re.compile(
    r'\b(?:junior\b|jr\.?\b|(?:software|test|qa|sdet|data|devops|cloud|systems|platform|frontend|backend|full[- ]stack)?\s*engineer\s+i\b|(?:developer|analyst)\s+i\b|level\s+1\b|entry[- ]level\b|associate\s+[a-zA-Z\s]{0,25}?(?:engineer|developer|consultant|analyst))\b',
    re.IGNORECASE
)


def _parse_number_string(val: Optional[str]) -> Optional[float]:
    """Converts string/word representations of numbers into float."""
    if not val:
        return None
    val = val.strip().lower()
    paren = re.search(r'\((\d+(?:\.\d+)?)\)', val)
    if paren:
        return float(paren.group(1))
    clean = re.sub(r'[^\w]', '', val)
    if clean in WORD_TO_NUM:
        return float(WORD_TO_NUM[clean])
    digits = re.search(r'\d+(?:\.\d+)?', val)
    if digits:
        return float(digits.group(0))
    return None


def _clean_matched_phrase(phrase: str) -> str:
    """Strips dangling prepositions, dashes, and extra spaces from matched text."""
    if not phrase:
        return ""
    p = phrase.strip()
    p = re.sub(r'[\s\-_/–—]+(?:of|in|to|for|with|or|as)?[\s\-_/–—]*$', '', p, flags=re.I).strip()
    return p


def _extract_sentence_evidence(text: str, match_start: int, match_end: int) -> str:
    """Extracts surrounding sentence or clause as human-readable context snippet."""
    preceding = text[:match_start]
    last_punct = max(preceding.rfind('.'), preceding.rfind('\n'), preceding.rfind(';'))
    start_pos = last_punct + 1 if last_punct != -1 else max(0, match_start - 60)

    following = text[match_end:]
    next_punct = len(text)
    for p in ['.', '\n', ';']:
        idx = following.find(p)
        if idx != -1 and idx + match_end < next_punct:
            next_punct = idx + match_end
    end_pos = min(len(text), next_punct + 1) if next_punct != len(text) else min(len(text), match_end + 60)

    evidence = text[start_pos:end_pos].strip()
    return re.sub(r'\s+', ' ', evidence)


def _format_year(val: float) -> str:
    """Formats float year into clean string (e.g. 10.0 -> '10', 2.5 -> '2.5')."""
    if val.is_integer():
        return str(int(val))
    return f"{val:g}"


def format_exact_experience(min_yrs: Optional[float], max_yrs: Optional[float] = None) -> Optional[str]:
    """
    Formats exact experience string from detected numeric min and max years.
    Returns:
      - 'X–Y Years' if min and max are present and min != max (e.g. '3–5 Years', '0–2 Years')
      - 'X Years' if min and max are present and min == max (e.g. '5 Years')
      - 'X+ Years' if min is present without max (e.g. '10+ Years', '5+ Years', '8+ Years')
    """
    if min_yrs is None:
        return None

    min_str = _format_year(min_yrs)
    if max_yrs is not None:
        max_str = _format_year(max_yrs)
        if min_yrs == max_yrs:
            return f"{min_str} Years"
        return f"{min_str}–{max_str} Years"

    if min_yrs == 0:
        return TIER_0_TO_2
    return f"{min_str}+ Years"


def map_years_to_tier(
    min_yrs: Optional[float],
    max_yrs: Optional[float] = None,
    title: str = "",
    full_text: str = ""
) -> Optional[str]:
    """
    Returns exact experience if numerical years are detected (e.g. '10+ Years', '3–5 Years').
    If no numeric years are found, infers experience level from title and seniority cues
    ('Intern/New Grad', 'Senior Level', 'Lead / Staff', etc.).
    """
    title_lower = (title or "").lower()
    text_lower = (full_text or "").lower()

    # Intern is strictly for actual internship titles or explicit internship positions
    is_intern = bool(INTERN_TITLE_PATTERN.search(title_lower)) or bool(INTERN_DESC_ROLE_PATTERN.search(text_lower))
    if is_intern:
        return TIER_INTERN

    # If numeric experience was detected in JD, return exact formatted experience
    if min_yrs is not None:
        return format_exact_experience(min_yrs, max_yrs)

    # If no numeric years found, infer from title and seniority keywords
    is_lead = bool(LEVEL_4_LEAD_PATTERN.search(title_lower))
    is_senior = bool(LEVEL_3_SENIOR_PATTERN.search(title_lower))
    is_mid = bool(LEVEL_2_MID_PATTERN.search(title_lower)) or bool(LEVEL_2_MID_PATTERN.search(text_lower))
    is_junior = bool(LEVEL_1_ENTRY_PATTERN.search(title_lower)) or bool(LEVEL_1_ENTRY_PATTERN.search(text_lower))

    if is_lead:
        return TIER_LEAD_STAFF
    if is_senior:
        return TIER_SENIOR
    if is_mid:
        return TIER_2_TO_5
    if is_junior:
        return TIER_0_TO_2
    return None


def detect_job_experience(
    text: Optional[str],
    title: Optional[str] = ""
) -> Optional[Dict[str, Any]]:
    """
    Scans job description and title to detect candidate experience requirement.
    Returns structured dictionary with:
      - level: normalized tier string (e.g. '2–5 Years')
      - min_years: float minimum years or None
      - max_years: float maximum years or None
      - matched_phrase: text fragment matched
      - evidence: sentence/context evidence snippet
      - confidence: 'high' | 'medium' | 'low'
      - source: 'description' | 'title'
      - version: '2.0'
    Returns None if no experience requirements or cues are detected.
    """
    clean_text = text or ""
    clean_title = title or ""

    detected_min: Optional[float] = None
    detected_max: Optional[float] = None
    best_match: Optional[str] = None
    evidence: str = ""
    confidence = "low"
    source = "title"

    # 1. Scan description for explicit numeric requirements
    for pat in EXP_PATTERNS:
        for match in pat.finditer(clean_text):
            m_text = match.group(0)
            start = max(0, match.start() - 60)
            end = min(len(clean_text), match.end() + 60)
            context = clean_text[start:end]

            if any(dq.search(context) for dq in DISQUALIFIERS):
                continue

            parsed_min = _parse_number_string(match.groupdict().get('min'))
            parsed_max = _parse_number_string(match.groupdict().get('max'))

            if parsed_min is not None and 0 <= parsed_min <= 25:
                detected_min = parsed_min
                detected_max = parsed_max
                best_match = _clean_matched_phrase(m_text)
                evidence = _extract_sentence_evidence(clean_text, match.start(), match.end())
                confidence = "high"
                source = "description"
                break
        if detected_min is not None:
            break

    # 2. If explicit numeric requirements found in description
    if detected_min is not None:
        tier = map_years_to_tier(
            min_yrs=detected_min,
            max_yrs=detected_max,
            title=clean_title,
            full_text=clean_text
        )
        clean_min = int(detected_min) if detected_min.is_integer() else detected_min
        clean_max = (int(detected_max) if detected_max.is_integer() else detected_max) if detected_max is not None else None
        return {
            'level': tier,
            'min_years': clean_min,
            'max_years': clean_max,
            'matched_phrase': best_match,
            'evidence': evidence,
            'confidence': confidence,
            'source': source,
            'version': DETECTION_VERSION,
        }

    # 3. If no numeric requirements found in description, infer from Title
    if bool(INTERN_TITLE_PATTERN.search(clean_title)) or bool(INTERN_DESC_ROLE_PATTERN.search(clean_text)):
        return {
            'level': TIER_INTERN,
            'min_years': 0,
            'max_years': 1,
            'matched_phrase': 'Intern / Trainee (inferred from title)',
            'evidence': f"Role identified as Internship/Trainee: '{clean_title}'",
            'confidence': 'medium',
            'source': 'title',
            'version': DETECTION_VERSION,
        }

    if bool(LEVEL_4_LEAD_PATTERN.search(clean_title)):
        return {
            'level': TIER_LEAD_STAFF,
            'min_years': 8,
            'max_years': None,
            'matched_phrase': 'Lead / Staff (inferred from title)',
            'evidence': f"Leadership/Staff level identified in title: '{clean_title}'",
            'confidence': 'medium',
            'source': 'title',
            'version': DETECTION_VERSION,
        }

    if bool(LEVEL_3_SENIOR_PATTERN.search(clean_title)):
        return {
            'level': TIER_SENIOR,
            'min_years': 5,
            'max_years': None,
            'matched_phrase': 'Senior Level (inferred from title)',
            'evidence': f"Senior level identified in title: '{clean_title}'",
            'confidence': 'medium',
            'source': 'title',
            'version': DETECTION_VERSION,
        }

    if bool(LEVEL_2_MID_PATTERN.search(clean_title)):
        return {
            'level': TIER_2_TO_5,
            'min_years': 2,
            'max_years': 5,
            'matched_phrase': 'Mid-Level (inferred from title)',
            'evidence': f"Mid-level/Level II identified in title: '{clean_title}'",
            'confidence': 'medium',
            'source': 'title',
            'version': DETECTION_VERSION,
        }

    if bool(LEVEL_1_ENTRY_PATTERN.search(clean_title)):
        return {
            'level': TIER_0_TO_2,
            'min_years': 0,
            'max_years': 2,
            'matched_phrase': 'Entry-Level / Associate (inferred from title)',
            'evidence': f"Entry-level/Level I identified in title: '{clean_title}'",
            'confidence': 'medium',
            'source': 'title',
            'version': DETECTION_VERSION,
        }

    # No experience cues detected
    return None


def detect_experience_level(
    text: Optional[str],
    title: Optional[str] = ""
) -> Optional[str]:
    """
    Convenience helper that scans text and returns the standard Hyrind experience
    level tier string (e.g. '2–5 Years'), or None if undetected.
    """
    result = detect_job_experience(text=text, title=title)
    return result['level'] if result else None


def filter_jobs_by_experience(qs, exp_val: Optional[str]):
    """
    Applies unified experience filtering across Admin and Recruiter discovery querysets.
    Supports range codes ('0-2', '2-5', '5-8', '8+', 'not_specified') and tier strings.
    """
    if not exp_val or str(exp_val).strip().lower() in ('all', 'any', ''):
        return qs

    from django.db.models import Q
    val = str(exp_val).strip()
    norm = val.lower().replace(' ', '').replace('–', '-').replace('—', '-')

    if norm in ('0-2', '0-2years', '0-2yrs', '0to2'):
        return qs.filter(
            Q(experience_min_years__gte=0, experience_min_years__lte=2) |
            Q(experience_level__in=['0–2 Years', 'Intern/New Grad']) |
            Q(experience_level__icontains='0-2') |
            Q(experience_level__icontains='0–2') |
            Q(experience_level__icontains='1-2') |
            Q(experience_level__icontains='1–2')
        )
    elif norm in ('2-5', '2-5years', '2-5yrs', '2to5'):
        return qs.filter(
            Q(experience_min_years__gte=2, experience_min_years__lt=5) |
            Q(experience_level='2–5 Years') |
            Q(experience_level__icontains='2-5') |
            Q(experience_level__icontains='2–5') |
            Q(experience_level__icontains='3-5') |
            Q(experience_level__icontains='3–5') |
            Q(experience_level__icontains='3+') |
            Q(experience_level__icontains='4+')
        )
    elif norm in ('5-8', '5-8years', '5-8yrs', '5to8'):
        return qs.filter(
            (Q(experience_min_years__gte=5, experience_min_years__lt=8)) |
            (Q(experience_level__in=['5+ Years', 'Senior Level']) & (Q(experience_min_years__lt=8) | Q(experience_min_years__isnull=True))) |
            Q(experience_level__icontains='5-8') |
            Q(experience_level__icontains='5–8') |
            Q(experience_level__icontains='5+') |
            Q(experience_level__icontains='6+') |
            Q(experience_level__icontains='7+')
        )
    elif norm in ('8+', '8+years', '8+yrs', '8plus', '8ormore'):
        return qs.filter(
            Q(experience_min_years__gte=8) |
            Q(experience_level='Lead / Staff') |
            Q(experience_level__icontains='8+') |
            Q(experience_level__icontains='9+') |
            Q(experience_level__icontains='10+')
        )
    elif norm in ('10+', '10+years', '10+yrs', '10plus', '10ormore'):
        return qs.filter(
            Q(experience_min_years__gte=10) |
            Q(experience_level__icontains='10+')
        )
    elif norm in ('not_specified', 'notspecified', 'unspecified', 'none'):
        return qs.filter(
            Q(experience_min_years__isnull=True) & (Q(experience_level__isnull=True) | Q(experience_level=''))
        )
    else:
        parts = [p.strip() for p in val.split(',') if p.strip()]
        q = Q()
        for p in parts:
            q |= Q(experience_level__icontains=p) | Q(experience_raw__icontains=p)
        return qs.filter(q)
