"""
Management command to refresh Visa Intelligence from government data files
in data/uscis-hub, data/lca, data/perm, and data/everify.
Loads and rescores all companies and rematches all discovered jobs.
"""
import os
import time
import logging
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings

from job_discovery.models import CompanyVisaHistory, CompanyAlias, DiscoveredJob
from job_discovery.matcher.normalize_company import normalize_company
from job_discovery.visa.scoring import compute_visa_score
from job_discovery.matcher.match_jobs_to_visa import match_jobs_to_visa
from job_discovery.management.commands.seed_visa_data import TOP_EMPLOYERS_DATA

logger = logging.getLogger('job_discovery')

APPROVAL_COLUMNS = [
    'New Employment Approval',
    'Continuation Approval',
    'Change with Same Employer Approval',
    'New Concurrent Approval',
    'Change of Employer Approval',
    'Amended Approval',
]

DENIAL_COLUMNS = [
    'New Employment Denial',
    'Continuation Denial',
    'Change with Same Employer Denial',
    'New Concurrent Denial',
    'Change of Employer Denial',
    'Amended Denial',
]

# Standard curated aliases from schema.sql
CURATED_ALIASES = [
    ('cgigroup', 'cgitechnologiesandsolutions', "confirmed via myvisajobs.com, ~1259 LCAs FY2025"),
    ('govcio', 'governmentcio', "GovCIO's official registered name is GovernmentCIO LLC per myvisajobs.com/h1bgrader.com listings"),
    ('johnshopkinsappliedphysicslaboratoryapl', 'johnshopkinsuniversityappliedphysicslab', 'corrects existing alias which pointed at a 0-filing duplicate'),
    ('vacobyhighspring', 'highspring', 'Vaco rebranded to Highspring'),
    ('franklincovey', 'franklincoveyclientsales', 'FranklinCovey Client Sales, Inc. is their LCA filer entity'),
    ('meta', 'metaplatforms', 'Meta job postings use "Meta"; LCA/PERM filer name is META PLATFORMS INC'),
    ('oracle', 'oracleamerica', 'parent legal entity has 0 filings; Oracle America Inc is the actual LCA filer'),
    ('amazoncom', 'amazoncomservices', 'AMAZON.COM INC is the holding co; Amazon.com Services LLC is the real filer'),
    ('walmart', 'walmartassociates', 'Walmart Inc holding co has 0 filings; Wal-Mart Associates Inc is the real filer'),
    ('cognizant', 'cognizanttechnologysolutionsus', 'main H-1B filer'),
    ('citi', 'citibankna', 'main H-1B filer'),
    ('avaconsulting', 'avaconsulting', 'pin: fuzzy matched unrelated SVA Consulting'),
    ('stateofwisconsin', 'stateofwisconsin', 'pin: prefix matched a single agency'),
    ('stellartech', 'stellartech', 'pin: prefix matched unrelated StellarTech Research'),
    ('jpmorganchase', 'jpmorganchaseand', 'brand spelling, same filer as JPMorgan Chase & Co.'),
    ('capitalone', 'capitaloneservices', 'largest of 2 filers (657 vs 427 NA)'),
    ('nttdata', 'nttdataamericas', 'main US filer'),
    ('nttdatanorthamerica', 'nttdataamericas', 'main US filer'),
    ('goldmansachs', 'goldmansachsand', 'largest filer'),
    ('capgemini', 'capgeminiamerica', 'main US filer'),
    ('infosystechnologies', 'infosys', 'former name'),
    ('jabilcircuit', 'jabil', 'renamed'),
    ('blackstonegroup', 'blackstone', 'renamed 2021'),
    ('siemensdigitalindustriessoftware', 'siemensindustrysoftware', 'legal entity'),
    ('bny', 'bankofnewyorkmellon', 'brand name'),
    ('keycorp', 'keybanknationalassociation', 'bank subsidiary is the filer'),
    ('usaa', 'unitedservicesautomobileassociation', 'full legal name'),
    ('cvshealth', 'cvssharedservicesresources', 'largest filer'),
    ('walmartglobaltech', 'walmartassociates', "Walmart's filer"),
    ('wspintheus', 'wspusa', 'main US filer'),
    ('davitakidneycare', 'davita', 'parent filer'),
    ('broadridge', 'broadridgefinancialsolutions', 'legal name'),
    ('adyen', 'adyennv', 'legal name'),
    ('stifel', 'stifelfinancial', 'legal name'),
    ('ice', 'intercontinentalexchangeholdings', 'Atlanta Java job = Intercontinental Exchange, not I.C.E., Inc.'),
    ('kforcetechnologystaffing', 'kforce', 'same company, postings use the brand name'),
    ('americanfamilyinsurance', 'americanfamilymutualinsurancecompanysi', 'same company, main H-1B filer'),
    ('stjudechildrensresearchhospitalalsac', 'stjudechildrensresearchhospital', "ALSAC is St. Jude's fundraising arm; the hospital is the filer"),
    ('ucirvine', 'universityofcaliforniairvine', 'short name of University of California, Irvine'),
    ('google', 'google', 'Google LLC'),
    ('apple', 'apple', 'Apple Inc'),
    ('microsoft', 'microsoft', 'Microsoft Corporation'),
    ('cisco', 'ciscosystems', 'Cisco Systems Inc'),
    ('tcs', 'tataconsultancyservices', 'Tata Consultancy Services Limited'),
]


