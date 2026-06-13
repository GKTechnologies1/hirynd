from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date
from candidates.models import Candidate, CredentialVersion
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
        self.assertEqual(self.candidate.current_location, 'Remote')
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

        response = self.client.post(self.upsert_url, {'data': self.valid_payload}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        versions = CredentialVersion.objects.filter(candidate=self.candidate)
        self.assertEqual(versions.count(), 1)
        self.assertEqual(versions.first().edited_by, self.admin_user)
