import re
from typing import Dict, Any, Optional, Tuple

DETECTION_VERSION = "1.0"

# Standard taxonomy tiers used across Hyrind (frontend & backend)
TIER_INTERN = "Intern/New Grad"
TIER_0_TO_2 = "0–2 Years"
TIER_2_TO_5 = "2–5 Years"
TIER_5_PLUS = "5+ Years"
TIER_SENIOR = "Senior Level"
TIER_LEAD_STAFF = "Lead / Staff"

STANDARD_EXPERIENCE_LEVELS = [
    TIER_INTERN,
    TIER_0_TO_2,
    TIER_2_TO_5,
    TIER_5_PLUS,
    TIER_SENIOR,
    TIER_LEAD_STAFF,
]

WORD_TO_NUM = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
    'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
    'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
    'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'twenty': 20,
}

NUM_PATTERN = r'(?:\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|twenty)\b|\d+)(?:\s*\(\s*\d+\s*\))?'

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
        rf'\b(?P<min>{NUM_PATTERN})\s*(?:-|to|–|—)\s*(?P<max>{NUM_PATTERN})\s*\+?\s*(?:years?|yrs?)(?:\s+of)?\s*(?:[a-zA-Z0-9_\-/\s]{{0,60}}?)\s*(?:experience|expertise|background)?\b',
        re.IGNORECASE
    ),
    # 2. X+ years / X or more years of ... experience
    re.compile(
        rf'\b(?P<min>{NUM_PATTERN})\s*(?:\+|plus|\s+or\s+more)?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:[a-zA-Z0-9_\-/\s]{{0,60}}?)\s*(?:experience|expertise|background|track\s+record)\b',
        re.IGNORECASE
    ),
    # 3. Minimum / at least X years
    re.compile(
        rf'\b(?:at\s+least|minimum(?:\s+of)?|min\.?|req(?:uired)?)\s*(?P<min>{NUM_PATTERN})\s*(?:\+|plus|\s+or\s+more)?\s*(?:years?|yrs?)(?:\s+of)?\s*(?:[a-zA-Z0-9_\-/\s]{{0,50}}?)\s*(?:experience|expertise|background)?\b',
        re.IGNORECASE
    ),
    # 4. Degree + X years experience (e.g. BS/MS + 5 Years Experience)
    re.compile(
        rf'\b(?:degree|diploma|bachelor\'?s|master\'?s|phd|high\s+school)\b[^\n\r.]{{0,50}}?(?:\+|and|\/)\s*(?P<min>{NUM_PATTERN})\s*(?:\+|plus|\s+or\s+more)?\s*(?:years?|yrs?)(?:\s+of)?\s*(?:[a-zA-Z0-9_\-/\s]{{0,40}}?)\s*(?:experience|background)?\b',
        re.IGNORECASE
    ),
    # 5. Experience: X years / Experience required: X years
    re.compile(
        rf'\bexperience\s*(?:required)?\s*[:\-]\s*(?:at\s+least\s+)?(?P<min>{NUM_PATTERN})\s*(?:\+|plus|\s+or\s+more|\s*(?:-|to|–|—)\s*(?P<max>{NUM_PATTERN}))?\s*(?:years?|yrs?)\b',
        re.IGNORECASE
    ),
    # 6. Bringing X+ years of experience / expertise
    re.compile(
        rf'\bbring(?:ing)?\s+(?P<min>{NUM_PATTERN})\s*(?:\+|plus|\s+or\s+more)?\s*(?:years?|yrs?)(?:\s+of)?\s*(?:[a-zA-Z0-9_\-/\s]{{0,40}}?)\s*(?:experience|expertise|background)\b',
        re.IGNORECASE
    ),
    # 7. X years in / as / developing / engineering
    re.compile(
        rf'\b(?P<min>{NUM_PATTERN})\s*(?:\+|plus|\s+or\s+more)?\s*(?:years?|yrs?)\s+(?:in|as\s+a|with|developing|engineering|building|automating|designing)\b',
        re.IGNORECASE
    ),
]

