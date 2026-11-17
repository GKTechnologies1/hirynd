from django.core.management.base import BaseCommand
from job_discovery.matcher.match_jobs_to_visa import match_jobs_to_visa


class Command(BaseCommand):
    help = "Runs the visa matcher on discovered jobs (tags each job with company visa intelligence and grade)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--rematch-all',
            action='store_true',
            help='Rematches all jobs even if previously matched.',
        )

    def handle(self, *args, **options):
        rematch_all = options['rematch_all']
        self.stdout.write(self.style.NOTICE(f"Running Visa Matcher (rematch_all={rematch_all})..."))
        count = match_jobs_to_visa(rematch_all=rematch_all)
        self.stdout.write(self.style.SUCCESS(f"Successfully matched and enriched {count} jobs with Visa Intelligence."))

