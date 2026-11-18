import os
import logging
from datetime import timedelta
from django.utils import timezone
from ..models import ScraperExecution
from .role_provider import get_eligible_roles
from .scraper_engine import execute_scraping_run, trigger_async_scrape

logger = logging.getLogger('job_discovery')


def run_scheduled_job_discovery(force: bool = False, jobs_per_role: int = None, max_roles: int = None) -> ScraperExecution:
    """
    Idempotent daily scheduler runner.
    Ensures only ONE scheduler run occurs per scheduled window.
    Guarantees duplicate prevention across multiple workers or restarts.
    Limits are dynamically loaded from SCRAPER_JOBS_PER_ROLE and SCRAPER_MAX_ROLES env vars.
    """
    now = timezone.now()

    # Load defaults from environment if not explicitly provided
    if jobs_per_role is None:
        raw_jpr = os.getenv('SCRAPER_JOBS_PER_ROLE', os.getenv('SCRAPE_MAX_JOBS_PER_ROLE', '20')).strip()
        jobs_per_role = int(raw_jpr) if raw_jpr.isdigit() else 20

    if max_roles is None:
        raw_mr = os.getenv('SCRAPER_MAX_ROLES', os.getenv('SCRAPE_MAX_ROLES', '')).strip()
        max_roles = int(raw_mr) if (raw_mr.isdigit() and int(raw_mr) > 0) else None

    # 1. Recover stale runs older than 3 hours with full count and cost reconciliation
    stale_cutoff = now - timedelta(hours=3)
    stale_runs = list(ScraperExecution.objects.filter(status='running', started_at__lt=stale_cutoff))
    if stale_runs:
        from django.db.models import Sum
        for sr in stale_runs:
            logger.warning(f"[Scheduler] Marking stale execution {sr.id} as failed.")
            job_count = sr.jobs.count()
            ins_count = sr.jobs.filter(review_status='PENDING_REVIEW').count()
            dup_count = sr.jobs.filter(review_status='ALREADY_EXISTS').count()
            cost_sum = sr.cost_records.aggregate(s=Sum('cost_usd'))['s'] or sr.total_cost_usd or 0
            calls = sr.cost_records.count() or sr.api_calls_count

            sr.status = 'failed'
            sr.error_message = "Timed out or interrupted by process restart."
            sr.completed_at = now
            if job_count > 0:
                sr.total_jobs_found = job_count
                sr.total_inserted = ins_count
                sr.total_duplicates = dup_count
            if cost_sum > 0:
                sr.total_cost_usd = cost_sum
            if calls > 0:
                sr.api_calls_count = calls
            sr.save()

    # 2. Check for an active running execution
    active_run = ScraperExecution.objects.filter(status='running').first()
    if active_run and not force:
        logger.warning(f"[Scheduler] Another scraper execution {active_run.id} is already in progress. Skipping.")
        return active_run

    # 3. Check if a scheduled run already completed recently (within last 6 hours) unless force=True
    recent_cutoff = now - timedelta(hours=6)
    recent_scheduled = ScraperExecution.objects.filter(
        trigger_type='scheduled',
        status='completed',
        completed_at__gte=recent_cutoff
    ).first()

    if recent_scheduled and not force:
        logger.info(f"[Scheduler] Scheduled run already completed recently at {recent_scheduled.completed_at}. Skipping.")
        return recent_scheduled

    # 4. Retrieve eligible roles from Candidate & Hiring database
    eligible_roles = get_eligible_roles(limit=max_roles)
    roles_config = [{'role': r['role'], 'limit': jobs_per_role} for r in eligible_roles]

    if not roles_config:
        logger.warning("[Scheduler] No eligible roles found in the database. Using defaults.")
        roles_config = [
            {'role': 'Software Engineer', 'limit': jobs_per_role},
            {'role': 'Data Engineer', 'limit': jobs_per_role},
            {'role': 'Product Manager', 'limit': jobs_per_role},
        ]

    sources = os.getenv('SCRAPE_SOURCES', 'linkedin,indeed,glassdoor,dice').split(',')
    sources = [s.strip() for s in sources if s.strip()]

    # 5. Create new ScraperExecution record
    execution = ScraperExecution.objects.create(
        trigger_type='scheduled',
        status='pending',
        config={'roles': roles_config, 'sources': sources},
        total_roles=len(roles_config),
    )

    logger.info(f"[Scheduler] Initiated scheduled scraping execution {execution.id} for {len(roles_config)} roles.")

    # 6. Run scraper synchronously or trigger
    execute_scraping_run(execution.id)
    execution.refresh_from_db()
    return execution

