import uuid
import secrets

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.utils import timezone

from .models import User, Profile, PasswordResetToken
from .serializers import (
    RegisterSerializer, UserSerializer, ApproveUserSerializer,
    UserListSerializer, ChangePasswordSerializer,
)
from .permissions import IsAdmin, IsSelfOrAdmin
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

    name = user.profile.full_name if hasattr(user, 'profile') else user.email
    send_email(
        to=user.email,
        subject='Registration Received – Hyrind',
        html=f'<p>Hi {name},</p>'
             f'<p>Thank you for registering with Hyrind. Your account is under review.</p>'
             f'<p>Expected review time: 24–48 hours.</p>',
    )
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

    if not user.is_active:
        return Response({'error': 'Account has been deactivated'}, status=status.HTTP_403_FORBIDDEN)

    if user.approval_status != 'approved' and user.role != 'admin':
        return Response({
            'error': 'Account not yet approved',
            'approval_status': user.approval_status,
        }, status=status.HTTP_403_FORBIDDEN)

    # Log login activity
    log_action(user, 'user_login', str(user.id), 'user', {'ip': request.META.get('REMOTE_ADDR', '')})

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


# ─── Forgot / Reset Password ───

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    email = request.data.get('email', '').lower()
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Don't reveal if email exists
        return Response({'message': 'If an account exists, a reset link has been sent.'})

    token = secrets.token_urlsafe(48)
    PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
    PasswordResetToken.objects.create(
        user=user,
        token=token,
        expires_at=timezone.now() + timezone.timedelta(hours=1),
    )

    reset_url = f"{settings.SITE_URL}/reset-password?token={token}"
    name = user.profile.full_name if hasattr(user, 'profile') else user.email
    send_email(
        to=user.email,
        subject='Reset Your HYRIND Password',
        html=f'<p>Hi {name},</p>'
             f'<p>You requested a password reset. Click the button below to set a new password:</p>'
             f'<p><a href="{reset_url}" style="display:inline-block;padding:12px 24px;background:#1a365d;color:#fff;text-decoration:none;border-radius:8px;">Reset Password</a></p>'
             f'<p>This link expires in 1 hour.</p>'
             f'<p>If you didn\'t request this, ignore this email.</p>',
        email_type='password_reset',
    )

    log_action(user, 'password_reset_requested', str(user.id), 'user', {})
    return Response({'message': 'If an account exists, a reset link has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    token = request.data.get('token', '')
    new_password = request.data.get('new_password', '')
    confirm_password = request.data.get('confirm_password', '')

    if not token or not new_password:
        return Response({'error': 'Token and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
    if new_password != confirm_password:
        return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        reset_token = PasswordResetToken.objects.get(token=token, is_used=False)
    except PasswordResetToken.DoesNotExist:
        return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

    if reset_token.expires_at < timezone.now():
        reset_token.is_used = True
        reset_token.save()
        return Response({'error': 'Token has expired.'}, status=status.HTTP_400_BAD_REQUEST)

    user = reset_token.user
    user.set_password(new_password)
    user.save()

    reset_token.is_used = True
    reset_token.save()

    log_action(user, 'password_reset_completed', str(user.id), 'user', {})
    return Response({'message': 'Password has been reset successfully.'})


# ─── Admin Approval & User Management ───

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
    approval_status = request.query_params.get('status')
    search = request.query_params.get('search', '')
    qs = User.objects.select_related('profile').order_by('-created_at')
    if role:
        qs = qs.filter(role=role)
    if approval_status:
        qs = qs.filter(approval_status=approval_status)
    if search:
        from django.db.models import Q
        qs = qs.filter(
            Q(email__icontains=search) |
            Q(profile__full_name__icontains=search)
        )
    return Response(UserListSerializer(qs, many=True).data)


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def admin_update_user(request, user_id):
    """Admin can edit user role, approval_status, is_active, and profile fields."""
    try:
        target_user = User.objects.select_related('profile').get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    changes = {}
    for field in ['role', 'approval_status', 'is_active']:
        if field in request.data:
            old_val = getattr(target_user, field)
            setattr(target_user, field, request.data[field])
            changes[field] = {'old': str(old_val), 'new': str(request.data[field])}
    target_user.save()

    # Update profile fields
    if hasattr(target_user, 'profile'):
        profile = target_user.profile
        for field in ['full_name', 'phone', 'avatar_url']:
            if field in request.data:
                setattr(profile, field, request.data[field])
        profile.save()

    log_action(request.user, 'admin_user_update', str(user_id), 'user', changes)
    return Response(UserListSerializer(target_user).data)


@api_view(['DELETE'])
@permission_classes([IsAdmin])
def admin_delete_user(request, user_id):
    """Admin can deactivate (soft delete) a user."""
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # Prevent self-delete
    if str(target_user.id) == str(request.user.id):
        return Response({'error': 'Cannot deactivate your own account'}, status=status.HTTP_400_BAD_REQUEST)

    target_user.is_active = False
    target_user.save()
    log_action(request.user, 'admin_user_deactivated', str(user_id), 'user', {})
    return Response({'message': 'User deactivated'})


# ─── Admin Dashboard Stats ───

@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_dashboard_stats(request):
    """Return all KPI metrics for the admin dashboard."""
    from candidates.models import Candidate
    from billing.models import Subscription, Payment
    from recruiters.models import JobLinkEntry
    from audit.models import AuditLog

    total_users = User.objects.count()
    total_candidates = User.objects.filter(role='candidate').count()
    total_recruiters = User.objects.filter(role__in=['recruiter', 'team_lead', 'team_manager']).count()
    total_admins = User.objects.filter(role='admin').count()
    pending_approvals_count = User.objects.filter(approval_status='pending').count()

    active_candidates = Candidate.objects.filter(status='active_marketing').count()
    total_job_postings = JobLinkEntry.objects.count()
    total_applications = JobLinkEntry.objects.filter(application_status='applied').count()

    # Revenue
    from django.db.models import Sum
    total_revenue = Payment.objects.filter(status='completed').aggregate(total=Sum('amount'))['total'] or 0

    # Pipeline counts
    pipeline = {}
    for s in ['pending_approval', 'approved', 'intake_submitted', 'roles_suggested', 'roles_confirmed',
              'paid', 'credential_completed', 'active_marketing', 'paused', 'cancelled', 'placed']:
        pipeline[s] = Candidate.objects.filter(status=s).count()

    # Billing alerts
    billing_alerts = Subscription.objects.filter(status__in=['past_due', 'grace_period']).count()

    # Recent registrations (last 7 days)
    from datetime import timedelta
    week_ago = timezone.now() - timedelta(days=7)
    recent_registrations = User.objects.filter(created_at__gte=week_ago).count()

    # Recent activity logs
    recent_logs = AuditLog.objects.select_related('actor__profile').order_by('-created_at')[:10]
    recent_activity = [{
        'id': str(l.id),
        'action': l.action,
        'actor_name': l.actor.profile.full_name if l.actor and hasattr(l.actor, 'profile') else 'System',
        'target_type': l.target_type,
        'created_at': l.created_at.isoformat(),
    } for l in recent_logs]

    return Response({
        'total_users': total_users,
        'total_candidates': total_candidates,
        'total_recruiters': total_recruiters,
        'total_admins': total_admins,
        'pending_approvals': pending_approvals_count,
        'active_candidates': active_candidates,
        'total_job_postings': total_job_postings,
        'total_applications': total_applications,
        'total_revenue': float(total_revenue),
        'pipeline': pipeline,
        'billing_alerts': billing_alerts,
        'recent_registrations': recent_registrations,
        'recent_activity': recent_activity,
    })
