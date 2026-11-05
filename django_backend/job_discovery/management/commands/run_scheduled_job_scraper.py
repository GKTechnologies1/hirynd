from django.core.management.base import BaseCommand
from job_discovery.services.scheduler import run_scheduled_job_discovery


class Command(BaseCommand):
    help = 'Runs the automated daily job discovery scraper for eligible candidate roles.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force scraping even if a recent run completed or another run is recorded as active.',
        )
        parser.add_argument(
            '--jobs-per-role',
            type=int,
            default=15,
            help='Maximum number of jobs to fetch per role (default 15).',
        )
        parser.add_argument(
            '--max-roles',
            type=int,
            default=10,
            help='Maximum number of eligible roles to process (default 10).',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting scheduled job scraper run...'))
        execution = run_scheduled_job_discovery(
            force=options['force'],
            jobs_per_role=options['jobs_per_role'],
            max_roles=options['max_roles'],
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'Finished scraper run {execution.id}: Status={execution.status}, '
                f'Found={execution.total_jobs_found}, Inserted={execution.total_inserted}, '
                f'Duplicates={execution.total_duplicates}'
            )
        )

