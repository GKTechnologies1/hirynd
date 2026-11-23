import uuid
from django.core.management.base import BaseCommand, CommandError
from job_discovery.models import ScraperExecution
from job_discovery.services.scraper_engine import execute_scraping_run


class Command(BaseCommand):
    help = 'Executes a pre-created ScraperExecution by ID in a detached, independent OS process.'

    def add_arguments(self, parser):
        parser.add_argument(
            'execution_id',
            type=str,
            help='UUID of the ScraperExecution record to process',
        )

    def handle(self, *args, **options):
        raw_id = options['execution_id']
        try:
            exec_uuid = uuid.UUID(str(raw_id).strip())
        except (ValueError, AttributeError) as err:
            raise CommandError(f"Invalid execution UUID '{raw_id}': {err}")

        try:
            execution = ScraperExecution.objects.get(id=exec_uuid)
        except ScraperExecution.DoesNotExist:
            raise CommandError(f"ScraperExecution with ID '{exec_uuid}' does not exist.")

        self.stdout.write(
            self.style.NOTICE(
                f"Starting detached scraping execution {execution.id} "
                f"(trigger: {execution.trigger_type}, total_roles: {execution.total_roles})..."
            )
        )

        execute_scraping_run(execution.id)

        execution.refresh_from_db()
        self.stdout.write(
            self.style.SUCCESS(
                f"Completed execution {execution.id}: Status={execution.status}, "
                f"Found={execution.total_jobs_found}, Inserted={execution.total_inserted}, "
                f"Duplicates={execution.total_duplicates}, Cost=${execution.total_cost_usd or 0:.4f}"
            )
        )
