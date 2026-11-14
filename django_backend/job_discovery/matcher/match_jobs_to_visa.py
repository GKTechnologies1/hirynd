"""
Visa Matcher: Copies company visa intelligence (from CompanyVisaHistory and CompanyAlias)
onto DiscoveredJob records using multi-pass precision matching.
"""
from __future__ import annotations

import logging
from typing import List, Optional
from datetime import datetime
from django.db import transaction
from django.db.models import Q

from ..models import DiscoveredJob, CompanyVisaHistory, CompanyAlias
from .normalize_company import normalize_company, normalize_company_words
from .string_similarity import BestMatchFinder, levenshtein_ratio

logger = logging.getLogger('job_discovery')

FUZZY_THRESHOLD = 0.90
FUZZY_SECONDARY_RATIO_THRESHOLD = 0.85
MIN_NORM_LENGTH = 6
MIN_PREFIX_LENGTH = 7
MIN_PREFIX_WORDS = 2


def apply_visa_to_job(job: DiscoveredJob, visa: CompanyVisaHistory, confidence: str) -> None:
    job.visa_matched = True
    job.h1b_sponsor = bool((visa.h1b_total_filings or 0) > 0 or (visa.h1b_approvals or 0) > 0)
    job.h1b_filings_recent = visa.h1b_total_filings or 0
    job.h1b_approvals = visa.h1b_approvals or 0
    job.h1b_denials = visa.h1b_denials or 0
    job.h1b_approval_rate = visa.h1b_approval_rate
    job.h1b_avg_salary = visa.h1b_avg_salary
    job.perm_filings = visa.perm_total_filings or 0
    job.green_card_sponsor = bool(visa.green_card_sponsor)
    job.everify_enrolled = visa.everify_enrolled
    job.visa_grade = visa.visa_grade or 'F'
    job.visa_friendly_score = visa.visa_friendly_score or 0
    job.company_match_confidence = confidence


def match_jobs_to_visa(job_ids: Optional[List[str]] = None, rematch_all: bool = False) -> int:
    """
    Matches discovered jobs against the CompanyVisaHistory database.
    Pass 1: Curated Alias Table
    Pass 2: Exact Normalized Company Name
    Pass 3: High-precision Fuzzy Match
    Pass 4: Multi-word Prefix Match
    """
    qs = DiscoveredJob.objects.all()
    if job_ids:
        qs = qs.filter(id__in=job_ids)
    elif not rematch_all:
        qs = qs.filter(visa_matched=False)

    jobs = list(qs)
    if not jobs:
        return 0

    # Ensure all jobs have company_name_norm computed
    for j in jobs:
        if not j.company_name_norm and j.company_name:
            j.company_name_norm = normalize_company(j.company_name)

    # Pre-cache aliases into dictionary
    aliases = dict(CompanyAlias.objects.values_list('alias_norm', 'target_norm'))

    # Pre-cache known visa companies
    visa_records = {v.company_name_norm: v for v in CompanyVisaHistory.objects.all()}
    if not visa_records:
        logger.info("[VisaMatcher] No company_visa_history records found in database.")
        return 0

    known_targets = list(visa_records.keys())
    finder = BestMatchFinder(known_targets, threshold=FUZZY_THRESHOLD)

    matched_count = 0
    to_update = []

    for job in jobs:
        norm = job.company_name_norm or normalize_company(job.company_name)
        if not norm:
            continue

        matched_visa: Optional[CompanyVisaHistory] = None
        confidence = 'none'

        # Pass 1: Alias Table
        if norm in aliases:
            target = aliases[norm]
            if target in visa_records:
                matched_visa = visa_records[target]
                confidence = 'alias'

        # Pass 2: Exact Name Match
        if not matched_visa and norm in visa_records:
            matched_visa = visa_records[norm]
            confidence = 'exact'

        # Pass 3: Fuzzy Match (min length 6, primary Dice >= 0.9, secondary Levenshtein >= 0.85)
        if not matched_visa and len(norm) >= MIN_NORM_LENGTH:
            res = finder.best(norm)
            if res:
                target, rating = res
                sec_ratio = levenshtein_ratio(norm, target)
                if sec_ratio >= FUZZY_SECONDARY_RATIO_THRESHOLD:
                    matched_visa = visa_records[target]
                    confidence = 'fuzzy'

        # Pass 4: Prefix Match (for multi-word company names, e.g. "capitalone" -> "capitaloneservices")
        if not matched_visa and len(norm) >= MIN_PREFIX_LENGTH:
            words = normalize_company_words(job.company_name)
            if len(words) >= MIN_PREFIX_WORDS:
                prefix_candidates = [
                    k for k in known_targets if k.startswith(norm)
                ]
                if len(prefix_candidates) == 1:
                    matched_visa = visa_records[prefix_candidates[0]]
                    confidence = 'prefix'

        if matched_visa:
            apply_visa_to_job(job, matched_visa, confidence)
            matched_count += 1
            to_update.append(job)

    if to_update:
        fields = [
            'visa_matched', 'h1b_sponsor', 'h1b_filings_recent', 'h1b_approvals',
            'h1b_denials', 'h1b_approval_rate', 'h1b_avg_salary', 'perm_filings',
            'green_card_sponsor', 'everify_enrolled', 'visa_grade',
            'visa_friendly_score', 'company_match_confidence', 'company_name_norm'
        ]
        DiscoveredJob.objects.bulk_update(to_update, fields, batch_size=1000)
        logger.info(f"[VisaMatcher] Successfully matched {len(to_update)} jobs with Visa Intelligence.")

    return matched_count

