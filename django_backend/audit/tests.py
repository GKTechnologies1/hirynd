from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from candidates.models import Candidate
from users.models import Profile
from audit.models import AuditLog

User = get_user_model()

class AuditLogRetrievalTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Admin
        self.admin_user = User.objects.create_user(
            email='admin@hyrind.com',
            password='password',
            role='admin',
            approval_status='approved'
        )
        Profile.objects.create(user=self.admin_user, full_name='Admin User')

        # Create Recruiter
        self.recruiter_user = User.objects.create_user(
            email='recruiter@hyrind.com',
            password='password',
            role='recruiter',
            approval_status='approved'
        )
        Profile.objects.create(user=self.recruiter_user, full_name='Recruiter Jane')

        # Create Candidate
        self.candidate_user = User.objects.create_user(
            email='candidate@hyrind.com',
            password='password',
            role='candidate',
            approval_status='approved'
        )
        Profile.objects.create(user=self.candidate_user, full_name='Candidate John')
        self.candidate = Candidate.objects.create(
            user=self.candidate_user,
            status='approved'
        )

        # Log action: login for candidate user (target_id is user.id)
        AuditLog.objects.create(
            actor=self.candidate_user,
            action='user_login',
            target_id=str(self.candidate_user.id),
            target_type='user',
            details={'role': 'candidate'}
        )

        # Log action: profile change for candidate profile (target_id is candidate.id)
        AuditLog.objects.create(
            actor=self.admin_user,
            action='candidate_status_updated',
            target_id=str(self.candidate.id),
            target_type='candidate',
            details={'status': 'approved'}
        )

        # Log action: login for recruiter user (target_id is user.id)
        AuditLog.objects.create(
            actor=self.recruiter_user,
            action='user_login',
            target_id=str(self.recruiter_user.id),
            target_type='user',
            details={'role': 'recruiter'}
        )

    def test_global_audit_logs(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('global_audit_logs')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return all 3 audit logs
        self.assertEqual(len(response.data), 3)

    def test_candidate_audit_logs_retrieval_by_candidate_profile_id(self):
        self.client.force_authenticate(user=self.admin_user)
        # Retrieve logs by sending the candidate's profile ID
        url = reverse('candidate_audit_logs', kwargs={'candidate_id': self.candidate.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should return both candidate login log (associated to user.id) and candidate status updated log (associated to candidate.id)
        self.assertEqual(len(response.data), 2)
        actions = [log['action'] for log in response.data]
        self.assertIn('user_login', actions)
        self.assertIn('candidate_status_updated', actions)

    def test_recruiter_audit_logs_retrieval_by_recruiter_user_id(self):
        self.client.force_authenticate(user=self.admin_user)
        # Retrieve logs by sending the recruiter's user ID
        url = reverse('candidate_audit_logs', kwargs={'candidate_id': self.recruiter_user.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should return the recruiter's login log (associated to recruiter_user.id)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['action'], 'user_login')
        self.assertEqual(response.data[0]['actor_name'], 'Recruiter Jane')
