import os
import sys
import time
import signal
import logging
import threading
import subprocess
import concurrent.futures
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
from django.utils import timezone
from django.db import transaction, IntegrityError
from django.db.models import Q
from django.conf import settings

from ..models import ScraperExecution, DiscoveredJob, ScraperCostRecord
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


def build_actor_input(source: str, query: str, limit: int = 15, freshness_days: int = 7, sites: Optional[List[str]] = None) -> Optional[Dict[str, Any]]:
    """Builds the input JSON for the specific Apify actor."""
    actor_id = get_actor_for_source(source)
    if not actor_id:
        return None

    if source in SUPPORTED_SITES:
        effective_sites = sites if sites else [source]
        scaled_max_results = min(max(limit * len(effective_sites), limit), 100)
        return {
            'actorId': actor_id,
            'input': {
                'searchTerm': query,
                'location': 'United States',
                'sites': effective_sites,
                'maxResults': scaled_max_results,
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


def _clean_job_employment_type(emp_type_raw: str, is_hybrid: bool = False) -> str:
    """
    Standardizes employment type strictly to: Full-Time, Part-Time, Internship, Contract.
    Never returns Hyrind, Hybrid, or Remote as an employment type (hybrid/remote belong to work mode).
    """
    s = str(emp_type_raw or '').strip()
    s_low = s.lower()
    if 'contract' in s_low or 'c2c' in s_low or 'corp' in s_low or 'temp' in s_low:
        return 'Contract'
    if 'part' in s_low:
        return 'Part-Time'
    if 'intern' in s_low:
        return 'Internship'
    if 'full' in s_low:
        return 'Full-Time'
    return 'Full-Time'


def upsert_scraped_job(job: NormalizedJob, target_role: str, execution: ScraperExecution) -> str:
    """
    Persists a NormalizedJob into DiscoveredJob using Django ORM.
    Multi-tier deduplication:
      Tier 1: External job ID (job_id) -> Update existing record
      Tier 2: Canonical application URL (job_url) -> Duplicate detection
      Tier 3: Content hash (MD5 title + company + clean description) -> Duplicate detection
      Tier 4: Normalized company + exact title -> Duplicate detection
    Returns: 'inserted', 'updated', or 'duplicate'
    Thread-safe: catches concurrent IntegrityError on duplicate job_id inserts.
    """
    p_date = job.postingDate
    if p_date:
        if getattr(settings, 'USE_TZ', False):
            if timezone.is_naive(p_date):
                p_date = timezone.make_aware(p_date)
        else:
            if timezone.is_aware(p_date):
                p_date = timezone.make_naive(p_date)

    from .restriction_detector import detect_job_restrictions
    from .experience_detector import detect_job_experience

    # Tier 1: Check if this exact job_id was already saved
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
            existing.employment_type = _clean_job_employment_type(job.employmentType, existing.is_hybrid or job.isHybrid)
        if p_date:
            existing.date_posted = p_date
        existing.execution = execution
        existing.detected_restrictions = detect_job_restrictions(
            f"{existing.title} {target_role} {existing.job_description or ''}"
        )
        exp_res = detect_job_experience(existing.job_description, title=existing.title)
        if exp_res:
            existing.experience_level = exp_res.get('level') or existing.experience_level
            existing.experience_min_years = exp_res.get('min_years')
            existing.experience_max_years = exp_res.get('max_years')
            existing.experience_raw = exp_res.get('matched_phrase') or ''
        existing.save()
        return 'updated'

    # Multi-tier deduplication check against existing records
    raw_url = str(job.jobUrl).strip() if job.jobUrl else ''
    if raw_url and not (raw_url.startswith('http://') or raw_url.startswith('https://')):
        raw_url = 'https://' + raw_url

    canonical_job = None
    # Tier 2: Check by canonical application URL (handling trailing slash differences)
    if raw_url and len(raw_url) > 10:
        url_stripped = raw_url.rstrip('/')
        canonical_job = DiscoveredJob.objects.filter(
            Q(job_url=raw_url) | Q(job_url=url_stripped) | Q(job_url=f"{url_stripped}/")
        ).first()

    # Tier 3: Check by content_hash across different jobs/portals
    if not canonical_job and job.contentHash:
        canonical_job = DiscoveredJob.objects.filter(content_hash=job.contentHash).first()

    # Tier 4: Check by normalized company or company name + exact title
    if not canonical_job and job.title and (job.companyNameNorm or job.companyName):
        comp_norm = job.companyNameNorm or job.companyName.lower().strip()
        canonical_job = DiscoveredJob.objects.filter(
            Q(company_name_norm__iexact=comp_norm) | Q(company_name__iexact=job.companyName),
            title__iexact=job.title.strip()
        ).first()

    if canonical_job and canonical_job.is_duplicate and canonical_job.canonical_job:
        canonical_job = canonical_job.canonical_job

    is_duplicate = canonical_job is not None

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

    desc_content = str(job.jobDescription) if job.jobDescription else ''
    restrictions = detect_job_restrictions(f"{job.title} {target_role} {desc_content}")
    exp_res = detect_job_experience(desc_content, title=job.title)
    exp_lvl = exp_res.get('level') if exp_res else None
    exp_min = exp_res.get('min_years') if exp_res else None
    exp_max = exp_res.get('max_years') if exp_res else None
    exp_raw = exp_res.get('matched_phrase') if exp_res else ''

    try:
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
            employment_type=_clean_job_employment_type(job.employmentType, job.isHybrid),
            experience_level=exp_lvl,
            experience_min_years=exp_min,
            experience_max_years=exp_max,
            experience_raw=exp_raw,
            source_portal=job.source,
            date_posted=p_date,
            execution=execution,
            review_status='ALREADY_EXISTS' if is_duplicate else 'PENDING_REVIEW',
            detected_restrictions=restrictions,
        )
        return 'duplicate' if is_duplicate else 'inserted'
    except IntegrityError:
        # Concurrent worker inserted this job_id in parallel; fall back to update
        existing = DiscoveredJob.objects.filter(job_id=job.jobId).first()
        if existing:
            existing.execution = execution
            existing.save(update_fields=['execution'])
            return 'updated'
        return 'duplicate'


def is_execution_alive(execution: ScraperExecution) -> bool:
    """
    Checks if an OS process or Python thread is actively working on the given execution.
    Inspects in-process daemon threads and host /proc cmdlines without shell subprocess overhead.
    """
    exec_id_str = str(execution.id)

    # 1. Check in-process threads
    for t in threading.enumerate():
        if t.name == f"JobScraper-{exec_id_str}" and t.is_alive():
            return True

    # 2. Check host OS processes via /proc
    pattern = 'run_scheduled_job_scraper' if execution.trigger_type == 'scheduled' else exec_id_str
    current_pid = str(os.getpid())
    try:
        if os.path.exists('/proc'):
            for pid in os.listdir('/proc'):
                if not pid.isdigit() or pid == current_pid:
                    continue
                try:
                    with open(f'/proc/{pid}/cmdline', 'rb') as f:
                        cmd = f.read().decode('utf-8', errors='ignore').replace('\x00', ' ')
                        if pattern in cmd:
                            return True
                except (FileNotFoundError, PermissionError, ProcessLookupError):
                    continue
    except Exception as err:
        logger.debug(f"[JobScraper] Error checking process liveness for execution {execution.id}: {err}")

    return False


def kill_execution_process(execution: ScraperExecution) -> bool:
    """
    Terminates any host OS process running for this execution (e.g. upon user cancel).
    Returns True if a matching process was signaled.
    """
    exec_id_str = str(execution.id)
    pattern = 'run_scheduled_job_scraper' if execution.trigger_type == 'scheduled' else exec_id_str
    current_pid = str(os.getpid())
    signaled = False

    try:
        if os.path.exists('/proc'):
            for pid in os.listdir('/proc'):
                if not pid.isdigit() or pid == current_pid:
                    continue
                try:
                    with open(f'/proc/{pid}/cmdline', 'rb') as f:
                        cmd = f.read().decode('utf-8', errors='ignore').replace('\x00', ' ')
                        if pattern in cmd:
                            os.kill(int(pid), signal.SIGTERM)
                            signaled = True
                            logger.info(f"[JobScraper] Sent SIGTERM to PID {pid} for execution {execution.id}")
                except (FileNotFoundError, PermissionError, ProcessLookupError):
                    continue
    except Exception as err:
        logger.warning(f"[JobScraper] Error signaling process for execution {execution.id}: {err}")

    return signaled


def execute_scraping_run(execution_id: UUID) -> None:
    """
    Main background worker execution loop.
    Retrieves execution record, loops over configured roles concurrently via ThreadPoolExecutor,
    fetches listings from Apify, persists via Django ORM, and updates progress in real time.
    """
    try:
        execution = ScraperExecution.objects.get(id=execution_id)
    except ScraperExecution.DoesNotExist:
        logger.error(f"[JobScraper] Execution {execution_id} does not exist.")
        return

    execution.status = 'running'
    execution.started_at = timezone.now()
    execution.save(update_fields=['status', 'started_at'])

    raw_tok = conf.env('APIFY_API_TOKEN') or os.getenv('APIFY_API_TOKEN', '')
    token = getattr(conf, 'sanitize_token', lambda v: v)(raw_tok) if raw_tok else None
    if not token and raw_tok:
        token = raw_tok.strip().strip('"\'').replace(' ', '').replace('\t', '').replace('\r', '').replace('\n', '')

    masked_tok = f"{token[:8]}...{token[-4:]} (len: {len(token)})" if token else "NOT CONFIGURED"
    logger.info(f"[JobScraper] Apify token status: {masked_tok}")

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
    roles_breakdown = {}
    if companies:
        for r_entry in roles_config:
            r_name = r_entry.get('role', '').strip()
            r_limit = int(r_entry.get('limit', 20))
            if not r_name:
                continue
            roles_breakdown[r_name] = {
                'role': r_name,
                'target': r_limit,
                'found': 0,
                'inserted': 0,
                'duplicates': 0,
                'updated': 0,
                'failed': 0,
            }
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
            r_limit = int(r_entry.get('limit', 20))
            if r_name:
                roles_breakdown[r_name] = {
                    'role': r_name,
                    'target': r_limit,
                    'found': 0,
                    'inserted': 0,
                    'duplicates': 0,
                    'updated': 0,
                    'failed': 0,
                }
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

    stats_lock = threading.Lock()
    totals = {
        'found': 0,
        'inserted': 0,
        'updated': 0,
        'duplicates': 0,
        'cost': float(execution.total_cost_usd or 0.0),
        'calls': int(execution.api_calls_count or 0),
    }
    errors = []
    last_db_save = [time.time()]

    def _process_target(q_target: Dict[str, Any]) -> None:
        """Worker function for processing a single role/company query target."""
        role_name = q_target['role']
        search_query = q_target['query']
        role_limit = q_target['limit']

        with stats_lock:
            role_stat = roles_breakdown.setdefault(role_name, {
                'role': role_name,
                'target': role_limit,
                'found': 0,
                'inserted': 0,
                'duplicates': 0,
                'updated': 0,
                'failed': 0,
            })
            if role_stat['inserted'] >= role_limit:
                logger.info(f"[JobScraper] Target {role_limit} new unique jobs already met for '{role_name}'. Skipping.")
                return

        logger.info(
            f"[JobScraper] Processing search: '{search_query}' "
            f"(target new unique: {role_limit}, current inserted: {role_stat['inserted']})"
        )

        try:
            remaining_needed = max(1, role_limit - role_stat['inserted'])
            per_source_limit = max(5, remaining_needed)

            # Group multi-board supported portals into a combined call to avoid separate Apify runs
            supported_in_sources = [s for s in sources if s in SUPPORTED_SITES]
            other_sources = [s for s in sources if s not in SUPPORTED_SITES]

            source_passes = []
            if supported_in_sources:
                source_passes.append({
                    'lead_source': supported_in_sources[0],
                    'display_source': ', '.join(supported_in_sources),
                    'sites': supported_in_sources,
                })
            for s in other_sources:
                source_passes.append({
                    'lead_source': s,
                    'display_source': s,
                    'sites': [s],
                })

            for spass in source_passes:
                with stats_lock:
                    if role_stat['inserted'] >= role_limit:
                        logger.info(f"[JobScraper] Reached target {role_limit} new unique jobs for '{role_name}'.")
                        break

                lead_src = spass['lead_source']
                display_src = spass['display_source']
                sites_list = spass['sites']

                try:
                    actor_payload = build_actor_input(lead_src, search_query, limit=per_source_limit, sites=sites_list)
                    if not actor_payload:
                        logger.warning(f"[JobScraper] No actor configuration for source: {display_src}")
                        continue

                    if not token:
                        err_msg = "APIFY_API_TOKEN is not configured in the server environment."
                        logger.error(f"[JobScraper] {err_msg}")
                        with stats_lock:
                            errors.append(f"{display_src}: {err_msg}")
                        continue

                    if not token.startswith('apify_api_'):
                        err_msg = f"Invalid APIFY_API_TOKEN configured (starts with '{token[:10]}', expected 'apify_api_...')."
                        logger.error(f"[JobScraper] {err_msg}")
                        with stats_lock:
                            errors.append(f"{display_src}: {err_msg}")
                        continue

                    actor_id = actor_payload['actorId']
                    inp = actor_payload['input']

                    run = apify.run_actor_detailed(actor_id, inp)
                    raw_items = run.items or []

                    # Record audited cost and API usage
                    cost_usd = float(run.costUsd) if run.costUsd is not None else 0.0050
                    try:
                        cost_type = 'ACTUAL' if run.costUsd is not None else 'ESTIMATED'
                        ScraperCostRecord.objects.create(
                            execution_id=execution_id,
                            initiated_by_id=execution.triggered_by_id,
                            role_name=role_name,
                            source_portal=display_src[:50],
                            api_calls=1,
                            cost_usd=cost_usd,
                            cost_type=cost_type,
                            provider='Apify',
                            run_id=run.runId or '',
                            items_count=len(raw_items),
                        )
                    except Exception as cost_err:
                        logger.warning(f"[JobScraper] Failed to save ScraperCostRecord: {cost_err}")

                    logger.info(f"[JobScraper] Source '{display_src}' for '{role_name}' returned {len(raw_items)} items.")

                    for raw in raw_items:
                        parsed = parse_job(raw, lead_src)
                        if not parsed:
                            continue

                        if not check_title_matches_any_role(parsed.title, role_name):
                            logger.info(f"[JobScraper] Skipping title '{parsed.title}' not matching role '{role_name}'")
                            continue

                        outcome = upsert_scraped_job(parsed, target_role=role_name, execution=execution)

                        with stats_lock:
                            totals['found'] += 1
                            role_stat['found'] += 1
                            if outcome == 'inserted':
                                totals['inserted'] += 1
                                role_stat['inserted'] += 1
                            elif outcome == 'updated':
                                totals['updated'] += 1
                                role_stat['updated'] += 1
                            elif outcome == 'duplicate':
                                totals['duplicates'] += 1
                                role_stat['duplicates'] += 1

                            if role_stat['inserted'] >= role_limit:
                                logger.info(f"[JobScraper] Reached target {role_limit} new unique jobs for '{role_name}' during {display_src} ingestion.")
                                break

                    with stats_lock:
                        totals['cost'] += cost_usd
                        totals['calls'] += 1
                        now_ts = time.time()
                        # Throttle live progress updates to database to once every 3 seconds
                        if now_ts - last_db_save[0] > 3.0:
                            last_db_save[0] = now_ts
                            ScraperExecution.objects.filter(id=execution_id).update(
                                total_jobs_found=totals['found'],
                                total_inserted=totals['inserted'],
                                total_updated=totals['updated'],
                                total_duplicates=totals['duplicates'],
                                total_cost_usd=totals['cost'],
                                api_calls_count=totals['calls'],
                                updated_at=timezone.now(),
                            )

                except Exception as src_err:
                    err_msg = f"Error scraping {display_src} for {role_name}: {str(src_err)}"
                    logger.error(f"[JobScraper] {err_msg}")
                    with stats_lock:
                        role_stat['failed'] += 1
                        errors.append(err_msg)

        finally:
            # Cleanly close thread-local MySQL connection
            from django.db import connection
            connection.close()

    try:
        # Determine concurrency (default 4 workers, bounded between 1 and 6)
        raw_concurrency = os.getenv('SCRAPER_CONCURRENCY', '4').strip()
        parsed_concurrency = int(raw_concurrency) if raw_concurrency.isdigit() else 4
        concurrency = min(max(1, parsed_concurrency), 6)
        worker_count = min(concurrency, len(query_targets)) if query_targets else 1

        logger.info(
            f"[JobScraper] Running execution {execution_id} with {worker_count} concurrent worker(s) "
            f"across {len(query_targets)} target(s)..."
        )

        with concurrent.futures.ThreadPoolExecutor(max_workers=worker_count, thread_name_prefix="ScraperWorker") as executor:
            futures = {executor.submit(_process_target, qt): qt for qt in query_targets}
            for future in concurrent.futures.as_completed(futures):
                qt = futures[future]
                try:
                    future.result()
                except Exception as exc:
                    err_msg = f"Target '{qt.get('role')}' error: {exc}"
                    logger.exception(f"[JobScraper] {err_msg}")
                    with stats_lock:
                        errors.append(err_msg)

        # Automatically enrich newly scraped jobs with Visa Intelligence
        try:
            from ..matcher.match_jobs_to_visa import match_jobs_to_visa
            new_job_ids = list(
                DiscoveredJob.objects.filter(execution_id=execution_id, visa_matched=False).values_list('id', flat=True)
            )
            if new_job_ids:
                matched_count = match_jobs_to_visa(job_ids=[str(jid) for jid in new_job_ids])
                logger.info(f"[JobScraper] Visa matching completed: {matched_count} jobs enriched with Visa Intelligence.")
            else:
                logger.info("[JobScraper] No new unmatched jobs requiring Visa Intelligence matching.")
        except Exception as match_err:
            logger.error(f"[JobScraper] Post-scrape Visa matching error: {str(match_err)}")

        # Post-scrape qualification metrics for Visa-filtered runs
        min_score = int(config.get('minimum_score', 0) or 0)
        all_jobs = DiscoveredJob.objects.filter(execution_id=execution_id)
        total_db_jobs = all_jobs.count()
        scored_jobs = all_jobs.filter(visa_friendly_score__gt=0)
        scored_count = scored_jobs.count()
        if min_score > 0:
            qualified_count = scored_jobs.filter(visa_friendly_score__gte=min_score).count()
            below_threshold_count = scored_jobs.filter(visa_friendly_score__lt=min_score).count()
        else:
            qualified_count = scored_count
            below_threshold_count = 0
        unscored_count = max(0, total_db_jobs - scored_count)

        execution.config = {
            **config,
            'roles_breakdown': list(roles_breakdown.values()),
            'scored_count': scored_count,
            'qualified_count': qualified_count,
            'below_threshold_count': below_threshold_count,
            'unscored_count': unscored_count,
            'unqualified_count': below_threshold_count,
        }

        execution.status = 'completed'
        if errors and totals['found'] == 0:
            execution.status = 'failed'
            execution.error_message = "; ".join(errors[:3])
        elif errors:
            execution.error_message = f"Completed with warnings: {'; '.join(errors[:2])}"

        execution.total_jobs_found = totals['found']
        execution.total_inserted = totals['inserted']
        execution.total_updated = totals['updated']
        execution.total_duplicates = totals['duplicates']
        execution.total_cost_usd = totals['cost']
        execution.api_calls_count = totals['calls']
        execution.completed_at = timezone.now()
        execution.save()
        logger.info(
            f"[JobScraper] Execution {execution_id} completed: "
            f"found={totals['found']}, inserted={totals['inserted']}, duplicates={totals['duplicates']}, "
            f"cost=${totals['cost']:.4f}, calls={totals['calls']}"
        )

    except Exception as exec_err:
        logger.exception(f"[JobScraper] Execution {execution_id} crashed:")
        execution.status = 'failed'
        execution.error_message = str(exec_err)
        execution.completed_at = timezone.now()
        execution.save()
    finally:
        from django.db import connection
        connection.close()


def trigger_async_scrape(execution_id: UUID) -> Any:
    """
    Dispatches the scraping run into a detached OS process via Django management command.
    Using start_new_session=True decouples the process from Gunicorn worker lifecycles,
    preventing premature thread termination when Gunicorn recycles workers (--max-requests).
    Falls back gracefully to a daemon thread if process spawning fails.
    """
    python_bin = sys.executable
    manage_py = os.path.join(settings.BASE_DIR, 'manage.py')
    log_dir = os.path.join(settings.BASE_DIR, 'logs')
    try:
        os.makedirs(log_dir, exist_ok=True)
    except Exception:
        log_dir = '/tmp'

    log_path = os.path.join(log_dir, f'scraper_exec_{execution_id}.log')

    try:
        log_out = open(log_path, 'a')
        proc = subprocess.Popen(
            [python_bin, manage_py, 'run_scraper_execution', str(execution_id)],
            stdout=log_out,
            stderr=subprocess.STDOUT,
            start_new_session=True,
            close_fds=True,
        )
        logger.info(f"[JobScraper] Spawned detached scraper process PID {proc.pid} for execution {execution_id} (log: {log_path})")
        return proc
    except Exception as spawn_err:
        logger.warning(
            f"[JobScraper] Could not spawn detached subprocess for {execution_id}: {spawn_err}. "
            f"Falling back to daemon thread."
        )
        thread = threading.Thread(
            target=execute_scraping_run,
            args=(execution_id,),
            daemon=True,
            name=f"JobScraper-{execution_id}"
        )
        thread.start()
        return thread
