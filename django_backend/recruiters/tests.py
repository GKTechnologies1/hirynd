from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from recruiters.models import RecruiterBankDetails, RecruiterProfile
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
