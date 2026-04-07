from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import User
from candidates.models import Candidate
from .serializers import (
    RegisterSerializer, UserSerializer, ApproveUserSerializer,
    UserListSerializer, ChangePasswordSerializer, ContactSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
)
from .permissions import IsAdmin
from audit.utils import log_action
from notifications.utils import send_email, get_styled_email_html

from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    # Daily Limit Check (Spec 3.4)
    from django.utils import timezone
    today = timezone.now().date()
    daily_count = User.objects.filter(created_at__date=today).count()
    if daily_count >= 10:
        return Response({
            'error': 'Daily registration limit reached. Please try again tomorrow.'
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)

    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        import logging
        logger = logging.getLogger('django')
        logger.error("Registration validation errors: %s", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
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
        html=get_styled_email_html(
            name,
            '<p>Thank you for registering with Hyrind. Your account is under review.</p>'
            '<p>Expected review time: 24–48 hours. Our team will notify you once your profile is live.</p>',
            action_label="Visit Hyrind",
            action_url="/"
        ),
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
        return Response({'error': 'Invalid email id'}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.check_password(password):
        return Response({'error': 'Invalid password'}, status=status.HTTP_401_UNAUTHORIZED)

    if user.approval_status != 'approved' and user.role != 'admin':
        return Response({
            'error': 'Account not yet approved',
            'approval_status': user.approval_status,
        }, status=status.HTTP_403_FORBIDDEN)

    # Track login in audit log
    log_action(user, 'user_login', str(user.id), 'user', {'role': user.role})

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
    if 'first_name' in request.data and 'last_name' in request.data:
        profile.full_name = f"{request.data['first_name']} {request.data['last_name']}".strip()
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
    current_password = serializer.validated_data.get('current_password')
    if current_password and not user.check_password(current_password):
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

    # Update candidate status if approved, OR create the Candidate record
    if action == 'approved' and user.role == 'candidate':
        candidate_obj, _ = Candidate.objects.get_or_create(
            user=user,
            defaults={'status': 'approved'},
        )
        if candidate_obj.status == 'pending_approval':
            candidate_obj.status = 'approved'
            candidate_obj.save(update_fields=['status'])

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
            html=get_styled_email_html(
                name,
                '<p>Great news! Your account has been approved. You can now log in to the portal and complete your intake form.</p>',
                action_label="Login Now",
                action_url=f"/{user.role}-login"
            ),
        )
    else:
        send_email(
            to=user.email,
            subject='Update on Your Hyrind Registration',
            html=get_styled_email_html(
                name,
                '<p>Your registration has been reviewed and was not approved at this time. If you have questions, please contact our support team.</p>'
            ),
        )

    return Response({'message': f'User {action}'})


@api_view(['GET'])
@permission_classes([IsAdmin])
def all_users(request):
    role = request.query_params.get('role')
    search = request.query_params.get('search', '').strip()
    qs = User.objects.select_related('profile').order_by('-created_at')
    if role:
        qs = qs.filter(role=role)
    if search:
        from django.db.models import Q
        qs = qs.filter(
            Q(email__icontains=search) |
            Q(profile__full_name__icontains=search)
        )
    total = qs.count()
    page = int(request.query_params.get('page', 0))
    page_size = int(request.query_params.get('page_size', 0))
    if page > 0 and page_size > 0:
        start = (page - 1) * page_size
        qs = qs[start:start + page_size]
    return Response({'total': total, 'results': UserListSerializer(qs, many=True).data})


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def manage_user(request, user_id):
    """Admin: view, edit, or delete any user."""
    try:
        user = User.objects.select_related('profile').get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(UserListSerializer(user).data)

    if request.method == 'DELETE':
        if user.is_superuser:
            return Response({'error': 'Cannot delete superuser'}, status=400)
        log_action(request.user, 'user_deleted', str(user.id), 'user', {'email': user.email})
        user.delete()
        return Response({'detail': 'User deleted'})

    # PATCH — only update fields that actually exist on the User model
    user_fields = ['email', 'role', 'approval_status', 'is_active']
    for field in user_fields:
        if field in request.data:
            setattr(user, field, request.data[field])
            
    # Check if admin is trying to update the user's password
    new_password = request.data.get('password')
    if new_password:
        user.set_password(new_password)
        
    user.save()

    # Profile fields (full_name, phone) live on the related Profile model
    profile_updates = {}
    if 'full_name' in request.data:
        profile_updates['full_name'] = request.data['full_name']
    if 'phone' in request.data:
        profile_updates['phone'] = request.data['phone']
    if profile_updates:
        profile = getattr(user, 'profile', None)
        if profile:
            for k, v in profile_updates.items():
                setattr(profile, k, v)
            profile.save(update_fields=list(profile_updates.keys()))

    log_action(request.user, 'user_updated', str(user.id), 'user', request.data)
    return Response(UserListSerializer(user).data)



@api_view(['POST'])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def submit_contact(request):
    serializer = ContactSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    mode = data['mode']
    
    if mode == 'interest':
        # Create user if not exists
        user, user_created = User.objects.get_or_create(
            email=data['email'],
            defaults={
                'role': 'candidate',
                'approval_status': 'pending',
            }
        )
        if user_created:
            user.set_unusable_password()
            user.save()
        
        # Create profile if not exists
        from .models import Profile
        Profile.objects.get_or_create(
            user=user,
            defaults={
                'full_name': data['name'],
                'phone': data.get('phone', ''),
            }
        )
        
        # Handle Resume File
        resume_url = ''
        resume_file = data.get('resume')
        if resume_file:
            import uuid
            ext = resume_file.name.split('.')[-1] if '.' in resume_file.name else 'bin'
            file_path = f'leads/resumes/{uuid.uuid4()}.{ext}'
            saved_path = default_storage.save(file_path, ContentFile(resume_file.read()))
            resume_url = saved_path

        # Create/Update Candidate with status='lead'
        candidate, cand_created = Candidate.objects.get_or_create(
            user=user,
            defaults={
                'status': 'lead',
                'university': data.get('university', ''),
                'major': data.get('major') or data.get('degree_major', ''),
                'graduation_year': data.get('graduation_year', ''),
                'visa_status': data.get('visa_status', ''),
                'current_location': data.get('current_location', ''),
                'referral_source': data.get('referral_source', ''),
                'referral_friend_name': data.get('referral_friend', ''),
                'notes': data.get('message', ''),
                'resume_url': resume_url,
            }
        )
        if not cand_created:
            if candidate.status == 'pending_approval':
                candidate.status = 'lead'
            
            # Also update fields if they were blank
            fields_to_update = []
            updates = {
                'university': data.get('university'),
                'major': data.get('major') or data.get('degree_major'),
                'graduation_year': data.get('graduation_year'),
                'visa_status': data.get('visa_status'),
                'current_location': data.get('current_location'),
                'referral_source': data.get('referral_source'),
                'referral_friend_name': data.get('referral_friend'),
                'notes': data.get('message', ''),
                'resume_url': resume_url,
            }
            for field, value in updates.items():
                if value and not getattr(candidate, field):
                    setattr(candidate, field, value)
                    fields_to_update.append(field)
            
            if 'status' not in fields_to_update:
                fields_to_update.append('status')
            candidate.save(update_fields=fields_to_update)

        # Notify admin of new lead
        admin_email = getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', 'support@hyrind.com')
        send_email(
            to=admin_email,
            subject=f'New Candidate Interest: {data["name"]}',
            html=f'<p><strong>{data["name"]}</strong> ({data["email"]}) has expressed interest.</p>'
                 f'<p>University: {data.get("university", "—")}</p>'
                 f'<p>Major: {data.get("major", "—")}</p>'
                 f'<p>Phone: {data.get("phone", "—")}</p>'
                 f'<p><a href="{settings.SITE_URL}/admin-dashboard">View in Dashboard</a></p>',
            email_type='admin_notification'
        )
        
        # Notify candidate
        send_email(
            to=data['email'],
            subject='Thank you for your interest in HYRIND!',
            html=get_styled_email_html(
                data['name'],
                '<p>Thank you for expressing interest in HYRIND. Our team will review your submission and reach out within 24–48 hours to schedule a discovery call.</p>',
                action_label="Explore Services",
                action_url="/services"
            ),
            email_type='interest_confirmation'
        )
        
        log_data = data.copy()
        if 'resume' in log_data:
            log_data.pop('resume')
        log_action(user, 'interest_form_submitted', str(user.id), 'user', log_data)
        return Response({'message': 'Interest form submitted successfully.'}, status=status.HTTP_201_CREATED)

    else:
        # General Inquiry
        admin_email = getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', 'support@hyrind.com')
        send_email(
            to=admin_email,
            subject=f'New General Inquiry: {data["name"]}',
            html=f'<p><strong>Name:</strong> {data["name"]}</p>'
                 f'<p><strong>Email:</strong> {data["email"]}</p>'
                 f'<p><strong>Message:</strong><br/>{data["message"]}</p>',
            email_type='admin_notification'
        )
        
        send_email(
            to=data['email'],
            subject='We received your message – HYRIND',
            html=f'<p>Hi {data["name"]},</p>'
                 f'<p>Thank you for reaching out! We have received your message and will get back to you within 24–48 hours.</p>',
            email_type='inquiry_confirmation'
        )
        
        return Response({'message': 'General inquiry submitted successfully.'})


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_analytics(request):
    """
    Returns aggregated stats for Admin Dashboard charts:
    - registrations_by_month: last 6 months user registrations
    - logins_by_month: last 6 months login events (from audit)
    - role_counts: user counts by role
    - status_counts: candidate counts by status
    """
    from django.db.models import Count
    from django.db.models.functions import TruncMonth
    from django.utils import timezone
    from datetime import timedelta
    from audit.models import AuditLog

    six_months_ago = timezone.now() - timedelta(days=180)

    # Registrations per month
    reg_qs = (
        User.objects.filter(created_at__gte=six_months_ago)
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )
    registrations = [
        {'month': r['month'].strftime('%b %Y'), 'count': r['count']}
        for r in reg_qs
    ]

    # Logins per month (from audit log)
    login_qs = (
        AuditLog.objects.filter(action='user_login', created_at__gte=six_months_ago)
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )
    logins = [
        {'month': l['month'].strftime('%b %Y'), 'count': l['count']}
        for l in login_qs
    ]

    # Role counts
    role_counts = list(User.objects.values('role').annotate(count=Count('id')))

    # Candidate status counts
    from candidates.models import Candidate
    status_counts = list(Candidate.objects.values('status').annotate(count=Count('id')))

    return Response({
        'registrations_by_month': registrations,
        'logins_by_month': logins,
        'role_counts': role_counts,
        'status_counts': status_counts,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email']

    try:
        user = User.objects.get(email=email)
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        reset_url = f"{settings.SITE_URL}/reset-password?uid={uid}&token={token}"
        
        send_email(
            to=user.email,
            subject='Password Reset Request – Hyrind',
            html=get_styled_email_html(
                getattr(user.profile, 'full_name', user.email),
                '<p>You requested a password reset for your Hyrind account.</p>'
                '<p>Click the button below to set a new password. This link will expire in 24 hours.</p>',
                action_label="Reset Password",
                action_url=reset_url
            ),
        )
        log_action(user, 'password_reset_requested', str(user.id), 'user', {})
    except User.DoesNotExist:
        # We don't reveal if user exists for security
        pass

    return Response({'message': 'If an account exists with this email, a reset link has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    uidb64 = serializer.validated_data['uidb64']
    token = serializer.validated_data['token']
    new_password = serializer.validated_data['new_password']

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({'error': 'Invalid reset link'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    
    log_action(user, 'password_reset_completed', str(user.id), 'user', {})
    
    send_email(
        to=user.email,
        subject='Password Reset Successful',
        html=f'<p>Hi,</p><p>Your password has been successfully reset. You can now log in with your new password.</p>',
    )
    
    return Response({'message': 'Password has been reset successfully.'})
