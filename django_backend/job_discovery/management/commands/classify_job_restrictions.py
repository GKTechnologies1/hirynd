import logging
from django.core.management.base import BaseCommand
from job_discovery.models import DiscoveredJob
from job_discovery.services.restriction_detector import detect_job_restrictions

logger = logging.getLogger('job_discovery')


class Command(BaseCommand):
    help = "Scans all DiscoveredJob records for citizenship, visa, and clearance restrictions and updates detected_restrictions."

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='Re-evaluate jobs that already have detected restrictions')

    def handle(self, *args, **options):
        force = options.get('force', False)
        qs = DiscoveredJob.objects.all()
        if not force:
            qs = qs.filter(detected_restrictions=[])

        total = qs.count()
        self.stdout.write(f"Classifying restrictions for {total} DiscoveredJob records...")

        classified_count = 0
        with_restrictions_count = 0

        for job in qs.iterator(chunk_size=100):
            full_text = f"{job.title} {job.target_role} {job.job_description or ''}"
            restrictions = detect_job_restrictions(full_text)
            job.detected_restrictions = restrictions
            job.save(update_fields=['detected_restrictions'])
            classified_count += 1
            if restrictions:
                with_restrictions_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully evaluated {classified_count} jobs. Found restrictions in {with_restrictions_count} jobs."
            )
        )

