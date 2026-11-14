import os
import time
import logging
import threading
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
from django.utils import timezone
from django.db import transaction

from ..models import ScraperExecution, DiscoveredJob
from ..config.constants import SOURCES, SUPPORTED_SITES, DEDICATED_SITES
from ..core import conf
from ..scraper.job_parser import parse_job, NormalizedJob
from ..scraper.parser_utils import actor_title_keywords, title_matches_role
from ..scraper import apify_client as apify

logger = logging.getLogger('job_discovery')


def check_title_matches_any_role(title: str, role_query: str) -> bool:
    """
    Validates that the scraped job title aligns with the target role.
    Handles comma-separated role combinations gracefully.
    """
    if not title or not role_query:
        return True
    sub_roles = [r.strip() for r in role_query.split(',') if r.strip()]
    if not sub_roles:
        return True
    return any(title_matches_role(title, sub) for sub in sub_roles)

DEFAULT_ACTORS = {
    'multi': os.getenv('APIFY_MULTI_JOBBOARD_ACTOR', 'flash_scraper/multi-jobboard-scraper'),
    'dice': os.getenv('APIFY_DICE_ACTOR', 'solidcode/dice-scraper'),
    'monster': os.getenv('APIFY_MONSTER_ACTOR', 'unfenced-group/monster-scraper'),
    'careerbuilder': os.getenv('APIFY_CAREERBUILDER_ACTOR', 'ahmed_jasarevic/careerbuilder-scraper'),
    'ziprecruiter': os.getenv('APIFY_ZIPRECRUITER_ACTOR', 'memo23/ziprecruiter-scraper'),
    'jobright': os.getenv('APIFY_JOBRIGHT_ACTOR', 'jobscrawler/jobright-scraper'),
}


def get_actor_for_source(source: str) -> Optional[str]:
    """Returns the Apify actor ID for the given portal source."""
    if source in SUPPORTED_SITES:
        return DEFAULT_ACTORS['multi']
    return DEFAULT_ACTORS.get(source)


def build_actor_input(source: str, query: str, limit: int = 15, freshness_days: int = 7) -> Optional[Dict[str, Any]]:
    """Builds the input JSON for the specific Apify actor."""
    actor_id = get_actor_for_source(source)
    if not actor_id:
        return None

    if source in SUPPORTED_SITES:
        return {
            'actorId': actor_id,
            'input': {
                'searchTerm': query,
                'location': 'United States',
                'sites': [source],
                'maxResults': limit,
                'hoursOld': max(1, freshness_days * 24),
                'maxAgeDays': freshness_days,
                'requireTitleKeywords': actor_title_keywords(query),
            }
        }
    elif source == 'dice':
        return {
            'actorId': actor_id,
            'input': {
                'searchQueries': [query],
                'maxResultsPerQuery': min(limit, 100),
                'fetchDescription': True,
            }
        }
    elif source == 'monster':
        return {
            'actorId': actor_id,
            'input': {
                'keyword': query,
                'maxResults': limit,
            }
        }
    elif source == 'ziprecruiter':
        return {
            'actorId': actor_id,
            'input': {
                'query': f'"{query}"',
                'maxResults': limit,
            }
        }
    elif source == 'jobright':
        return {
            'actorId': actor_id,
            'input': {
                'title': query,
                'maxItems': limit,
            }
        }
    return None


