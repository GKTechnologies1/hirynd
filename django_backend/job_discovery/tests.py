import uuid
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone as dt_timezone
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from job_discovery.models import ScraperExecution, DiscoveredJob, CompanyVisaHistory, CompanyAlias
from job_discovery.scraper.job_parser import NormalizedJob
from job_discovery.services.role_provider import get_eligible_roles, normalize_role_title
from job_discovery.services.scraper_engine import (
    upsert_scraped_job, execute_scraping_run
)
from job_discovery.services.scheduler import run_scheduled_job_discovery
from candidates.models import Candidate, RoleSuggestion
from jobs.models import JobOpening
from recruiters.models import JobLinkEntry, RecruiterAssignment

User = get_user_model()


class JobDiscoveryTestSuite(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Admin user
        self.admin_user = User.objects.create_user(
            email='admin_test@hyrind.com',
            password='TestPassword123!',
            role='admin',
            approval_status='approved',
            is_staff=True,
        )

        # Create Recruiter user
        self.recruiter_user = User.objects.create_user(
            email='recruiter_test@hyrind.com',
            password='TestPassword123!',
            role='recruiter',
            approval_status='approved',
        )

        # Create Candidate user
        self.candidate_user = User.objects.create_user(
            email='candidate_test@hyrind.com',
            password='TestPassword123!',
            role='candidate',
            approval_status='approved',
        )
        self.candidate = Candidate.objects.create(
            user=self.candidate_user,
            status='active_marketing'
        )

        # Populate a sample candidate role
        RoleSuggestion.objects.create(
            candidate=self.candidate,
            role_title='Python Backend Engineer',
            candidate_confirmed=True
        )

    # ── 1. Role Provider Tests ──

    def test_get_eligible_roles(self):
        roles = get_eligible_roles(limit=10)
        self.assertTrue(len(roles) > 0)
        role_names = [r['role'] for r in roles]
        self.assertIn('Python Backend Engineer', role_names)

    def test_normalize_role_title(self):
        self.assertEqual(normalize_role_title("  Senior   Python Developer  "), "Senior Python Developer")

    # ── 2. Persistence & Duplicate Detection Tests ──

    def test_upsert_job_and_duplicate_detection(self):
        execution = ScraperExecution.objects.create(
            trigger_type='manual',
            status='running',
            total_roles=1
        )

        job1 = NormalizedJob(
            jobId='linkedin_test_001',
            contentHash='hash_sample_abc123',
            title='Senior Backend Engineer',
            companyName='Acme Corp',
            companyNameNorm='acme corp',
            jobUrl='https://linkedin.com/jobs/view/12345',
            jobDescription='Exciting backend role using Python and Django.',
            locationRaw='Austin, TX',
            city='Austin',
            state='Texas',
            stateCode='TX',
            isRemote=False,
            isHybrid=True,
            salaryMin=120000,
            salaryMax=150000,
            salaryPeriod='yearly',
            salaryPresent=True,
            employmentType='full-time',
            source='linkedin',
            postingDate=datetime.now(dt_timezone.utc),
        )

        # Insert first job
        outcome1 = upsert_scraped_job(job1, target_role='Backend Engineer', execution=execution)
        self.assertEqual(outcome1, 'inserted')
        self.assertEqual(DiscoveredJob.objects.count(), 1)

        db_job1 = DiscoveredJob.objects.get(job_id='linkedin_test_001')
        self.assertEqual(db_job1.title, 'Senior Backend Engineer')
        self.assertEqual(db_job1.company_name, 'Acme Corp')
        self.assertEqual(db_job1.review_status, 'PENDING_REVIEW')
        self.assertFalse(db_job1.is_duplicate)

        # Update the same job (same job_id)
        job1.salaryMax = 160000
        outcome_update = upsert_scraped_job(job1, target_role='Backend Engineer', execution=execution)
        self.assertEqual(outcome_update, 'updated')
        db_job1.refresh_from_db()
        self.assertEqual(float(db_job1.salary_max), 160000.0)

        # Insert cross-portal duplicate with identical contentHash but different jobId (e.g. from Indeed)
        job2 = NormalizedJob(
            jobId='indeed_test_002',
            contentHash='hash_sample_abc123',  # Identical content hash
            title='Senior Backend Engineer',
            companyName='Acme Corp',
            companyNameNorm='acme corp',
            jobUrl='https://indeed.com/viewjob?jk=67890',
            jobDescription='Exciting backend role using Python and Django.',
            locationRaw='Austin, TX',
            city='Austin',
            state='Texas',
            stateCode='TX',
            isRemote=False,
            isHybrid=True,
            salaryMin=120000,
            salaryMax=160000,
            salaryPeriod='yearly',
            salaryPresent=True,
            employmentType='full-time',
            source='indeed',
            postingDate=datetime.now(dt_timezone.utc),
        )

        outcome2 = upsert_scraped_job(job2, target_role='Backend Engineer', execution=execution)
        self.assertEqual(outcome2, 'duplicate')

        db_job2 = DiscoveredJob.objects.get(job_id='indeed_test_002')
        self.assertTrue(db_job2.is_duplicate)
        self.assertEqual(db_job2.canonical_job, db_job1)
        self.assertEqual(db_job2.review_status, 'ALREADY_EXISTS')

    # ── 3. Scheduler & Duplicate Prevention Tests ──

    def test_duplicate_scheduler_prevention(self):
        # Create an already running execution
        active = ScraperExecution.objects.create(
            trigger_type='scheduled',
            status='running',
            started_at=timezone.now(),
            total_roles=1
        )

        # Attempt to run scheduler again
        skipped = run_scheduled_job_discovery(force=False)
        self.assertEqual(skipped.id, active.id)

    # ── 4. Scraper API Endpoints Tests ──

    def test_scraper_roles_api(self):
        self.client.force_authenticate(user=self.recruiter_user)
        res = self.client.get('/api/admin/job-scraper/roles/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)

    @patch('job_discovery.views.trigger_async_scrape')
    def test_trigger_scraper_run_api(self, mock_trigger):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'roles': [
                {'role': 'Python Developer', 'limit': 15},
                {'role': 'DevOps Engineer', 'limit': 10}
            ],
            'sources': ['linkedin', 'dice']
        }
        res = self.client.post('/api/admin/job-scraper/run/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn('execution_id', res.data)
        self.assertEqual(res.data['roles_count'], 2)
        mock_trigger.assert_called_once()

    def test_scraper_executions_list_and_detail(self):
        exec1 = ScraperExecution.objects.create(
            trigger_type='manual',
            triggered_by=self.admin_user,
            status='completed',
            total_jobs_found=25,
            total_inserted=20,
            total_duplicates=5
        )

        self.client.force_authenticate(user=self.recruiter_user)
        res = self.client.get('/api/admin/job-scraper/executions/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)

        detail_res = self.client.get(f'/api/admin/job-scraper/executions/{exec1.id}/')
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data['total_jobs_found'], 25)

    # ── 5. Job Discovery Endpoints Tests ──

    def test_job_discovery_statistics(self):
        DiscoveredJob.objects.create(
            job_id='job_stat_1',
            content_hash='h1',
            title='Software Engineer',
            company_name='TestCorp',
            target_role='Software Engineer',
            source_portal='linkedin',
            review_status='PENDING_REVIEW'
        )
        DiscoveredJob.objects.create(
            job_id='job_stat_2',
            content_hash='h2',
            title='Cloud Architect',
            company_name='TestCorp',
            target_role='Cloud Architect',
            source_portal='dice',
            review_status='APPROVED'
        )

        self.client.force_authenticate(user=self.recruiter_user)
        res = self.client.get('/api/admin/job-discovery/statistics/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['total_scraped'], 2)
        self.assertEqual(res.data['pending_review'], 1)
        self.assertEqual(res.data['approved'], 1)

    def test_list_and_filter_discovered_jobs(self):
        DiscoveredJob.objects.create(
            job_id='filter_job_1',
            content_hash='h_f1',
            title='Python Full Stack Developer',
            company_name='Alpha Tech',
            target_role='Python Developer',
            source_portal='linkedin',
            city='Austin',
            state='Texas',
            is_remote=True,
            review_status='PENDING_REVIEW'
        )
        DiscoveredJob.objects.create(
            job_id='filter_job_2',
            content_hash='h_f2',
            title='Java Developer',
            company_name='Beta Solutions',
            target_role='Java Developer',
            source_portal='dice',
            city='Dallas',
            state='Texas',
            is_remote=False,
            review_status='APPROVED'
        )

        self.client.force_authenticate(user=self.recruiter_user)

        # Test search
        res = self.client.get('/api/admin/job-discovery/jobs/?search=Alpha')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['company_name'], 'Alpha Tech')

        # Test status filter
        res_status = self.client.get('/api/admin/job-discovery/jobs/?review_status=APPROVED')
        self.assertEqual(res_status.data['count'], 1)
        self.assertEqual(res_status.data['results'][0]['title'], 'Java Developer')

        # Test remote filter
        res_remote = self.client.get('/api/admin/job-discovery/jobs/?is_remote=true')
        self.assertEqual(res_remote.data['count'], 1)
        self.assertEqual(res_remote.data['results'][0]['is_remote'], True)

    def test_review_discovered_job(self):
        job = DiscoveredJob.objects.create(
            job_id='review_job_1',
            content_hash='h_rev_1',
            title='Data Scientist',
            company_name='AI Labs',
            target_role='Data Scientist',
            source_portal='linkedin',
            review_status='PENDING_REVIEW'
        )

        self.client.force_authenticate(user=self.recruiter_user)
        payload = {
            'review_status': 'APPROVED',
            'review_notes': 'Verified alignment with candidate skills.'
        }
        res = self.client.patch(f'/api/admin/job-discovery/jobs/{job.id}/review/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        job.refresh_from_db()
        self.assertEqual(job.review_status, 'APPROVED')
        self.assertEqual(job.reviewed_by, self.recruiter_user)
        self.assertIsNotNone(job.reviewed_at)
        self.assertEqual(job.review_notes, 'Verified alignment with candidate skills.')

    # ── 6. Requirement D: Future Integration Bridge Test ──

    def test_approve_and_promote_to_job_management(self):
        job = DiscoveredJob.objects.create(
            job_id='promote_job_1',
            content_hash='h_prom_1',
            title='Lead ML Engineer',
            company_name='Innovate AI',
            target_role='Machine Learning',
            source_portal='dice',
            city='San Francisco',
            state='California',
            job_url='https://dice.com/job/ml123',
            job_description='Machine Learning lead role.',
            review_status='PENDING_REVIEW'
        )

        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'candidate_id': str(self.candidate.id),
            'create_job_opening': True,
            'notes': 'Promoting to candidate application and internal opening.'
        }
        res = self.client.post(
            f'/api/admin/job-discovery/jobs/{job.id}/approve-for-job-management/',
            payload,
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Verify DiscoveredJob status updated
        job.refresh_from_db()
        self.assertEqual(job.review_status, 'APPROVED')

        # Verify JobLinkEntry was created for candidate
        link_entry = JobLinkEntry.objects.filter(candidate=self.candidate).first()
        self.assertIsNotNone(link_entry)
        self.assertEqual(link_entry.company_name, 'Innovate AI')
        self.assertEqual(link_entry.role_title, 'Lead ML Engineer')

        # Verify internal JobOpening was created
        opening = JobOpening.objects.filter(company='Innovate AI').first()
        self.assertIsNotNone(opening)
        self.assertEqual(opening.title, 'Lead ML Engineer')

    # ── 7. Visa Intelligence & Company Database Tests ──

    def test_company_visa_listing_and_detail(self):
        comp = CompanyVisaHistory.objects.create(
            company_name='Alphabet Inc',
            company_name_norm='alphabet',
            h1b_total_filings=5000,
            h1b_approvals=4900,
            h1b_denials=100,
            h1b_approval_rate=98.0,
            h1b_avg_salary=165000,
            h1b_last_filing_year=2024,
            perm_total_filings=300,
            green_card_sponsor=True,
            everify_enrolled=True,
            visa_friendly_score=95,
            visa_grade='A',
        )
        CompanyAlias.objects.create(
            alias_norm='google',
            target_norm='alphabet',
            notes='Search giant'
        )

        self.client.force_authenticate(user=self.admin_user)

        # Test listing companies
        res = self.client.get('/api/admin/job-scraper/companies/?search=alpha')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['company_name'], 'Alphabet Inc')
        self.assertIn('google', res.data['results'][0]['aliases'])

        # Test company visa detail
        res_detail = self.client.get(f'/api/admin/job-scraper/companies/{comp.id}/visa-details/')
        self.assertEqual(res_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(res_detail.data['visa_grade'], 'A')
        self.assertIn('score_factors', res_detail.data)

    def test_global_job_discovery_visa_filtering(self):
        # Create jobs with different visa grades and scores
        DiscoveredJob.objects.create(
            job_id='visa_job_a',
            content_hash='vh_a',
            title='Staff Software Engineer',
            company_name='Google LLC',
            target_role='Software Engineer',
            source_portal='linkedin',
            visa_matched=True,
            h1b_sponsor=True,
            h1b_approvals=2000,
            visa_grade='A',
            visa_friendly_score=92,
        )
        DiscoveredJob.objects.create(
            job_id='visa_job_c',
            content_hash='vh_c',
            title='Junior Web Developer',
            company_name='Small Startup',
            target_role='Web Developer',
            source_portal='indeed',
            visa_matched=True,
            h1b_sponsor=False,
            h1b_approvals=0,
            visa_grade='C',
            visa_friendly_score=45,
        )

        self.client.force_authenticate(user=self.admin_user)

        # Filter by grade A
        res_grade = self.client.get('/api/admin/job-discovery/jobs/?visa_grade=A')
        self.assertEqual(res_grade.status_code, status.HTTP_200_OK)
        self.assertEqual(res_grade.data['count'], 1)
        self.assertEqual(res_grade.data['results'][0]['job_id'], 'visa_job_a')

        # Filter by min_score 80
        res_score = self.client.get('/api/admin/job-discovery/jobs/?min_score=80')
        self.assertEqual(res_score.status_code, status.HTTP_200_OK)
        self.assertEqual(res_score.data['count'], 1)

        # Filter by h1b_only
        res_h1b = self.client.get('/api/admin/job-discovery/jobs/?h1b_only=true')
        self.assertEqual(res_h1b.status_code, status.HTTP_200_OK)
        self.assertEqual(res_h1b.data['count'], 1)

    # ── 8. Recruiter Personalized Job Discovery Tests ──

    def test_recruiter_personalized_job_discovery_isolation(self):
        # Setup: Recruiter 1 has Candidate 1 with role 'Python Backend Engineer'
        RecruiterAssignment.objects.create(
            recruiter=self.recruiter_user,
            candidate=self.candidate,
            is_active=True
        )

        # Setup: Recruiter 2 has Candidate 2 with role 'DevOps Engineer'
        recruiter_2 = User.objects.create_user(
            email='recruiter2@hyrind.com',
            password='TestPassword123!',
            role='recruiter',
            approval_status='approved'
        )
        cand_user_2 = User.objects.create_user(
            email='candidate2@hyrind.com',
            password='TestPassword123!',
            role='candidate',
            approval_status='approved'
        )
        cand_2 = Candidate.objects.create(user=cand_user_2, status='active_marketing')
        RoleSuggestion.objects.create(
            candidate=cand_2,
            role_title='DevOps Engineer',
            candidate_confirmed=True
        )
        RecruiterAssignment.objects.create(
            recruiter=recruiter_2,
            candidate=cand_2,
            is_active=True
        )

        # Create two jobs: one Python, one DevOps
        python_job = DiscoveredJob.objects.create(
            job_id='py_job_1',
            content_hash='ch_py_1',
            title='Senior Python Backend Engineer',
            company_name='TechCorp',
            target_role='Python Backend Engineer',
            source_portal='dice',
            visa_grade='A',
            visa_friendly_score=88,
        )
        devops_job = DiscoveredJob.objects.create(
            job_id='devops_job_1',
            content_hash='ch_dev_1',
            title='Lead Cloud DevOps Engineer',
            company_name='CloudCorp',
            target_role='DevOps Engineer',
            source_portal='linkedin',
            visa_grade='B',
            visa_friendly_score=75,
        )

        # Test Recruiter 1: should ONLY see python_job, NOT devops_job
        self.client.force_authenticate(user=self.recruiter_user)
        res_rec1 = self.client.get('/api/recruiter/job-discovery/jobs/')
        self.assertEqual(res_rec1.status_code, status.HTTP_200_OK)
        self.assertEqual(res_rec1.data['count'], 1)
        self.assertEqual(res_rec1.data['results'][0]['job_id'], 'py_job_1')

        # Check candidate matching context badge
        match_info = res_rec1.data['results'][0]['matching_candidates']
        self.assertEqual(len(match_info), 1)
        self.assertEqual(match_info[0]['id'], str(self.candidate.id))

        # Recruiter 1 detail access to devops_job should be 403 Forbidden
        res_rec1_forbidden = self.client.get(f'/api/recruiter/job-discovery/jobs/{devops_job.id}/')
        self.assertEqual(res_rec1_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # Recruiter 1 detail access to python_job should succeed
        res_rec1_py_detail = self.client.get(f'/api/recruiter/job-discovery/jobs/{python_job.id}/')
        self.assertEqual(res_rec1_py_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(res_rec1_py_detail.data['id'], str(python_job.id))

        # Test Recruiter 2: should ONLY see devops_job
        self.client.force_authenticate(user=recruiter_2)
        res_rec2 = self.client.get('/api/recruiter/job-discovery/jobs/')
        self.assertEqual(res_rec2.status_code, status.HTTP_200_OK)
        self.assertEqual(res_rec2.data['count'], 1)
        self.assertEqual(res_rec2.data['results'][0]['job_id'], 'devops_job_1')

        # Test Recruiter statistics endpoint
        stats_res = self.client.get('/api/recruiter/job-discovery/statistics/')
        self.assertEqual(stats_res.status_code, status.HTTP_200_OK)
        self.assertEqual(stats_res.data['total_matching_jobs'], 1)
        self.assertEqual(stats_res.data['assigned_candidates_count'], 1)

        # Test Recruiter filters endpoint
        filters_res = self.client.get('/api/recruiter/job-discovery/filters/')
        self.assertEqual(filters_res.status_code, status.HTTP_200_OK)
        self.assertIn('DevOps Engineer', filters_res.data['roles'])

    # ── 7. Visa Scoring, Intelligence & Matching Tests ──

    def test_visa_scoring_formula(self):
        from job_discovery.visa.scoring import compute_visa_score

        # Grade A: 100% approval, high volume (40) + rate (25) + recent (15) + PERM (10) + E-Verify (10) = 100
        res_a = compute_visa_score(
            h1b_filings=5000,
            approvals=5000,
            denials=0,
            perm_filings=500,
            everify=True,
            year=datetime.now().year,
        )
        self.assertEqual(res_a['score'], 100)
        self.assertEqual(res_a['grade'], 'A')
        self.assertEqual(res_a['approval_rate'], 100.0)

        # Grade B: 100 filings, 95% approval, recent, no PERM, no E-Verify = 40 + 24 + 15 = 79
        res_b = compute_visa_score(
            h1b_filings=100,
            approvals=95,
            denials=5,
            perm_filings=0,
            everify=False,
            year=datetime.now().year,
        )
        self.assertEqual(res_b['score'], 79)
        self.assertEqual(res_b['grade'], 'B')

        # Grade D: low volume, low rate
        res_d = compute_visa_score(
            h1b_filings=20,
            approvals=10,
            denials=10,
            year=datetime.now().year - 4,
        )
        self.assertEqual(res_d['grade'], 'D')

    def test_visa_matcher_multi_pass(self):
        from job_discovery.matcher.match_jobs_to_visa import match_jobs_to_visa
        from job_discovery.matcher.normalize_company import normalize_company

        # Setup CompanyVisaHistory
        c_apple = CompanyVisaHistory.objects.create(
            company_name='Apple Inc.',
            company_name_norm=normalize_company('Apple Inc.'),
            h1b_total_filings=3500,
            h1b_approvals=3450,
            h1b_denials=50,
            h1b_approval_rate=98.57,
            visa_friendly_score=100,
            visa_grade='A',
            green_card_sponsor=True,
            everify_enrolled=True,
        )
        c_capital_one = CompanyVisaHistory.objects.create(
            company_name='Capital One Services LLC',
            company_name_norm='capitaloneservices',
            h1b_total_filings=1200,
            h1b_approvals=1180,
            visa_friendly_score=95,
            visa_grade='A',
        )

        # Setup Alias
        CompanyAlias.objects.create(
            alias_norm='capitalonebrand',
            target_norm='capitaloneservices',
            notes='test alias',
        )

        # Create jobs to match
        job_exact = DiscoveredJob.objects.create(
            job_id='visa_test_exact',
            content_hash='vh_exact',
            title='iOS Software Engineer',
            company_name='Apple Inc.',
            company_name_norm='apple',
        )
        job_alias = DiscoveredJob.objects.create(
            job_id='visa_test_alias',
            content_hash='vh_alias',
            title='Data Engineer',
            company_name='Capital One Brand',
            company_name_norm='capitalonebrand',
        )

        count = match_jobs_to_visa(rematch_all=True)
        self.assertGreaterEqual(count, 2)

        job_exact.refresh_from_db()
        self.assertTrue(job_exact.visa_matched)
        self.assertEqual(job_exact.visa_grade, 'A')
        self.assertEqual(job_exact.visa_friendly_score, 100)
        self.assertEqual(job_exact.company_match_confidence, 'exact')

        job_alias.refresh_from_db()
        self.assertTrue(job_alias.visa_matched)
        self.assertEqual(job_alias.company_match_confidence, 'alias')

    def test_company_search_endpoint(self):
        CompanyVisaHistory.objects.create(
            company_name='Google LLC',
            company_name_norm='google',
            h1b_total_filings=5000,
            h1b_approvals=4900,
            visa_friendly_score=100,
            visa_grade='A',
        )
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/admin/job-scraper/companies/?q=Google')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data['results']) > 0)
        self.assertEqual(res.data['results'][0]['company_name'], 'Google LLC')

    def test_management_commands_execution(self):
        from django.core.management import call_command
        from io import StringIO

        CompanyVisaHistory.objects.create(
            company_name='Apple Inc.',
            company_name_norm='apple',
            h1b_total_filings=3000,
            h1b_approvals=2950,
            visa_grade='A',
        )

        out = StringIO()
        call_command('run_match', '--rematch-all', stdout=out)
        self.assertIn('Successfully matched and enriched', out.getvalue())

        out_alias = StringIO()
        call_command('add_alias', 'Kforce Staffing', 'Apple Inc.', 'test note', stdout=out_alias)
        self.assertIn('alias:', out_alias.getvalue())
