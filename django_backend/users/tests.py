from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from audit.models import AuditLog
from users.models import Profile

User = get_user_model()

class UserAuthAuditTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = 'securepassword123'
        self.user = User.objects.create_user(
            email='testuser@hyrind.com',
            password=self.password,
            role='candidate',
            approval_status='approved'
        )
        Profile.objects.create(user=self.user, full_name='Test User')
        self.login_url = reverse('login')
        self.logout_url = reverse('logout')

    def test_login_and_logout_audit_logging(self):
        # 1. Initially no login/logout audit logs exist for this user
        self.assertFalse(AuditLog.objects.filter(actor=self.user, action='user_login').exists())
        self.assertFalse(AuditLog.objects.filter(actor=self.user, action='user_logout').exists())

        # 2. Perform Login
        login_response = self.client.post(self.login_url, {
            'email': self.user.email,
            'password': self.password
        }, format='json')
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

        # Verify login log was created
        login_log = AuditLog.objects.filter(actor=self.user, action='user_login').first()
        self.assertIsNotNone(login_log)
        self.assertEqual(login_log.target_id, str(self.user.id))
        self.assertEqual(login_log.target_type, 'user')
        self.assertEqual(login_log.details.get('role'), 'candidate')

        # Get the refresh token from response
        refresh_token = login_response.data.get('refresh')
        access_token = login_response.data.get('access')

        # 3. Perform Logout (Authenticated)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_response = self.client.post(self.logout_url, {
            'refresh': refresh_token
        }, format='json')
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)

        # Verify logout log was created
        logout_log = AuditLog.objects.filter(actor=self.user, action='user_logout').first()
        self.assertIsNotNone(logout_log)
        self.assertEqual(logout_log.target_id, str(self.user.id))
        self.assertEqual(logout_log.target_type, 'user')
        self.assertEqual(logout_log.details.get('role'), 'candidate')

    def test_auto_logout_inactivity_audit_logging(self):
        """Test that passing reason: 'auto_logout_inactivity' logs an auto_logout_inactivity audit event."""
        recruiter = User.objects.create_user(
            email='recruiter_inactivity@hyrind.com',
            password='password123',
            role='recruiter',
            approval_status='approved'
        )
        Profile.objects.create(user=recruiter, full_name='Recruiter User')
        
        self.client.force_authenticate(user=recruiter)
        response = self.client.post(self.logout_url, {'reason': 'auto_logout_inactivity'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        log_entry = AuditLog.objects.filter(actor=recruiter, action='auto_logout_inactivity').first()
        self.assertIsNotNone(log_entry)
        self.assertEqual(log_entry.details.get('role'), 'recruiter')
        self.assertEqual(log_entry.details.get('reason'), 'auto_logout_inactivity')