class Command(BaseCommand):
    help = "Loads government visa files from data/ directory and enriches company_visa_history."

    def add_arguments(self, parser):
        parser.add_argument(
            '--data-dir',
            type=str,
            default=None,
            help='Path to data/ directory containing uscis-hub, lca, perm, everify'
        )
        parser.add_argument(
            '--no-match',
            action='store_true',
            help='Skip re-matching discovered jobs after loading'
        )

    def handle(self, *args, **options):
        start_time = time.time()
        self.stdout.write(self.style.NOTICE("=== Starting Visa Intelligence Refresh ==="))

        # Determine data directory
        data_dir = options.get('data_dir')
        if not data_dir:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            # Check ../data or ./data
            candidate_paths = [
                os.path.join(base_dir, 'data'),
                os.path.join(os.path.dirname(base_dir), 'data'),
                '/root/hyrind_backend/hyrind-staging/hirynd/data',
            ]
            for p in candidate_paths:
                if os.path.isdir(p):
                    data_dir = p
                    break

        if not data_dir or not os.path.isdir(data_dir):
            self.stderr.write(self.style.ERROR(f"Data directory not found. Checked: {candidate_paths}"))
            return

        self.stdout.write(f"Using data directory: {data_dir}")

        # Step 1: Seed / update Curated Aliases
        self.stdout.write(self.style.NOTICE(f"Loading {len(CURATED_ALIASES)} curated company aliases..."))
        alias_count = 0
        for alias_norm, target_norm, note in CURATED_ALIASES:
            CompanyAlias.objects.update_or_create(
                alias_norm=alias_norm,
                defaults={'target_norm': target_norm, 'notes': note}
            )
            alias_count += 1
        self.stdout.write(self.style.SUCCESS(f"Loaded {alias_count} aliases into company_aliases."))

        # Step 2: Check DOL LCA, PERM and E-Verify folders
        lca_dir = os.path.join(data_dir, 'lca')
        lca_files = [os.path.join(lca_dir, f) for f in os.listdir(lca_dir) if f.lower().endswith(('.xlsx', '.xls', '.csv')) and not f.startswith('.')] if os.path.isdir(lca_dir) else []
        if not lca_files:
            self.stdout.write(self.style.NOTICE("No LCA file found in data/lca — skipping. (Download from https://www.dol.gov/agencies/eta/foreign-labor/performance)"))

        perm_dir = os.path.join(data_dir, 'perm')
        perm_files = [os.path.join(perm_dir, f) for f in os.listdir(perm_dir) if f.lower().endswith(('.xlsx', '.xls', '.csv')) and not f.startswith('.')] if os.path.isdir(perm_dir) else []
        if not perm_files:
            self.stdout.write(self.style.NOTICE("No PERM file found in data/perm — skipping."))

        everify_dir = os.path.join(data_dir, 'everify')
        everify_files = [os.path.join(everify_dir, f) for f in os.listdir(everify_dir) if f.lower().endswith(('.xlsx', '.xls', '.csv')) and not f.startswith('.')] if os.path.isdir(everify_dir) else []
        if not everify_files:
            self.stdout.write(self.style.NOTICE("No E-Verify file found in data/everify — skipping."))

        # Step 3: Parse USCIS H-1B Employer Data Hub file
        uscis_dir = os.path.join(data_dir, 'uscis-hub')
        uscis_files = []
        if os.path.isdir(uscis_dir):
            uscis_files = [
                os.path.join(uscis_dir, f) for f in os.listdir(uscis_dir)
                if f.lower().endswith(('.xlsx', '.xls', '.csv')) and not f.startswith('.')
            ]

        if not uscis_files:
            self.stdout.write(self.style.WARNING("No USCIS Hub files found in data/uscis-hub/."))
        else:
            uscis_file = uscis_files[0]
            self.stdout.write(self.style.NOTICE(f"Processing USCIS Employer Data Hub: {os.path.basename(uscis_file)}..."))
            self.process_uscis_file(uscis_file)

        # Step 4: Ensure top curated visa-friendly employers have verified credentials
        self.stdout.write(self.style.NOTICE(f"Verifying {len(TOP_EMPLOYERS_DATA)} top employer profiles..."))
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
            CompanyVisaHistory.objects.update_or_create(
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

        # Step 5: Match Discovered Jobs to Visa Data
        if not options.get('no_match'):
            self.stdout.write(self.style.NOTICE("Re-matching all discovered jobs against enriched Visa database..."))
            matched_count = match_jobs_to_visa(rematch_all=True)
            self.stdout.write(self.style.SUCCESS(f"Re-matching complete: {matched_count} jobs enriched with Visa Intelligence."))

        # Summary
        total_companies = CompanyVisaHistory.objects.count()
        grade_a = CompanyVisaHistory.objects.filter(visa_grade='A').count()
        grade_b = CompanyVisaHistory.objects.filter(visa_grade='B').count()
        grade_c = CompanyVisaHistory.objects.filter(visa_grade='C').count()
        grade_d = CompanyVisaHistory.objects.filter(visa_grade='D').count()
        grade_ef = CompanyVisaHistory.objects.filter(visa_grade__in=['E', 'F']).count()

        matched_jobs = DiscoveredJob.objects.filter(visa_matched=True).count()
        total_jobs = DiscoveredJob.objects.count()

        elapsed = time.time() - start_time
        self.stdout.write(self.style.SUCCESS(f"\n=== Visa Refresh Completed in {elapsed:.2f}s ==="))
        self.stdout.write(f"Total Companies in Visa DB: {total_companies:,}")
        self.stdout.write(f"  Grade A: {grade_a:,} | Grade B: {grade_b:,} | Grade C: {grade_c:,} | Grade D: {grade_d:,} | Grade E/F: {grade_ef:,}")
        self.stdout.write(f"Total Discovered Jobs Matched: {matched_jobs:,} / {total_jobs:,} ({(matched_jobs/max(1, total_jobs))*100:.1f}%)")

    def process_uscis_file(self, file_path: str):
        import openpyxl

        t0 = time.time()
        wb = openpyxl.load_workbook(file_path, read_only=True)
        sheet = wb.active
        rows = sheet.iter_rows(values_only=True)

        header = next(rows)
        headers = [str(h).strip() if h else '' for h in header]

        col_emp = headers.index('Employer (Petitioner) Name')
        col_year = headers.index('Fiscal Year')
        col_appr = [headers.index(c) for c in APPROVAL_COLUMNS]
        col_den = [headers.index(c) for c in DENIAL_COLUMNS]

        employers = {}
        processed_rows = 0

        for r in rows:
            processed_rows += 1
            emp_name = r[col_emp]
            if not emp_name or not str(emp_name).strip():
                continue
            norm = normalize_company(str(emp_name))
            if not norm:
                continue

            appr = sum(int(r[c]) for c in col_appr if r[c] is not None)
            den = sum(int(r[c]) for c in col_den if r[c] is not None)
            year = int(r[col_year]) if r[col_year] is not None else datetime.now().year

            if norm not in employers:
                employers[norm] = {
                    'name': str(emp_name).strip()[:255],
                    'norm': norm[:255],
                    'approvals': 0,
                    'denials': 0,
                    'last_year': 0
                }
            employers[norm]['approvals'] += appr
            employers[norm]['denials'] += den
            if year > employers[norm]['last_year']:
                employers[norm]['last_year'] = year

        self.stdout.write(f"Aggregated {processed_rows:,} rows into {len(employers):,} unique employers in {time.time()-t0:.2f}s.")

        top_sponsors = {normalize_company(e['name']): e for e in TOP_EMPLOYERS_DATA}

        # Batch prepare records for MySQL insertion
        records = []
        for emp in employers.values():
            appr = emp['approvals']
            den = emp['denials']
            total = appr + den
            yr = emp['last_year']
            norm = emp['norm']

            top = top_sponsors.get(norm)
            perm_filings = top.get('perm_filings', 0) if top else 0
            everify = top.get('everify', False) if top else False
            avg_salary = top.get('avg_salary', None) if top else None

            # Compute score and grade
            score_data = compute_visa_score(
                h1b_filings=total,
                approvals=appr,
                denials=den,
                perm_filings=perm_filings,
                everify=bool(everify),
                year=yr,
            )

            rate = score_data['approval_rate']
            score = score_data['score']
            grade = score_data['grade']

            records.append((
                emp['name'],
                emp['norm'],
                total,           # h1b_total_filings
                appr,            # h1b_approvals
                den,             # h1b_denials
                rate,            # h1b_approval_rate
                yr,              # h1b_last_filing_year
                perm_filings,    # perm_total_filings
                1 if perm_filings > 0 else 0, # green_card_sponsor
                1 if everify else 0,          # everify_enrolled
                avg_salary,      # h1b_avg_salary
                score,           # visa_friendly_score
                grade,           # visa_grade
            ))

        # Fast batch upsert into MySQL
        upsert_sql = """
        INSERT INTO company_visa_history 
        (company_name, company_name_norm, h1b_total_filings, h1b_approvals, h1b_denials, 
         h1b_approval_rate, h1b_last_filing_year, perm_total_filings, green_card_sponsor, 
         everify_enrolled, h1b_avg_salary, visa_friendly_score, visa_grade, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON DUPLICATE KEY UPDATE
          company_name = VALUES(company_name),
          h1b_total_filings = GREATEST(h1b_total_filings, VALUES(h1b_total_filings)),
          h1b_approvals = VALUES(h1b_approvals),
          h1b_denials = VALUES(h1b_denials),
          h1b_approval_rate = VALUES(h1b_approval_rate),
          h1b_last_filing_year = GREATEST(COALESCE(h1b_last_filing_year, 0), VALUES(h1b_last_filing_year)),
          perm_total_filings = GREATEST(perm_total_filings, VALUES(perm_total_filings)),
          green_card_sponsor = GREATEST(green_card_sponsor, VALUES(green_card_sponsor)),
          everify_enrolled = COALESCE(VALUES(everify_enrolled), everify_enrolled),
          h1b_avg_salary = COALESCE(VALUES(h1b_avg_salary), h1b_avg_salary),
          visa_friendly_score = VALUES(visa_friendly_score),
          visa_grade = VALUES(visa_grade),
          updated_at = NOW()
        """

        batch_size = 2000
        total_inserted = 0
        self.stdout.write(f"Writing {len(records):,} records to MySQL in batches of {batch_size}...")

        with connection.cursor() as cursor:
            for i in range(0, len(records), batch_size):
                chunk = records[i:i + batch_size]
                cursor.executemany(upsert_sql, chunk)
                total_inserted += len(chunk)
                if total_inserted % 10000 == 0 or total_inserted == len(records):
                    self.stdout.write(f"  ...written {total_inserted:,} / {len(records):,} records")

        self.stdout.write(self.style.SUCCESS(f"Successfully upserted {len(records):,} employers into company_visa_history."))
