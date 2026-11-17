from django.core.management.base import BaseCommand, CommandError
from job_discovery.models import CompanyAlias, CompanyVisaHistory
from job_discovery.matcher.normalize_company import normalize_company


class Command(BaseCommand):
    help = "Adds a hand-checked brand name -> official filing name mapping in company_aliases."

    def add_arguments(self, parser):
        parser.add_argument('brand_name', type=str, help='Brand name used in job postings')
        parser.add_argument('filing_name', type=str, help='Company legal filing name in Visa DB')
        parser.add_argument('notes', nargs='?', type=str, default='', help='Optional verification notes')

    def handle(self, *args, **options):
        brand = options['brand_name']
        filing = options['filing_name']
        notes = options['notes']

        brand_norm = normalize_company(brand)
        filing_norm = normalize_company(filing)

        if not brand_norm or not filing_norm:
            raise CommandError(f"Normalization produced an empty string: brand='{brand_norm}', filing='{filing_norm}'")

        target = CompanyVisaHistory.objects.filter(company_name_norm=filing_norm).first()
        if not target:
            candidates = list(CompanyVisaHistory.objects.filter(company_name__icontains=filing[:6])[:3])
            candidate_names = [c.company_name for c in candidates]
            raise CommandError(
                f"Target company '{filing}' (normalized: '{filing_norm}') not found in company_visa_history.\n"
                f"Did you mean one of: {candidate_names}?"
            )

        alias_obj, created = CompanyAlias.objects.update_or_create(
            alias_norm=brand_norm,
            defaults={'target_norm': filing_norm, 'notes': notes}
        )

        action = "Created" if created else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} alias: '{brand}' ({brand_norm}) -> '{target.company_name}' ({filing_norm})"
            )
        )

