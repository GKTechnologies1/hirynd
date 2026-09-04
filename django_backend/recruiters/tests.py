from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from recruiters.models import RecruiterBankDetails, RecruiterProfile, DailySubmissionLog, JobLinkEntry
from users.models import Profile

User = get_user_model()

class RecruiterBankDetailsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Recruiter
        self.recruiter_user = User.objects.create_user(
            email='recruiter@hyrind.com',
            password='password',
            role='recruiter',
            approval_status='approved'
        )
        Profile.objects.create(user=self.recruiter_user, full_name='Recruiter User')
        RecruiterProfile.objects.create(user=self.recruiter_user)

        # Create Admin
        self.admin_user = User.objects.create_user(
            email='admin@hyrind.com',
            password='password',
            role='admin',
            approval_status='approved'
        )
        Profile.objects.create(user=self.admin_user, full_name='Admin User')

        self.bank_details_url = reverse('bank_details')
        self.admin_profile_url = reverse('admin_update_profile', kwargs={'user_id': self.recruiter_user.id})

    def test_get_bank_details_new_recruiter(self):
        """Test getting bank details initially (should create record automatically)."""
        self.client.force_authenticate(user=self.recruiter_user)
        response = self.client.get(self.bank_details_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['bank_name'], None)
        self.assertEqual(response.data['account_number'], None)
        self.assertEqual(response.data['ifsc_code'], None)

    def test_post_bank_details(self):
        """Test saving bank details with ifsc_code."""
        self.client.force_authenticate(user=self.recruiter_user)
        payload = {
            'bank_name': 'HDFC Bank',
            'account_number': '987654321012',
            'ifsc_code': 'HDFC0001234'
        }
        response = self.client.post(self.bank_details_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['bank_name'], 'HDFC Bank')
        self.assertEqual(response.data['account_number'], '987654321012')
        self.assertEqual(response.data['ifsc_code'], 'HDFC0001234')
        self.assertEqual(response.data['account_number_last4'], '1012')
        self.assertEqual(response.data['routing_number_last4'], '1234')

        # Verify DB entry
        bank = RecruiterBankDetails.objects.get(recruiter=self.recruiter_user)
        self.assertEqual(bank.bank_name, 'HDFC Bank')
        self.assertEqual(bank.account_number_encrypted, '987654321012')
        self.assertEqual(bank.routing_number_encrypted, 'HDFC0001234')

    def test_post_bank_details_using_legacy_routing_number(self):
        """Test saving bank details using legacy routing_number field."""
        self.client.force_authenticate(user=self.recruiter_user)
        payload = {
            'bank_name': 'ICICI Bank',
            'account_number': '111122223333',
            'routing_number': 'ICIC0005555'
        }
        response = self.client.post(self.bank_details_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['ifsc_code'], 'ICIC0005555')
        self.assertEqual(response.data['routing_number'], 'ICIC0005555')
        self.assertEqual(response.data['routing_number_last4'], '5555')

    def test_admin_get_and_update_recruiter_bank_details(self):
        """Test admin retrieving and updating recruiter profile with bank details."""
        # Setup initial bank details
        RecruiterBankDetails.objects.create(
            recruiter=self.recruiter_user,
            bank_name='SBI',
            account_number_last4='8888',
            account_number_encrypted='123456788888',
            routing_number_last4='9999',
            routing_number_encrypted='SBIN0009999'
        )

        self.client.force_authenticate(user=self.admin_user)
        
        # GET recruiter details as admin
        response = self.client.get(self.admin_profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        bank_data = response.data['bank_details']
        self.assertEqual(bank_data['bank_name'], 'SBI')
        self.assertEqual(bank_data['account_number'], '123456788888')
        self.assertEqual(bank_data['ifsc_code'], 'SBIN0009999')

        # UPDATE recruiter bank details as admin
        update_payload = {
            'bank_details': {
                'bank_name': 'Axis Bank',
                'account_number': '222233334444',
                'ifsc_code': 'UTIB0001111'
            }
        }
        response = self.client.patch(self.admin_profile_url, update_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify db updated
        bank = RecruiterBankDetails.objects.get(recruiter=self.recruiter_user)
        self.assertEqual(bank.bank_name, 'Axis Bank')
        self.assertEqual(bank.account_number_encrypted, '222233334444')
        self.assertEqual(bank.routing_number_encrypted, 'UTIB0001111')


from unittest.mock import patch
from candidates.models import Candidate

class RecruiterAssignmentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@hyrind.com',
            password='password',
            role='admin',
            approval_status='approved'
        )
        Profile.objects.create(user=self.admin, full_name='System Admin')

        self.recruiter = User.objects.create_user(
            email='recruiter@hyrind.com',
            password='password',
            role='recruiter',
            approval_status='approved'
        )
        Profile.objects.create(user=self.recruiter, full_name='Recruiter User')
        RecruiterProfile.objects.create(user=self.recruiter)

        self.candidate_user = User.objects.create_user(
            email='candidate@hyrind.com',
            password='password',
            role='candidate',
            approval_status='approved'
        )
        Profile.objects.create(user=self.candidate_user, full_name='Candidate User')
        self.candidate = Candidate.objects.create(user=self.candidate_user, status='approved')

    @patch('recruiters.views.send_email')
    @patch('recruiters.views.create_notification')
    def test_assign_recruiter_sends_notifications(self, mock_create_notification, mock_send_email):
        """Test that assigning a recruiter sends emails and in-app notifications to candidate & recruiter."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('assign_recruiter')
        
        payload = {
            'candidate': str(self.candidate.id),
            'recruiter': str(self.recruiter.id),
            'role_type': 'primary'
        }
        
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify notifications are created
        self.assertEqual(mock_create_notification.call_count, 2)
        # Verify emails are sent to candidate and recruiter
        self.assertEqual(mock_send_email.call_count, 2)

    def test_submit_job_application_long_url(self):
        """Test that submitting a job application with a long URL succeeds."""
        self.client.force_authenticate(user=self.recruiter)
        url = reverse('job_applications', kwargs={'candidate_id': self.candidate.id})
        
        long_url = "http://example.com/jobs/" + ("a" * 800)
        payload = {
            'job_links': [{
                'company_name': 'Long URL Company',
                'role_title': 'Software Engineer',
                'job_url': long_url,
                'job_description': 'Description',
                'resume_used': 'Resume.pdf',
                'status': 'applied'
            }]
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify db
        from recruiters.models import JobLinkEntry
        self.assertTrue(JobLinkEntry.objects.filter(job_url=long_url).exists())

    def test_submit_job_application_long_drive_link(self):
        """Test that submitting a job application with a long Google Drive link (>255 chars) succeeds."""
        self.client.force_authenticate(user=self.recruiter)
        url = reverse('job_applications', kwargs={'candidate_id': self.candidate.id})
        
        long_drive_link = "https://docs.google.com/document/d/1Zn2VkVYEVL1ri6XBkA4Rhc2bm06M_Xr5/edit?usp=drive_link&ouid=118123841889096466716&rtpof=true&sd=true&extra_param=" + ("x" * 200)
        payload = {
            'job_links': [{
                'company_name': 'Anduril Industries',
                'role_title': 'Senior Data Engineer',
                'job_url': 'www.linkedin.com/company/anduril',
                'job_description': 'Test description with bullet points • point 1 • point 2',
                'resume_used': long_drive_link,
                'status': None
            }]
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        from recruiters.models import JobLinkEntry
        entry = JobLinkEntry.objects.get(company_name='Anduril Industries')
        self.assertEqual(entry.resume_used, long_drive_link)
        self.assertEqual(entry.job_url, 'https://www.linkedin.com/company/anduril')
        self.assertEqual(entry.application_status, 'applied')


class PublicJobAlertsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.recruiter = User.objects.create_user(
            email='recruiter@hyrind.com',
            password='password',
            role='recruiter',
            approval_status='approved'
        )
        self.candidate_user = User.objects.create_user(
            email='cand@hyrind.com',
            password='password',
            role='candidate',
            approval_status='approved'
        )
        from candidates.models import Candidate
        self.candidate = Candidate.objects.create(user=self.candidate_user, status='approved')
        self.log = DailySubmissionLog.objects.create(
            candidate=self.candidate,
            recruiter=self.recruiter,
            log_date=timezone.now().date(),
            applications_count=1
        )
        self.job = JobLinkEntry.objects.create(
            submission_log=self.log,
            candidate=self.candidate,
            company_name='Test Company',
            role_title='Software Dev',
            job_url='http://example.com',
            job_description='Test description',
            is_public=True
        )
        self.public_url = reverse('public_job_alerts')

    def test_public_job_alerts_endpoint(self):
        """Test that anyone can fetch public job alerts and that log_date is included."""
        # Unauthenticated request
        response = self.client.get(self.public_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['company_name'], 'Test Company')
        self.assertEqual(response.data[0]['role_title'], 'Software Dev')
        self.assertEqual(response.data[0]['job_description'], 'Test description')
        self.assertEqual(response.data[0]['job_url'], 'http://example.com')
        # Check that log_date is serialized correctly
        self.assertEqual(response.data[0]['log_date'], self.log.log_date)

    def test_public_job_alerts_last_30_days_filter(self):
        """Test that records older than 30 days are excluded from public job alerts."""
        from datetime import timedelta

        old_log = DailySubmissionLog.objects.create(
            candidate=self.candidate,
            recruiter=self.recruiter,
            log_date=timezone.now().date() - timedelta(days=45),
            applications_count=1
        )
        old_job = JobLinkEntry.objects.create(
            submission_log=old_log,
            candidate=self.candidate,
            company_name='Old Company',
            role_title='Old Dev',
            job_url='http://example.com/old',
            is_public=True
        )
        # update created_at directly since auto_now_add sets it on create
        JobLinkEntry.objects.filter(id=old_job.id).update(
            created_at=timezone.now() - timedelta(days=45)
        )

        response = self.client.get(self.public_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only include self.job (recent), not old_job
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['company_name'], 'Test Company')

    def test_public_job_alerts_salary_filter(self):
        """Test that salary query parameter filters jobs accurately."""
        # Create jobs with various salary values
        job_120k = JobLinkEntry.objects.create(
            submission_log=self.log,
            candidate=self.candidate,
            company_name='High Pay Inc',
            role_title='Lead Dev',
            job_url='http://example.com/high',
            salary='$120,000 / yr',
            is_public=True
        )
        job_60k = JobLinkEntry.objects.create(
            submission_log=self.log,
            candidate=self.candidate,
            company_name='Mid Pay Inc',
            role_title='Junior Dev',
            job_url='http://example.com/mid',
            salary='$60,000',
            is_public=True
        )
        job_undisclosed = JobLinkEntry.objects.create(
            submission_log=self.log,
            candidate=self.candidate,
            company_name='Mystery Inc',
            role_title='Mystery Dev',
            job_url='http://example.com/mystery',
            salary='Not Disclosed',
            is_public=True
        )

        # 1. Disclosed Only
        resp = self.client.get(self.public_url, {'salary': 'Disclosed Only'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        returned_companies = [j['company_name'] for j in resp.data]
        self.assertIn('High Pay Inc', returned_companies)
        self.assertIn('Mid Pay Inc', returned_companies)
        self.assertNotIn('Mystery Inc', returned_companies)
        self.assertNotIn('Test Company', returned_companies) # self.job has salary=None

        # 2. $50,000+
        resp = self.client.get(self.public_url, {'salary': '$50,000+'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        returned_companies = [j['company_name'] for j in resp.data]
        self.assertIn('High Pay Inc', returned_companies)
        self.assertIn('Mid Pay Inc', returned_companies)
        self.assertNotIn('Mystery Inc', returned_companies)

        # 3. $100,000+
        resp = self.client.get(self.public_url, {'salary': '$100,000+'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        returned_companies = [j['company_name'] for j in resp.data]
        self.assertIn('High Pay Inc', returned_companies)
        self.assertNotIn('Mid Pay Inc', returned_companies)
        self.assertNotIn('Mystery Inc', returned_companies)

        # 4. $150,000+
        resp = self.client.get(self.public_url, {'salary': '$150,000+'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 0)

        # 5. Multiple selected options via semicolon or comma
        resp = self.client.get(self.public_url, {'salary': '$100,000+;$150,000+'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        returned_companies = [j['company_name'] for j in resp.data]
        self.assertIn('High Pay Inc', returned_companies)
        self.assertNotIn('Mid Pay Inc', returned_companies)

