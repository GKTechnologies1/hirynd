from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from users.permissions import IsAdmin, IsCandidate
from candidates.models import Candidate
from .models import Review
from .serializers import ReviewSerializer
from audit.utils import log_action

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsCandidate])
def candidate_review_me(request):
    """
    GET /api/reviews/me/ - Get logged-in candidate's review.
    POST /api/reviews/me/ - Create or update logged-in candidate's review.
    """
    try:
        candidate = request.user.candidate
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Get existing review if any
    review = Review.objects.filter(candidate=candidate).first()

    if request.method == 'GET':
        if not review:
            return Response({'exists': False, 'review': None})
        serializer = ReviewSerializer(review)
        return Response({'exists': True, 'review': serializer.data})

    elif request.method == 'POST':
        # Create or update
        serializer = ReviewSerializer(review, data=request.data, partial=True) if review else ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Save review with candidate association
        review_obj = serializer.save(candidate=candidate)
        
        # If review was modified/created, let's reset its is_approved state to false so admin has to re-approve it
        if review:
            review_obj.is_approved = False
            review_obj.save()
        
        # Log audit action
        action_name = 'review_updated' if review else 'review_created'
        log_action(request.user, action_name, str(review_obj.id), 'review', {'rating': review_obj.rating})
        
        return Response(ReviewSerializer(review_obj).data, status=status.HTTP_201_CREATED if not review else status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_list_reviews(request):
    """
    GET /api/reviews/admin/ - List all reviews for admin.
    """
    reviews = Review.objects.all()
    serializer = ReviewSerializer(reviews, many=True)
    return Response(serializer.data)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def admin_manage_review(request, review_id):
    """
    PATCH /api/reviews/admin/<review_id>/ - Update review (e.g. approve/reject).
    DELETE /api/reviews/admin/<review_id>/ - Delete review.
    """
    try:
        review = Review.objects.get(id=review_id)
    except Review.DoesNotExist:
        return Response({'error': 'Review not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        log_action(request.user, 'review_deleted', str(review_id), 'review', {'candidate': review.candidate.user.email})
        review.delete()
        return Response({'detail': 'Review deleted successfully.'})

    elif request.method == 'PATCH':
        is_approved = request.data.get('is_approved')
        if is_approved is not None:
            review.is_approved = is_approved
            review.save()
            action_name = 'review_approved' if is_approved else 'review_unapproved'
            log_action(request.user, action_name, str(review.id), 'review', {'is_approved': is_approved})
            
        serializer = ReviewSerializer(review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def list_public_reviews(request):
    """
    GET /api/reviews/public/ - List all approved reviews for public reviews page.
    """
    reviews = Review.objects.filter(is_approved=True)
    serializer = ReviewSerializer(reviews, many=True)
    return Response(serializer.data)
