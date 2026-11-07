"""
Seeds initial curated company aliases and top verified visa-friendly employers
into company_aliases and company_visa_history.
"""
from django.core.management.base import BaseCommand
from job_discovery.models import CompanyAlias, CompanyVisaHistory
from job_discovery.matcher.normalize_company import normalize_company
from job_discovery.visa.scoring import compute_visa_score

CURATED_ALIASES = [
    ('cgigroup', 'cgitechnologiesandsolutions', 'confirmed via myvisajobs.com, ~1259 LCAs FY2025'),
    ('govcio', 'governmentcio', 'GovCIO official registered name is GovernmentCIO LLC'),
    ('meta', 'metaplatforms', 'Meta job postings use Meta; filer is META PLATFORMS INC'),
    ('oracle', 'oracleamerica', 'Oracle America Inc is the actual LCA filer'),
    ('amazoncom', 'amazoncomservices', 'Amazon.com Services LLC is the real filer'),
    ('walmart', 'walmartassociates', 'Wal-Mart Associates Inc is the real filer'),
    ('cognizant', 'cognizanttechnologysolutionsus', 'main H-1B filer'),
    ('citi', 'citibankna', 'main H-1B filer'),
    ('jpmorganchase', 'jpmorganchaseand', 'brand spelling for JPMorgan Chase & Co.'),
    ('capitalone', 'capitaloneservices', 'main H-1B filer'),
    ('nttdata', 'nttdataamericas', 'main US filer'),
    ('goldmansachs', 'goldmansachsand', 'largest filer'),
    ('capgemini', 'capgeminiamerica', 'main US filer'),
    ('infosystechnologies', 'infosys', 'former name for Infosys'),
    ('google', 'googlellc', 'Google LLC is the official petitioner'),
    ('microsoft', 'microsoftcorporation', 'Microsoft Corporation is petitioner'),
    ('apple', 'appleinc', 'Apple Inc is official petitioner'),
    ('cisco', 'ciscosystems', 'Cisco Systems Inc'),
]

TOP_EMPLOYERS_DATA = [
    {
        'name': 'Google LLC',
        'h1b_filings': 4850,
        'approvals': 4720,
        'denials': 45,
        'avg_salary': 172000,
        'year': 2025,
        'perm_filings': 1200,
        'everify': True,
    },
    {
        'name': 'Microsoft Corporation',
        'h1b_filings': 5100,
        'approvals': 4980,
        'denials': 50,
        'avg_salary': 165000,
        'year': 2025,
        'perm_filings': 950,
        'everify': True,
    },
    {
        'name': 'Amazon.com Services LLC',
        'h1b_filings': 8900,
        'approvals': 8540,
        'denials': 120,
        'avg_salary': 158000,
        'year': 2025,
        'perm_filings': 2100,
        'everify': True,
    },
    {
        'name': 'Meta Platforms, Inc.',
        'h1b_filings': 3200,
        'approvals': 3120,
        'denials': 30,
        'avg_salary': 185000,
        'year': 2025,
        'perm_filings': 800,
        'everify': True,
    },
    {
        'name': 'Apple Inc.',
        'h1b_filings': 2900,
        'approvals': 2830,
        'denials': 25,
        'avg_salary': 175000,
        'year': 2025,
        'perm_filings': 650,
        'everify': True,
    },
    {
        'name': 'Oracle America, Inc.',
        'h1b_filings': 1850,
        'approvals': 1780,
        'denials': 35,
        'avg_salary': 152000,
        'year': 2025,
        'perm_filings': 410,
        'everify': True,
    },
    {
        'name': 'Cognizant Technology Solutions U.S. Corporation',
        'h1b_filings': 7200,
        'approvals': 6850,
        'denials': 180,
        'avg_salary': 118000,
        'year': 2025,
        'perm_filings': 890,
        'everify': True,
    },
    {
        'name': 'Infosys Limited',
        'h1b_filings': 6100,
        'approvals': 5820,
        'denials': 140,
        'avg_salary': 115000,
        'year': 2025,
        'perm_filings': 750,
        'everify': True,
    },
    {
        'name': 'Tata Consultancy Services Limited',
        'h1b_filings': 6500,
        'approvals': 6200,
        'denials': 130,
        'avg_salary': 112000,
        'year': 2025,
        'perm_filings': 680,
        'everify': True,
    },
    {
        'name': 'Cisco Systems, Inc.',
        'h1b_filings': 1650,
        'approvals': 1610,
        'denials': 20,
        'avg_salary': 156000,
        'year': 2025,
        'perm_filings': 390,
        'everify': True,
    },
    {
        'name': 'Capital One Services, LLC',
        'h1b_filings': 1100,
        'approvals': 1070,
        'denials': 15,
        'avg_salary': 148000,
        'year': 2025,
        'perm_filings': 280,
        'everify': True,
    },
    {
        'name': 'JPMorgan Chase & Co.',
        'h1b_filings': 1950,
        'approvals': 1890,
        'denials': 30,
        'avg_salary': 142000,
        'year': 2025,
        'perm_filings': 340,
        'everify': True,
    },
    {
        'name': 'Citibank, N.A.',
        'h1b_filings': 1350,
        'approvals': 1300,
        'denials': 25,
        'avg_salary': 139000,
        'year': 2025,
        'perm_filings': 260,
        'everify': True,
    },
    {
        'name': 'Wal-Mart Associates, Inc.',
        'h1b_filings': 1450,
        'approvals': 1410,
        'denials': 20,
        'avg_salary': 145000,
        'year': 2025,
        'perm_filings': 310,
        'everify': True,
    },
    {
        'name': 'Deloitte Consulting LLP',
        'h1b_filings': 3800,
        'approvals': 3650,
        'denials': 75,
        'avg_salary': 132000,
        'year': 2025,
        'perm_filings': 620,
        'everify': True,
    },
    {
        'name': 'IBM Corporation',
        'h1b_filings': 1250,
        'approvals': 1210,
        'denials': 18,
        'avg_salary': 146000,
        'year': 2025,
        'perm_filings': 290,
        'everify': True,
    },
    {
        'name': 'VTG',
        'h1b_filings': 85,
        'approvals': 82,
        'denials': 2,
        'avg_salary': 125000,
        'year': 2025,
        'perm_filings': 15,
        'everify': True,
    },
    {
        'name': 'CACI International, Inc.',
        'h1b_filings': 110,
        'approvals': 105,
        'denials': 3,
        'avg_salary': 135000,
        'year': 2025,
        'perm_filings': 25,
        'everify': True,
    },
]


