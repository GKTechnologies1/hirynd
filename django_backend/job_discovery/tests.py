import uuid
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone as dt_timezone
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from job_discovery.models import ScraperExecution, DiscoveredJob
from job_discovery.scraper.job_parser import NormalizedJob
from job_discovery.services.role_provider import get_eligible_roles, normalize_role_title
from job_discovery.services.scraper_engine import (
    upsert_scraped_job, execute_scraping_run
)
from job_discovery.services.scheduler import run_scheduled_job_discovery
from candidates.models import Candidate, RoleSuggestion
from jobs.models import JobOpening
from recruiters.models import JobLinkEntry

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
