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

    def test_recruiter_refresh_inactivity_timeout(self):
        """Test that recruiters cannot refresh token if inactive for >15 minutes."""
        from datetime import timedelta
        from django.utils import timezone
        from rest_framework_simplejwt.tokens import RefreshToken

        recruiter = User.objects.create_user(
            email='recruiter_timeout@hyrind.com',
            password='password123',
            role='recruiter',
            approval_status='approved'
        )
        Profile.objects.create(user=recruiter, full_name='Recruiter Timeout')
        
        # Set last_activity to 16 minutes ago
        recruiter.last_activity = timezone.now() - timedelta(minutes=16)
        recruiter.save()

        refresh = RefreshToken.for_user(recruiter)
        refresh_url = reverse('token_refresh')
        response = self.client.post(refresh_url, {'refresh': str(refresh)}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Session expired due to inactivity', response.data.get('error', ''))

    def test_account_status_update(self):
        admin = User.objects.create_user(
            email='admin_test@hyrind.com',
            password='password123',
            role='admin',
            approval_status='approved'
        )
        recruiter = User.objects.create_user(
            email='recruiter_status@hyrind.com',
            password='password123',
            role='recruiter',
            approval_status='approved'
        )
        self.client.force_authenticate(user=admin)
        url = reverse('manage_user', kwargs={'user_id': recruiter.id})

        # Set account_status to resigned
        res = self.client.patch(url, {'account_status': 'resigned'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        recruiter.refresh_from_db()
        self.assertEqual(recruiter.account_status, 'resigned')
        self.assertFalse(recruiter.is_active)

        # Set account_status to terminated
        res = self.client.patch(url, {'account_status': 'terminated'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        recruiter.refresh_from_db()
        self.assertEqual(recruiter.account_status, 'terminated')
        self.assertFalse(recruiter.is_active)


