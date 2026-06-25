from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date
from candidates.models import Candidate, CredentialVersion, ClientIntake, GeneralEnquiry
from users.models import Profile

User = get_user_model()

class CandidateCredentialsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Admin user
        self.admin_user = User.objects.create_user(
            email='admin@hyrind.com',
            password='password',
            role='admin',
            approval_status='approved'
        )
        Profile.objects.create(user=self.admin_user, full_name='System Admin')

        # Create Recruiter user
        self.recruiter_user = User.objects.create_user(
            email='recruiter@hyrind.com',
            password='password',
            role='recruiter',
            approval_status='approved'
        )
        Profile.objects.create(user=self.recruiter_user, full_name='Recruiter User')

        # Create Candidate user & candidate record
        self.candidate_user = User.objects.create_user(
            email='candidate@hyrind.com',
            password='password',
            role='candidate',
            approval_status='approved'
        )
        Profile.objects.create(user=self.candidate_user, full_name='John Doe')
        
        self.candidate = Candidate.objects.create(
            user=self.candidate_user,
            status='approved'
        )

        self.upsert_url = reverse('upsert_credential', kwargs={'candidate_id': self.candidate.id})

        # Base valid credential payload
        self.valid_payload = {
            'email': 'candidate@hyrind.com',
            'full_name': 'John Doe',
            'phone_number': '1234567890',
            'country_code': '+1',
            'location': 'New York, NY',
            'personal_email': 'john.doe@personal.com',
            'preferred_roles': 'Software Engineer',
            'preferred_locations': 'Remote',
            'linkedin_id': 'john-doe-linkedin',
            'linkedin_pass': 'supersecretpass',
            'bachelors_grad_date': '2022-05-15',
            'masters_grad_date': '2024-05-15',
            'opt_start_date': '2024-06-01',
            'first_entry_us': '2020-08-15',
            'opt_offer_submitted': 'no'
        }

    def test_candidate_upsert_credentials_first_time_payment_completed(self):
        """Test candidate saving credentials first time when status is not in post_credentials_statuses (e.g. approved)."""
        self.client.force_authenticate(user=self.candidate_user)
        
        # Candidate status is initially 'approved'
        self.assertEqual(self.candidate.status, 'approved')

        response = self.client.post(self.upsert_url, {'data': self.valid_payload}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check version 1 created
        versions = CredentialVersion.objects.filter(candidate=self.candidate)
        self.assertEqual(versions.count(), 1)
        self.assertEqual(versions.first().version, 1)

        # Candidate status should NOT transition to credentials_submitted since candidate status wasn't 'payment_completed' etc.
        # But top-level model fields should be updated
        self.candidate.refresh_from_db()
        self.assertEqual(self.candidate.personal_email, 'john.doe@personal.com')
        self.assertEqual(self.candidate.current_location, 'New York, NY')
        self.assertEqual(self.candidate.preferred_locations, 'Remote')
        self.assertEqual(self.candidate.linkedin_url, 'john-doe-linkedin')
        self.assertEqual(self.candidate.bachelors_graduation_date, date(2022, 5, 15))

    def test_candidate_updates_credentials_multiple_times_before_finalize(self):
        """Test candidate updating their credentials draft multiple times before finalize: should keep it version 1."""
        self.client.force_authenticate(user=self.candidate_user)

        # First save
        response = self.client.post(self.upsert_url, {'data': self.valid_payload}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Second save with modified payload
        modified = self.valid_payload.copy()
        modified['location'] = 'Austin, TX'
        response = self.client.post(self.upsert_url, {'data': modified}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Version should still be 1 (re-saved)
        versions = CredentialVersion.objects.filter(candidate=self.candidate)
        self.assertEqual(versions.count(), 1)
        self.assertEqual(versions.first().version, 1)
        self.assertEqual(versions.first().data['location'], 'Austin, TX')

    def test_recruiter_updates_candidate_credentials_after_finalize(self):
        """Test recruiter saving credentials after candidate finalized: should create new version (v2)."""
        # 1. Setup candidate already finalized credentials
        self.candidate.status = 'credentials_submitted'
        self.candidate.save()
        CredentialVersion.objects.create(
            candidate=self.candidate,
            data=self.valid_payload,
            version=1,
            edited_by=self.candidate_user
        )

        # 2. Recruiter authenticates
        self.client.force_authenticate(user=self.recruiter_user)

        # Recruiter saves with new title/data
        recruiter_payload = self.valid_payload.copy()
        recruiter_payload['location'] = 'Los Angeles, CA'
        
        response = self.client.post(self.upsert_url, {'data': recruiter_payload}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check version 2 created
        versions = CredentialVersion.objects.filter(candidate=self.candidate).order_by('version')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[0].version, 1)
        self.assertEqual(versions[1].version, 2)
        self.assertEqual(versions[1].edited_by, self.recruiter_user)
        self.assertEqual(versions[1].data['location'], 'Los Angeles, CA')

    def test_admin_updates_candidate_credentials(self):
        """Test admin saving credentials."""
        self.client.force_authenticate(user=self.admin_user)

        # Clean payload for normal creation
        response = self.client.post(self.upsert_url, {'data': self.valid_payload}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        versions = CredentialVersion.objects.filter(candidate=self.candidate)
        self.assertEqual(versions.count(), 1)
        self.assertEqual(versions.first().edited_by, self.admin_user)

    def test_upsert_credentials_clears_offer_letter(self):
        """Test that updating opt_offer_submitted to except 'yes' clears offer_letter_url."""
        self.client.force_authenticate(user=self.candidate_user)

        # 1. Save with opt_offer_submitted='yes' and a valid url
        payload_with_offer = self.valid_payload.copy()
        payload_with_offer['opt_offer_submitted'] = 'yes'
        payload_with_offer['offer_letter_url'] = 'https://hyrind.com/media/offers/letter.pdf'

        response = self.client.post(self.upsert_url, {'data': payload_with_offer}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        versions = CredentialVersion.objects.filter(candidate=self.candidate)
        self.assertEqual(versions.count(), 1)
        self.assertEqual(versions.first().data['offer_letter_url'], 'https://hyrind.com/media/offers/letter.pdf')

        # 2. Update with opt_offer_submitted='no'
        payload_no_offer = self.valid_payload.copy()
        payload_no_offer['opt_offer_submitted'] = 'no'

        response = self.client.post(self.upsert_url, {'data': payload_no_offer}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Should retrieve the updated version and verify offer_letter_url is deleted (None)
        versions = CredentialVersion.objects.filter(candidate=self.candidate).order_by('-version')
        self.assertEqual(versions.first().data['offer_letter_url'], None)

    def test_reopen_intake(self):
        """Test that reopening the intake sheet as admin changes candidate status to approved."""
        # Setup intake as locked, candidate status as intake_submitted
        ClientIntake.objects.create(
            candidate=self.candidate,
            data=self.valid_payload,
            is_locked=True
        )
        self.candidate.status = 'intake_submitted'
        self.candidate.save()

        # Admin authenticates
        self.client.force_authenticate(user=self.admin_user)

        reopen_url = reverse('reopen_intake', kwargs={'candidate_id': self.candidate.id})
        response = self.client.post(reopen_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify candidate status transitioned to 'approved' and intake is unlocked
        self.candidate.refresh_from_db()
        self.assertEqual(self.candidate.status, 'approved')
        
        intake = ClientIntake.objects.get(candidate=self.candidate)
        self.assertFalse(intake.is_locked)

    def test_reopen_intake_past_payment_does_not_reset_status(self):
        """Test that reopening the intake sheet for a candidate who completed payment does not reset their status to approved."""
        ClientIntake.objects.create(
            candidate=self.candidate,
            data=self.valid_payload,
            is_locked=True
        )
        self.candidate.status = 'active_marketing'
        self.candidate.save()

        # Admin authenticates
        self.client.force_authenticate(user=self.admin_user)

        reopen_url = reverse('reopen_intake', kwargs={'candidate_id': self.candidate.id})
        response = self.client.post(reopen_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify candidate status remains active_marketing, but intake is unlocked
        self.candidate.refresh_from_db()
        self.assertEqual(self.candidate.status, 'active_marketing')
        
        intake = ClientIntake.objects.get(candidate=self.candidate)
        self.assertFalse(intake.is_locked)


from unittest.mock import patch

class CandidateLifecycleEmailsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@hyrind.com',
            password='password',
            role='admin',
            approval_status='approved'
        )
        Profile.objects.create(user=self.admin, full_name='System Admin')

        self.candidate_user = User.objects.create_user(
            email='candidate@hyrind.com',
            password='password',
            role='candidate',
            approval_status='approved'
        )
        Profile.objects.create(user=self.candidate_user, full_name='John Doe')
        self.candidate = Candidate.objects.create(user=self.candidate_user, status='approved')

    @patch('candidates.views.send_email')
    @patch('candidates.views.create_notification')
    def test_referral_triggers_notifications(self, mock_create_notification, mock_send_email):
        """Test that submitting a referral triggers admin/friend emails and admin in-app notification."""
        self.client.force_authenticate(user=self.candidate_user)
        referral_url = reverse('referrals', kwargs={'candidate_id': self.candidate.id})
        
        payload = {
            'friend_name': 'Friend User',
            'friend_email': 'friend@gmail.com',
            'friend_phone': '1234567890',
            'referred_for': 'Software Engineer',
            'referral_note': 'Strong recommendation'
        }
        
        response = self.client.post(referral_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify in-app notifications created for admin
        mock_create_notification.assert_called()
        # Verify send_email called for both friend and admin
        self.assertEqual(mock_send_email.call_count, 2)
        
        # Verify audit log exists
        from audit.models import AuditLog
        self.assertTrue(AuditLog.objects.filter(action='referral_submitted').exists())

    @patch('candidates.views.send_email')
    def test_placement_closure_triggers_emails(self, mock_send_email):
        """Test that closing placement triggers congratulations to candidate and confirmation to admin."""
        self.client.force_authenticate(user=self.admin)
        placement_url = reverse('placement', kwargs={'candidate_id': self.candidate.id})
        
        payload = {
            'company_name': 'Google',
            'role_title': 'Staff Software Engineer',
            'start_date': '2026-07-01',
            'salary': '200,000',
            'currency': 'USD',
            'hr_email': 'hr@google.com',
            'offer_letter_url': 'https://google.com/offer.pdf'
        }
        
        response = self.client.post(placement_url, payload, format='json')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        
        # Verify candidate status updated
        self.candidate.refresh_from_db()
        self.assertEqual(self.candidate.status, 'placed_closed')
        
        # Verify emails triggered
        self.assertEqual(mock_send_email.call_count, 2)

    @patch('candidates.views.send_email')
    @patch('candidates.views.create_notification')
    def test_reopen_intake_sends_notifications(self, mock_create_notification, mock_send_email):
        """Test that reopening intake sends email and notification to candidate."""
        ClientIntake.objects.create(
            candidate=self.candidate,
            data={},
            is_locked=True
        )
        self.client.force_authenticate(user=self.admin)
        reopen_url = reverse('reopen_intake', kwargs={'candidate_id': self.candidate.id})
        
        response = self.client.post(reopen_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify email and notification sent
        mock_send_email.assert_called_once()
        mock_create_notification.assert_called_once()

    @patch('candidates.views.send_email')
    @patch('candidates.views.create_notification')
    def test_reopen_roles_sends_notifications(self, mock_create_notification, mock_send_email):
        """Test that reopening roles resets RoleSuggestion and reverts status to intake_submitted."""
        from candidates.models import RoleSuggestion
        from django.utils import timezone
        
        # Setup candidate in roles_confirmed status with a confirmed role suggestion
        self.candidate.status = 'roles_confirmed'
        self.candidate.save()
        
        suggestion = RoleSuggestion.objects.create(
            candidate=self.candidate,
            role_title='Software Engineer',
            candidate_confirmed=True,
            confirmed_at=timezone.now(),
            change_request_note='Looks good'
        )
        
        self.client.force_authenticate(user=self.admin)
        reopen_url = reverse('reopen_roles', kwargs={'candidate_id': self.candidate.id})
        
        response = self.client.post(reopen_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify candidate status reverted
        self.candidate.refresh_from_db()
        self.assertEqual(self.candidate.status, 'intake_submitted')
        
        # Verify suggestion reset
        suggestion.refresh_from_db()
        self.assertIsNone(suggestion.candidate_confirmed)
        self.assertIsNone(suggestion.confirmed_at)
        self.assertIsNone(suggestion.change_request_note)
        
        # Verify email and notification sent
        mock_send_email.assert_called_once()
        mock_create_notification.assert_called_once()

    @patch('candidates.views.send_email')
    @patch('candidates.views.create_notification')
    def test_reopen_roles_for_paid_candidate_does_not_reset_status(self, mock_create_notification, mock_send_email):
        """Test that reopening roles for a candidate who has paid does not revert status to intake_submitted."""
        from candidates.models import RoleSuggestion
        from django.utils import timezone
        from billing.models import Subscription
        
        # Setup candidate in active_marketing status with a confirmed role suggestion
        self.candidate.status = 'active_marketing'
        self.candidate.save()
        
        # Setup subscription as active (paid)
        Subscription.objects.create(
            candidate=self.candidate,
            status='active',
            plan_name='standard'
        )
        
        suggestion = RoleSuggestion.objects.create(
            candidate=self.candidate,
            role_title='Software Engineer',
            candidate_confirmed=True,
            confirmed_at=timezone.now(),
            change_request_note='Looks good'
        )
        
        self.client.force_authenticate(user=self.admin)
        reopen_url = reverse('reopen_roles', kwargs={'candidate_id': self.candidate.id})
        
        response = self.client.post(reopen_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify candidate status remains active_marketing
        self.candidate.refresh_from_db()
        self.assertEqual(self.candidate.status, 'active_marketing')
        
        # Verify suggestion was still reset
        suggestion.refresh_from_db()
        self.assertIsNone(suggestion.candidate_confirmed)


class GeneralEnquiryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@hyrind.com',
            password='password',
            role='admin',
            approval_status='approved'
        )
        Profile.objects.create(user=self.admin, full_name='System Admin')

        self.candidate = User.objects.create_user(
            email='candidate@hyrind.com',
            password='password',
            role='candidate',
            approval_status='approved'
        )
        Profile.objects.create(user=self.candidate, full_name='Candidate User')

    @patch('users.views.send_email')
    def test_submit_general_enquiry(self, mock_send_email):
        """Test submitting a general inquiry stores it and sends emails."""
        contact_url = reverse('submit_contact')
        payload = {
            'name': 'Inquirer Name',
            'email': 'inquirer@example.com',
            'phone': '1234567890',
            'message': 'Hello, I have a question.',
            'mode': 'general'
        }
        response = self.client.post(contact_url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check DB
        enquiries = GeneralEnquiry.objects.filter(email='inquirer@example.com')
        self.assertEqual(enquiries.count(), 1)
        enquiry = enquiries.first()
        self.assertEqual(enquiry.name, 'Inquirer Name')
        self.assertEqual(enquiry.message, 'Hello, I have a question.')
        self.assertEqual(enquiry.status, 'new')
        self.assertEqual(enquiry.display_id, 'HYREQ0001')

        # Check emails sent (one to admin, one to inquirer)
        self.assertEqual(mock_send_email.call_count, 2)

    def test_list_enquiries_admin_only(self):
        """Test that only admin users can list general enquiries."""
        # Create some enquiries
        GeneralEnquiry.objects.create(name='Enquiry 1', email='e1@example.com', message='msg1')
        GeneralEnquiry.objects.create(name='Enquiry 2', email='e2@example.com', message='msg2')

        list_url = reverse('general_enquiry_list')

        # Unauthorized
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Candidate user (non-admin)
        self.client.force_authenticate(user=self.candidate)
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Admin user
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_enquiries_filters_and_sorting_pagination(self):
        """Test filtering, sorting and pagination on enquiries."""
        GeneralEnquiry.objects.create(name='Alice', email='alice@example.com', message='first', status='new')
        GeneralEnquiry.objects.create(name='Bob', email='bob@example.com', message='second', status='in_progress')
        GeneralEnquiry.objects.create(name='Charlie', email='charlie@example.com', message='third', status='resolved')

        self.client.force_authenticate(user=self.admin)
        list_url = reverse('general_enquiry_list')

        # 1. Filter by status
        response = self.client.get(list_url, {'status': 'in_progress'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Bob')

        # 2. Search query
        response = self.client.get(list_url, {'search': 'char'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Charlie')

        # 3. Sorting by name
        response = self.client.get(list_url, {'ordering': 'name'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item['name'] for item in response.data]
        self.assertEqual(names, ['Alice', 'Bob', 'Charlie'])

        # 4. Sorting desc
        response = self.client.get(list_url, {'ordering': '-name'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item['name'] for item in response.data]
        self.assertEqual(names, ['Charlie', 'Bob', 'Alice'])

        # 5. Pagination
        response = self.client.get(list_url, {'page': 1, 'page_size': 2, 'ordering': 'name'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 3)
        self.assertEqual(len(response.data['results']), 2)
        self.assertEqual(response.data['results'][0]['name'], 'Alice')
        self.assertEqual(response.data['results'][1]['name'], 'Bob')

    def test_update_enquiry_status(self):
        """Test admin can update status of an enquiry."""
        enquiry = GeneralEnquiry.objects.create(name='Alice', email='alice@example.com', message='first', status='new')
        
        detail_url = reverse('general_enquiry_detail', kwargs={'enquiry_id': enquiry.id})
        
        # Admin updates status
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(detail_url, {'status': 'in_progress'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        enquiry.refresh_from_db()
        self.assertEqual(enquiry.status, 'in_progress')
        
        # Check audit log
        from audit.models import AuditLog
        self.assertTrue(AuditLog.objects.filter(action='general_enquiry_updated').exists())

