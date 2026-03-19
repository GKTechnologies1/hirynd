from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings

from .models import User
from .serializers import (
    RegisterSerializer, UserSerializer, ApproveUserSerializer,
    UserListSerializer, ChangePasswordSerializer,
)
from .permissions import IsAdmin
from audit.utils import log_action
from notifications.utils import send_email


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()

    log_action(
        actor=user, action='registration_created',
        target_id=str(user.id), target_type='user',
        details={'role': user.role},
    )

    # Email to candidate
    name = user.profile.full_name if hasattr(user, 'profile') else user.email
    send_email(
        to=user.email,
        subject='Registration Received – Hyrind',
        html=f'<p>Hi {name},</p>'
             f'<p>Thank you for registering with Hyrind. Your account is under review.</p>'
             f'<p>Expected review time: 24–48 hours.</p>',
    )

    # Email to admin
    send_email(
        to=settings.ADMIN_NOTIFICATION_EMAIL,
        subject=f'New {user.role} registration – {name}',
        html=f'<p><strong>{name}</strong> ({user.email}) registered as <em>{user.role}</em>.</p>'
             f'<p><a href="{settings.SITE_URL}/admin-dashboard/approvals">Review in Admin Dashboard</a></p>',
    )

    return Response({'message': 'Registration successful. Awaiting admin approval.'}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get('email', '').lower()
    password = request.data.get('password', '')
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.check_password(password):
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    if user.approval_status != 'approved' and user.role != 'admin':
        return Response({
            'error': 'Account not yet approved',
            'approval_status': user.approval_status,
        }, status=status.HTTP_403_FORBIDDEN)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get('refresh')
        token = RefreshToken(refresh_token)
        token.blacklist()
    except Exception:
        pass
    return Response({'message': 'Logged out'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    profile = request.user.profile
    for field in ['full_name', 'phone', 'avatar_url']:
        if field in request.data:
            setattr(profile, field, request.data[field])
    profile.save()
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = request.user
    if not user.check_password(serializer.validated_data['current_password']):
        return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(serializer.validated_data['new_password'])
    user.save()

    log_action(user, 'password_updated', str(user.id), 'user', {})
    return Response({'message': 'Password updated successfully'})


@api_view(['GET'])
@permission_classes([IsAdmin])
def pending_approvals(request):
    users = User.objects.filter(approval_status='pending').select_related('profile').order_by('-created_at')
    return Response(UserListSerializer(users, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def approve_user(request):
    serializer = ApproveUserSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        user = User.objects.get(id=serializer.validated_data['user_id'])
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    action = serializer.validated_data['action']
    old_status = user.approval_status
    user.approval_status = action
    user.save()

    # Update candidate status if approved
    if action == 'approved' and hasattr(user, 'candidate'):
        user.candidate.status = 'approved'
        user.candidate.save()

    log_action(
        actor=request.user,
        action=f'registration_{action}',
        target_id=str(user.id),
        target_type='user',
        details={'old_status': old_status, 'new_status': action},
    )

    name = user.profile.full_name if hasattr(user, 'profile') else user.email
    if action == 'approved':
        send_email(
            to=user.email,
            subject='Your Hyrind Profile Has Been Approved',
            html=f'<p>Hi {name},</p><p>Your account has been approved. You can now log in to the portal.</p>'
                 f'<p><a href="{settings.SITE_URL}/{user.role}-login">Login here</a></p>',
        )
    else:
        send_email(
            to=user.email,
            subject='Update on Your Hyrind Registration',
            html=f'<p>Hi {name},</p><p>Your registration has been reviewed and was not approved at this time.</p>',
        )

    return Response({'message': f'User {action}'})


@api_view(['GET'])
@permission_classes([IsAdmin])
def all_users(request):
    role = request.query_params.get('role')
    qs = User.objects.select_related('profile').order_by('-created_at')
    if role:
        qs = qs.filter(role=role)
    return Response(UserListSerializer(qs, many=True).data)