def upsert_scraped_job(job: NormalizedJob, target_role: str, execution: ScraperExecution) -> str:
    """
    Persists a NormalizedJob into DiscoveredJob using Django ORM.
    Detects duplicates via content_hash.
    Returns: 'inserted', 'updated', or 'duplicate'
    """
    # 1. Check for duplicate by content_hash across different jobs/portals
    duplicate_match = DiscoveredJob.objects.filter(
        content_hash=job.contentHash
    ).exclude(job_id=job.jobId).first()

    is_duplicate = duplicate_match is not None
    canonical_job = duplicate_match if is_duplicate else None

    # Determine posting date
    from django.conf import settings
    p_date = job.postingDate
    if p_date:
        if getattr(settings, 'USE_TZ', False):
            if timezone.is_naive(p_date):
                p_date = timezone.make_aware(p_date)
        else:
            if timezone.is_aware(p_date):
                p_date = timezone.make_naive(p_date)

    from .restriction_detector import detect_job_restrictions

    # 2. Check if this exact job_id was already saved
    existing = DiscoveredJob.objects.filter(job_id=job.jobId).first()

    if existing:
        existing.title = job.title or existing.title
        existing.company_name = job.companyName or existing.company_name
        existing.company_name_norm = job.companyNameNorm or existing.company_name_norm
        existing.target_role = target_role or existing.target_role
        raw_url = str(job.jobUrl).strip() if job.jobUrl else ''
        if raw_url and not (raw_url.startswith('http://') or raw_url.startswith('https://')):
            raw_url = 'https://' + raw_url
        if raw_url:
            existing.job_url = raw_url
        if job.jobDescription:
            existing.job_description = str(job.jobDescription)
        if job.locationRaw:
            existing.location_raw = str(job.locationRaw)
        if job.city:
            existing.city = str(job.city)
        if job.state:
            existing.state = str(job.state)
        if job.stateCode:
            existing.state_code = str(job.stateCode)
        existing.is_remote = job.isRemote
        existing.is_hybrid = job.isHybrid
        if job.salaryMin is not None:
            try:
                existing.salary_min = float(job.salaryMin)
            except (ValueError, TypeError):
                pass
        if job.salaryMax is not None:
            try:
                existing.salary_max = float(job.salaryMax)
            except (ValueError, TypeError):
                pass
        if job.employmentType:
            existing.employment_type = str(job.employmentType)
        if p_date:
            existing.date_posted = p_date
        existing.execution = execution
        existing.detected_restrictions = detect_job_restrictions(
            f"{existing.title} {target_role} {existing.job_description or ''}"
        )
        existing.save()
        return 'updated'

    # 3. Create brand new discovered job
    sal_min = None
    if job.salaryMin is not None:
        try:
            sal_min = float(job.salaryMin)
        except (ValueError, TypeError):
            pass

    sal_max = None
    if job.salaryMax is not None:
        try:
            sal_max = float(job.salaryMax)
        except (ValueError, TypeError):
            pass

    raw_url = str(job.jobUrl).strip() if job.jobUrl else ''
    if raw_url and not (raw_url.startswith('http://') or raw_url.startswith('https://')):
        raw_url = 'https://' + raw_url

    desc_content = str(job.jobDescription) if job.jobDescription else ''
    restrictions = detect_job_restrictions(f"{job.title} {target_role} {desc_content}")

    DiscoveredJob.objects.create(
        job_id=job.jobId,
        content_hash=job.contentHash,
        is_duplicate=is_duplicate,
        canonical_job=canonical_job,
        title=job.title,
        company_name=job.companyName,
        company_name_norm=job.companyNameNorm,
        target_role=target_role,
        job_url=raw_url,
        job_description=desc_content,
        location_raw=str(job.locationRaw) if job.locationRaw else '',
        city=str(job.city) if job.city else '',
        state=str(job.state) if job.state else '',
        state_code=str(job.stateCode) if job.stateCode else '',
        country='USA',
        is_remote=job.isRemote,
        is_hybrid=job.isHybrid,
        salary_min=sal_min,
        salary_max=sal_max,
        salary_currency='USD',
        salary_period=str(job.salaryPeriod) if job.salaryPeriod else '',
        employment_type=str(job.employmentType) if job.employmentType else '',
        source_portal=job.source,
        date_posted=p_date,
        execution=execution,
        review_status='ALREADY_EXISTS' if is_duplicate else 'PENDING_REVIEW',
        detected_restrictions=restrictions,
    )

    return 'duplicate' if is_duplicate else 'inserted'


