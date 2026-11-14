from django.core.management.base import BaseCommand
from job_discovery.models import ScraperExecution
from job_discovery.services.scraper_engine import execute_scraping_run


class Command(BaseCommand):
    help = 'Executes a manual job discovery run from CLI.'

    def add_arguments(self, parser):
        parser.add_argument('roles', nargs='+', type=str, help='Role names to scrape, e.g. "Python Developer"')
        parser.add_argument('--limit', type=int, default=10, help='Jobs per role')
        parser.add_argument('--sources', type=str, default='linkedin,indeed,glassdoor,dice', help='Comma-separated sources')

    def handle(self, *args, **options):
        roles = options['roles']
        limit = options['limit']
        sources = [s.strip() for s in options['sources'].split(',') if s.strip()]

        roles_config = [{'role': r, 'limit': limit} for r in roles]

        execution = ScraperExecution.objects.create(
            trigger_type='manual',
            status='pending',
            config={'roles': roles_config, 'sources': sources},
            total_roles=len(roles_config),
        )

        self.stdout.write(self.style.NOTICE(f'Created manual execution {execution.id} for roles: {roles}'))
        execute_scraping_run(execution.id)
        execution.refresh_from_db()
        self.stdout.write(
            self.style.SUCCESS(
                f'Done execution {execution.id}: status={execution.status}, '
                f'found={execution.total_jobs_found}, inserted={execution.total_inserted}, '
                f'duplicates={execution.total_duplicates}'
            )
        )

