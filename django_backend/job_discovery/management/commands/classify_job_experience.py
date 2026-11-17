import logging
from django.core.management.base import BaseCommand
from job_discovery.models import DiscoveredJob
from job_discovery.services.experience_detector import detect_experience_level

logger = logging.getLogger('job_discovery')


class Command(BaseCommand):
    help = "Scans DiscoveredJob records to detect and populate experience_level from job descriptions and titles."

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Re-evaluate jobs that already have experience_level set'
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        qs = DiscoveredJob.objects.all()
        if not force:
            qs = qs.filter(experience_level__isnull=True) | qs.filter(experience_level='')

        total = qs.count()
        self.stdout.write(f"Classifying experience levels for {total} DiscoveredJob records...")

        evaluated_count = 0
        detected_count = 0

        for job in qs.iterator(chunk_size=100):
            exp_level = detect_experience_level(job.job_description, title=job.title)
            if exp_level:
                job.experience_level = exp_level
                job.save(update_fields=['experience_level'])
                detected_count += 1
            evaluated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully evaluated {evaluated_count} jobs. Assigned experience_level to {detected_count} jobs."
            )
        )