def execute_scraping_run(execution_id: UUID) -> None:
    """
    Main background worker execution loop.
    Retrieves execution record, loops over configured roles and portals,
    fetches listings, persists via Django ORM, and updates progress in real time.
    """
    try:
        execution = ScraperExecution.objects.get(id=execution_id)
    except ScraperExecution.DoesNotExist:
        logger.error(f"[JobScraper] Execution {execution_id} does not exist.")
        return

    execution.status = 'running'
    execution.started_at = timezone.now()
    execution.save(update_fields=['status', 'started_at'])

    token = (conf.env('APIFY_API_TOKEN') or os.getenv('APIFY_API_TOKEN', '')).strip().replace(' ', '').replace('\t', '')
    config = execution.config or {}
    roles_config = config.get('roles', [])
    sources = config.get('sources', ['linkedin', 'indeed', 'glassdoor', 'dice'])

    if not roles_config:
        execution.status = 'failed'
        execution.error_message = "No roles configured for this scraping run."
        execution.completed_at = timezone.now()
        execution.save(update_fields=['status', 'error_message', 'completed_at'])
        return

    companies = config.get('companies', [])
    query_targets = []
    if companies:
        for r_entry in roles_config:
            r_name = r_entry.get('role', '').strip()
            r_limit = int(r_entry.get('limit', 15))
            if not r_name:
                continue
            for comp in companies:
                c_name = comp if isinstance(comp, str) else comp.get('name', '')
                if c_name:
                    query_targets.append({
                        'role': r_name,
                        'query': f"{r_name} {c_name}",
                        'limit': max(3, r_limit // max(1, len(companies))),
                        'company': c_name,
                    })
    else:
        for r_entry in roles_config:
            r_name = r_entry.get('role', '').strip()
            r_limit = int(r_entry.get('limit', 15))
            if r_name:
                query_targets.append({
                    'role': r_name,
                    'query': r_name,
                    'limit': r_limit,
                    'company': None,
                })

    logger.info(
        f"[JobScraper] Starting execution {execution_id} with {len(roles_config)} role(s) "
        f"and {len(companies)} company target(s) across {sources}"
    )

    total_found = 0
    total_ins = 0
    total_upd = 0
    total_dup = 0
    errors = []

    try:
        for q_target in query_targets:
            role_name = q_target['role']
            search_query = q_target['query']
            role_limit = q_target['limit']

            logger.info(f"[JobScraper] Processing search: '{search_query}' (limit: {role_limit})")

            # Divide limit across sources or search until limit reached
            per_source_limit = max(3, role_limit // max(1, len(sources)))

            for source in sources:
                try:
                    actor_payload = build_actor_input(source, search_query, limit=per_source_limit)
                    if not actor_payload:
                        logger.warning(f"[JobScraper] No actor configuration for source: {source}")
                        continue

                    if not token:
                        logger.warning(f"[JobScraper] APIFY_API_TOKEN is not configured. Skipping live scrape for {source}.")
                        continue

                    actor_id = actor_payload['actorId']
                    inp = actor_payload['input']

                    run = apify.run_actor_detailed(actor_id, inp)
                    raw_items = run.items or []

                    # Record audited cost and API usage
                    try:
                        from ..models import ScraperCostRecord
                        cost_usd = float(run.costUsd) if run.costUsd is not None else 0.0050
                        cost_type = 'ACTUAL' if run.costUsd is not None else 'ESTIMATED'
                        ScraperCostRecord.objects.create(
                            execution=execution,
                            initiated_by=execution.triggered_by,
                            role_name=role_name,
                            source_portal=source,
                            api_calls=1,
                            cost_usd=cost_usd,
                            cost_type=cost_type,
                            provider='Apify',
                            run_id=run.runId or '',
                            items_count=len(raw_items),
                        )
                        execution.total_cost_usd = (execution.total_cost_usd or 0) + cost_usd
                        execution.api_calls_count = (execution.api_calls_count or 0) + 1
                    except Exception as cost_err:
                        logger.warning(f"[JobScraper] Failed to save ScraperCostRecord: {cost_err}")

                    logger.info(f"[JobScraper] Source '{source}' for '{role_name}' returned {len(raw_items)} items.")

                    for raw in raw_items:
                        parsed = parse_job(raw, source)
                        if not parsed:
                            continue

                        if not check_title_matches_any_role(parsed.title, role_name):
                            logger.info(f"[JobScraper] Skipping title '{parsed.title}' not matching role '{role_name}'")
                            continue

                        outcome = upsert_scraped_job(parsed, target_role=role_name, execution=execution)
                        total_found += 1
                        if outcome == 'inserted':
                            total_ins += 1
                        elif outcome == 'updated':
                            total_upd += 1
                        elif outcome == 'duplicate':
                            total_dup += 1

                    # Update execution progress live after each source
                    execution.total_jobs_found = total_found
                    execution.total_inserted = total_ins
                    execution.total_updated = total_upd
                    execution.total_duplicates = total_dup
                    execution.save(update_fields=[
                        'total_jobs_found', 'total_inserted', 'total_updated', 'total_duplicates',
                        'total_cost_usd', 'api_calls_count', 'updated_at'
                    ])

                except Exception as src_err:
                    err_msg = f"Error scraping {source} for {role_name}: {str(src_err)}"
                    logger.error(f"[JobScraper] {err_msg}")
                    errors.append(err_msg)

        # Automatically enrich newly scraped jobs with Visa Intelligence
        try:
            from ..matcher.match_jobs_to_visa import match_jobs_to_visa
            matched_count = match_jobs_to_visa()
            logger.info(f"[JobScraper] Visa matching completed: {matched_count} jobs enriched with Visa Intelligence.")
        except Exception as match_err:
            logger.error(f"[JobScraper] Post-scrape Visa matching error: {str(match_err)}")

        # Post-scrape qualification metrics for Visa-filtered runs
        min_score = int(config.get('minimum_score', 0) or 0)
        qualified_jobs = DiscoveredJob.objects.filter(execution=execution)
        if min_score > 0:
            qualified_jobs = qualified_jobs.filter(visa_friendly_score__gte=min_score)
        qualified_count = qualified_jobs.count()

        execution.config = {
            **config,
            'qualified_count': qualified_count,
            'unqualified_count': max(0, total_found - qualified_count),
        }

        execution.status = 'completed'
        if errors and total_found == 0:
            execution.status = 'failed'
            execution.error_message = "; ".join(errors[:3])
        elif errors:
            execution.error_message = f"Completed with warnings: {'; '.join(errors[:2])}"

        execution.total_jobs_found = total_found
        execution.total_inserted = total_ins
        execution.total_updated = total_upd
        execution.total_duplicates = total_dup
        execution.completed_at = timezone.now()
        execution.save()
        logger.info(f"[JobScraper] Execution {execution_id} completed: found={total_found}, inserted={total_ins}, duplicates={total_dup}")

    except Exception as exec_err:
        logger.exception(f"[JobScraper] Execution {execution_id} crashed:")
        execution.status = 'failed'
        execution.error_message = str(exec_err)
        execution.completed_at = timezone.now()
        execution.save()
    finally:
        from django.db import connection
        connection.close()


def trigger_async_scrape(execution_id: UUID) -> threading.Thread:
    """Dispatches the scraping run into a background daemon thread."""
    thread = threading.Thread(
        target=execute_scraping_run,
        args=(execution_id,),
        daemon=True,
        name=f"JobScraper-{execution_id}"
    )
    thread.start()
    return thread
