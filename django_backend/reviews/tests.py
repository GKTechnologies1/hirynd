from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from candidates.models import Candidate
from users.models import Profile
from .models import Review

User = get_user_model()

class ReviewsAPITests(TestCase):
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

        # Create Candidate
        self.candidate_user = User.objects.create_user(
            email='candidate@hyrind.com',
            password='password',
            role='candidate',
            approval_status='approved'
        )
        Profile.objects.create(user=self.candidate_user, full_name='Jane Doe')
        self.candidate = Candidate.objects.create(
            user=self.candidate_user,
            status='approved'
        )

        # Create Another Candidate (without review)
        self.other_user = User.objects.create_user(
            email='other@hyrind.com',
            password='password',
            role='candidate',
            approval_status='approved'
        )
        Profile.objects.create(user=self.other_user, full_name='Bob Smith')
        self.other_candidate = Candidate.objects.create(
            user=self.other_user,
            status='approved'
        )

        # URLs
        self.me_url = reverse('candidate_review_me')
        self.admin_list_url = reverse('admin_list_reviews')
        self.public_list_url = reverse('list_public_reviews')

    def test_public_reviews_list_empty(self):
        response = self.client.get(self.public_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_candidate_manage_own_review(self):
        # 1. Access reviews/me as unauthenticated
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Authenticate as candidate
        self.client.force_authenticate(user=self.candidate_user)

        # GET: Should return exists=False, review=None
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['exists'])
        self.assertIsNone(response.data['review'])

        # POST: Create a new review
        payload = {
            'rating': 4.5,
            'review_text': 'Great experience!',
            'job_title': 'Software Engineer'
        }
        response = self.client.post(self.me_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['rating'], 4.5)
        self.assertEqual(response.data['review_text'], 'Great experience!')
        self.assertEqual(response.data['status'], 'open')
        self.assertFalse(response.data['is_approved'])

        # GET: Should now return exists=True
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['exists'])
        self.assertEqual(response.data['review']['rating'], 4.5)

        # POST: Update review (partial update check)
        update_payload = {
            'rating': 5.0,
            'review_text': 'Excellent experience!'
        }
        response = self.client.post(self.me_url, update_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['rating'], 5.0)
        self.assertEqual(response.data['review_text'], 'Excellent experience!')

    def test_admin_review_management(self):
        # Create an unapproved review for the candidate
        review = Review.objects.create(
            candidate=self.candidate,
            rating=4.0,
            review_text='Good stuff',
            job_title='DevOps Engineer',
            is_approved=False,
            status='open'
        )

        # Access admin endpoints as candidate - should fail
        self.client.force_authenticate(user=self.candidate_user)
        response = self.client.get(self.admin_list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Authenticate as Admin
        self.client.force_authenticate(user=self.admin_user)

        # List reviews
        response = self.client.get(self.admin_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], str(review.id))

        # Approve review via patch
        detail_url = reverse('admin_manage_review', kwargs={'review_id': review.id})
        response = self.client.patch(detail_url, {'is_approved': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_approved'])
        self.assertEqual(response.data['status'], 'approved')

        # Check public list (should show the approved review)
        self.client.force_authenticate(user=None)
        response = self.client.get(self.public_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['candidate_name'], 'Jane Doe')

        # Soft delete review as admin
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['detail'], 'Review soft-deleted successfully.')

        # Hard delete (delete again when status is deleted)
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['detail'], 'Review permanently deleted.')