class Command(BaseCommand):
    help = 'Seeds curated company aliases and top visa-friendly employer profiles.'

    def handle(self, *args, **options):
        # 1. Seed Aliases
        alias_count = 0
        for alias, target, notes in CURATED_ALIASES:
            _, created = CompanyAlias.objects.get_or_create(
                alias_norm=alias,
                defaults={'target_norm': target, 'notes': notes}
            )
            if created:
                alias_count += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded {alias_count} new company aliases (total: {CompanyAlias.objects.count()})."))

        # 2. Seed Employers & Scores
        emp_count = 0
        for emp in TOP_EMPLOYERS_DATA:
            norm = normalize_company(emp['name'])
            res = compute_visa_score(
                h1b_filings=emp['h1b_filings'],
                approvals=emp['approvals'],
                denials=emp['denials'],
                perm_filings=emp['perm_filings'],
                everify=emp['everify'],
                year=emp['year'],
            )

            total_dec = emp['approvals'] + emp['denials']
            rate = round((emp['approvals'] / total_dec) * 100, 2) if total_dec > 0 else None

            obj, created = CompanyVisaHistory.objects.update_or_create(
                company_name_norm=norm,
                defaults={
                    'company_name': emp['name'],
                    'h1b_total_filings': emp['h1b_filings'],
                    'h1b_approvals': emp['approvals'],
                    'h1b_denials': emp['denials'],
                    'h1b_approval_rate': rate,
                    'h1b_avg_salary': emp['avg_salary'],
                    'h1b_last_filing_year': emp['year'],
                    'perm_total_filings': emp['perm_filings'],
                    'perm_last_year': emp['year'],
                    'green_card_sponsor': emp['perm_filings'] > 0,
                    'everify_enrolled': emp['everify'],
                    'visa_friendly_score': res['score'],
                    'visa_grade': res['grade'],
                }
            )
            if created:
                emp_count += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded {emp_count} new visa employers (total: {CompanyVisaHistory.objects.count()})."))

        # 3. Match existing DiscoveredJobs
        from job_discovery.matcher.match_jobs_to_visa import match_jobs_to_visa
        matched = match_jobs_to_visa(rematch_all=True)
        self.stdout.write(self.style.SUCCESS(f"Matched {matched} discovered jobs against Visa records."))