# Seniority & Level Keywords
LEAD_STAFF_PATTERN = re.compile(
    r'\b(?:lead|team\s+lead|tech\s+lead|staff|principal|chief|architect|director|head\s+of|vp|vice\s+president|engineering\s+manager)\b',
    re.IGNORECASE
)
SENIOR_PATTERN = re.compile(
    r'\b(?:senior|sr\.?|sr\b|software\s+engineer\s+iii|developer\s+iii|level\s+3)\b',
    re.IGNORECASE
)
MID_LEVEL_PATTERN = re.compile(
    r'\b(?:mid[- ]level|intermediate|developer\s+ii|software\s+engineer\s+ii|level\s+2)\b',
    re.IGNORECASE
)
JUNIOR_PATTERN = re.compile(
    r'\b(?:junior|jr\.?|jr\b|software\s+engineer\s+i|developer\s+i|level\s+1|entry[- ]level|associate\s+(?:engineer|developer|consultant))\b',
    re.IGNORECASE
)
INTERN_PATTERN = re.compile(
    r'\b(?:intern|internship|co-?op|graduate\s+trainee|trainee|new\s+grad(?:uate)?|recent\s+college\s+grad(?:uate)?|campus)\b',
    re.IGNORECASE
)


def _parse_number_string(val: Optional[str]) -> Optional[float]:
    """Converts string/word representations of numbers into float."""
    if not val:
        return None
    val = val.strip().lower()
    paren = re.search(r'\((\d+)\)', val)
    if paren:
        return float(paren.group(1))
    clean = re.sub(r'[^\w]', '', val)
    if clean in WORD_TO_NUM:
        return float(WORD_TO_NUM[clean])
    digits = re.search(r'\d+', val)
    if digits:
        return float(digits.group(0))
    return None


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


def map_years_to_tier(
    min_yrs: Optional[float],
    max_yrs: Optional[float] = None,
    title: str = "",
    full_text: str = ""
) -> Optional[str]:
    """
    Maps detected minimum/maximum experience years and seniority cues into
    standard Hyrind taxonomy tiers:
    - 'Intern/New Grad'
    - '0–2 Years'
    - '2–5 Years'
    - '5+ Years'
    - 'Senior Level'
    - 'Lead / Staff'
    """
    title_lower = (title or "").lower()
    text_lower = (full_text or "").lower()

    is_intern = bool(INTERN_PATTERN.search(title_lower)) or (
        bool(INTERN_PATTERN.search(text_lower)) and (min_yrs is None or min_yrs <= 1.0)
    )
    if is_intern:
        return TIER_INTERN

    is_lead = bool(LEAD_STAFF_PATTERN.search(title_lower))
    is_senior = bool(SENIOR_PATTERN.search(title_lower))
    is_mid = bool(MID_LEVEL_PATTERN.search(title_lower)) or bool(MID_LEVEL_PATTERN.search(text_lower))
    is_junior = bool(JUNIOR_PATTERN.search(title_lower)) or bool(JUNIOR_PATTERN.search(text_lower))

    # If no numeric years found, infer from title and seniority keywords
    if min_yrs is None:
        if is_lead:
            return TIER_LEAD_STAFF
        if is_senior:
            return TIER_SENIOR
        if is_mid:
            return TIER_2_TO_5
        if is_junior:
            return TIER_0_TO_2
        return None

    # Handle numerical experience ranges
    if min_yrs == 0:
        if max_yrs is not None and max_yrs > 2.5:
            return TIER_2_TO_5
        return TIER_0_TO_2

    if min_yrs <= 2.0:
        if max_yrs is not None and max_yrs > 2.5:
            return TIER_2_TO_5
        return TIER_0_TO_2

    if min_yrs < 5.0:
        if is_senior and min_yrs >= 3.0:
            return TIER_SENIOR
        return TIER_2_TO_5

    if 5.0 <= min_yrs < 8.0:
        if is_lead:
            return TIER_LEAD_STAFF
        if is_senior:
            return TIER_SENIOR
        return TIER_5_PLUS

    # min_yrs >= 8.0
    if is_lead or min_yrs >= 10.0:
        return TIER_LEAD_STAFF
    if is_senior:
        return TIER_SENIOR
    return TIER_5_PLUS


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
      - version: '1.0'
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
                best_match = m_text
                evidence = _extract_sentence_evidence(clean_text, match.start(), match.end())
                confidence = "high"
                source = "description"
                break
        if detected_min is not None:
            break

    # 2. Map to standardized tier
    tier = map_years_to_tier(
        min_yrs=detected_min,
        max_yrs=detected_max,
        title=clean_title,
        full_text=clean_text
    )

    if not tier:
        return None

    if not evidence and clean_title:
        evidence = f"Inferred from title: '{clean_title}'"
        best_match = clean_title
        confidence = "medium"
        source = "title"

    return {
        'level': tier,
        'min_years': detected_min,
        'max_years': detected_max,
        'matched_phrase': best_match,
        'evidence': evidence,
        'confidence': confidence,
        'source': source,
        'version': DETECTION_VERSION,
    }


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
