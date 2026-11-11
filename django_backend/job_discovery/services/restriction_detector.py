import re
from typing import List, Dict, Any, Optional

DETECTION_VERSION = "1.0"

# Compiled regex patterns for restriction categories
# Note: Negative lookbehinds and lookaheads prevent matching statements like "does not require US citizenship" or "sponsorship is available"

US_CITIZENSHIP_PATTERNS = [
    re.compile(r'\b(?:u\.?s\.?|united states)\s+citizenship\s+(?:is\s+)?required\b', re.IGNORECASE),
    re.compile(r'\bmust\s+be\s+(?:a\s+)?(?:u\.?s\.?|united states)\s+citizen\b', re.IGNORECASE),
    re.compile(r'\bonly\s+(?:u\.?s\.?|united states)\s+citizens\s+(?:may|can)\s+apply\b', re.IGNORECASE),
    re.compile(r'\b(?:u\.?s\.?|united states)\s+citizens\s+only\b', re.IGNORECASE),
    re.compile(r'\bproof\s+of\s+(?:u\.?s\.?|united states)\s+citizenship\s+required\b', re.IGNORECASE),
    re.compile(r'\bdue\s+to\s+(?:federal|government|contract)\s+regulations?[,\s]+(?:must\s+be\s+a\s+)?(?:u\.?s\.?|united states)\s+citizen\b', re.IGNORECASE),
]

NO_VISA_PATTERNS = [
    re.compile(r'\bno\s+temporary\s+visa\s+holders?\b', re.IGNORECASE),
    re.compile(r'\b(?:no|not\s+offering|unable\s+to\s+provide|cannot\s+provide|not\s+available)\s+visa\s+sponsorship\b', re.IGNORECASE),
    re.compile(r'\bvisa\s+sponsorship\s+is\s+not\s+(?:available|provided|offered|supported)\b', re.IGNORECASE),
    re.compile(r'\bwill\s+not\s+sponsor\s+(?:work\s+)?visas?\b', re.IGNORECASE),
    re.compile(r'\bmust\s+not\s+require\s+(?:visa\s+)?sponsorship\b', re.IGNORECASE),
    re.compile(r'\bwithout\s+(?:the\s+need\s+for\s+)?(?:visa\s+)?sponsorship\b', re.IGNORECASE),
    re.compile(r'\bno\s+(?:c2c|corp-to-corp|corp\s+to\s+corp|third\s+party\s+candidates?)\b', re.IGNORECASE),
    re.compile(r'\bnot\s+eligible\s+for\s+(?:h-?1b|visa)\s+sponsorship\b', re.IGNORECASE),
]

SECRET_CLEARANCE_PATTERNS = [
    re.compile(r'\b(?:active\s+)?secret\s+(?:security\s+)?clearance\s+required\b', re.IGNORECASE),
    re.compile(r'\b(?:active\s+)?top\s+secret(?:\s*\/\s*sci)?\s+clearance\s+required\b', re.IGNORECASE),
    re.compile(r'\bmust\s+(?:possess|hold|have|maintain)\s+(?:an?\s+)?(?:active\s+)?(?:top\s+)?secret\s+(?:security\s+)?clearance\b', re.IGNORECASE),
    re.compile(r'\bsecurity\s+clearance\s+required:\s*(?:top\s+)?secret\b', re.IGNORECASE),
    re.compile(r'\bability\s+to\s+obtain\s+(?:and\s+maintain\s+)?(?:a\s+)?(?:top\s+)?secret\s+(?:security\s+)?clearance\b', re.IGNORECASE),
    re.compile(r'\bts\s*\/\s*sci\s+clearance\b', re.IGNORECASE),
]

# Negation check phrases that disqualify false positives
NEGATION_CHECK = re.compile(
    r'\b(?:not\s+required|not\s+necessary|does\s+not\s+require|no\s+clearance\s+needed|sponsorship\s+is\s+available|we\s+sponsor)\b',
    re.IGNORECASE
)


def _extract_sentence_evidence(text: str, match_start: int, match_end: int) -> str:
    """Extracts the surrounding sentence or clause as human-readable context."""
    # Find preceding sentence boundary or max 120 chars
    preceding = text[:match_start]
    last_punct = max(preceding.rfind('.'), preceding.rfind('\n'), preceding.rfind(';'))
    start_pos = last_punct + 1 if last_punct != -1 else max(0, match_start - 60)

    # Find following sentence boundary or max 120 chars
    following = text[match_end:]
    next_punct = len(text)
    for p in ['.', '\n', ';']:
        idx = following.find(p)
        if idx != -1 and idx + match_end < next_punct:
            next_punct = idx + match_end
    end_pos = min(len(text), next_punct + 1) if next_punct != len(text) else min(len(text), match_end + 60)

    evidence = text[start_pos:end_pos].strip()
    return re.sub(r'\s+', ' ', evidence)


def detect_job_restrictions(text: Optional[str]) -> List[Dict[str, Any]]:
    """
    Scans job text (description, title, requirements) and returns detected eligibility/clearance restrictions.
    Returns structured list with type, label, evidence, confidence, and version.
    """
    if not text:
        return []

    results = []

    # 1. US Citizenship Check
    for pat in US_CITIZENSHIP_PATTERNS:
        match = pat.search(text)
        if match:
            evidence = _extract_sentence_evidence(text, match.start(), match.end())
            if not NEGATION_CHECK.search(evidence):
                results.append({
                    'type': 'US_CITIZENSHIP_REQUIRED',
                    'label': 'US Citizenship Required',
                    'badge_variant': 'destructive',
                    'matched_phrase': match.group(0),
                    'evidence': evidence,
                    'confidence': 'high',
                    'version': DETECTION_VERSION,
                    'is_manual': False,
                })
                break

    # 2. No Temporary Visa / No Sponsorship Check
    for pat in NO_VISA_PATTERNS:
        match = pat.search(text)
        if match:
            evidence = _extract_sentence_evidence(text, match.start(), match.end())
            if not NEGATION_CHECK.search(evidence):
                results.append({
                    'type': 'NO_TEMPORARY_VISA',
                    'label': 'No Visa Sponsorship',
                    'badge_variant': 'warning',
                    'matched_phrase': match.group(0),
                    'evidence': evidence,
                    'confidence': 'high',
                    'version': DETECTION_VERSION,
                    'is_manual': False,
                })
                break

    # 3. Secret Security Clearance Check
    for pat in SECRET_CLEARANCE_PATTERNS:
        match = pat.search(text)
        if match:
            evidence = _extract_sentence_evidence(text, match.start(), match.end())
            if not NEGATION_CHECK.search(evidence):
                results.append({
                    'type': 'SECRET_CLEARANCE',
                    'label': 'Secret Clearance Required',
                    'badge_variant': 'secondary',
                    'matched_phrase': match.group(0),
                    'evidence': evidence,
                    'confidence': 'high',
                    'version': DETECTION_VERSION,
                    'is_manual': False,
                })
                break

    return results

