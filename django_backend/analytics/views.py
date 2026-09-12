import datetime
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from users.permissions import IsAdmin
from rest_framework.response import Response
from rest_framework import status
from .models import AnalyticsVisitor, AnalyticsSession, AnalyticsPageView, AnalyticsEvent
from users.models import User

class OptionalJWTAuthentication(JWTAuthentication):
    """
    Safely authenticates JWT if present and valid,
    but does not throw 401 if token is expired or absent.
    """
    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except Exception:
            return None

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')

@api_view(['POST'])
@authentication_classes([OptionalJWTAuthentication])
@permission_classes([AllowAny])
def track_page_view(request):
    data = request.data
    visitor_id = data.get('visitor_id')
    session_id = data.get('session_id')
    url_path = data.get('url_path')
    
    if not visitor_id or not url_path:
        return Response({'error': 'visitor_id and url_path are required'}, status=status.HTTP_400_BAD_REQUEST)

    ip = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT')

    # Get or create visitor
    visitor, _ = AnalyticsVisitor.objects.get_or_create(
        visitor_id=visitor_id,
        defaults={
            'ip_address': ip,
            'user_agent': user_agent
        }
    )
    
    # Update last visit and IP/user agent
    visitor.last_visit = timezone.now()
    if ip and visitor.ip_address != ip:
        visitor.ip_address = ip
    if user_agent and visitor.user_agent != user_agent:
        visitor.user_agent = user_agent

    user = None
    if request.user and request.user.is_authenticated:
        user = request.user
        if visitor.user != user:
            visitor.user = user
    elif visitor.user:
        user = visitor.user

    visitor.save(update_fields=['last_visit', 'ip_address', 'user_agent', 'user'])

    # Get or create session
    session = None
    if session_id:
        session, _ = AnalyticsSession.objects.get_or_create(
            session_id=session_id,
            defaults={'visitor': visitor}
        )
        session.ended_at = timezone.now()
        session.save(update_fields=['ended_at'])

    # Record page view
    AnalyticsPageView.objects.create(
        visitor=visitor,
        session=session,
        user=user,
        url_path=url_path,
        referrer=data.get('referrer'),
        device_type=data.get('device_type')
    )

    return Response({'status': 'ok'}, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAdmin])
def dashboard_stats(request):
    date_range = request.query_params.get('range', '7days')
    now = timezone.now()
    
    if date_range == 'today':
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif date_range == '30days':
        start_date = now - datetime.timedelta(days=30)
    elif date_range == '90days':
        start_date = now - datetime.timedelta(days=90)
    elif date_range == 'all':
        start_date = now - datetime.timedelta(days=3650) # 10 years
    else:
        start_date = now - datetime.timedelta(days=7)

    # Base Queries
    page_views = AnalyticsPageView.objects.filter(timestamp__gte=start_date)
    visitors = AnalyticsVisitor.objects.filter(last_visit__gte=start_date)
    events = AnalyticsEvent.objects.filter(timestamp__gte=start_date)
    
    # ── Active Now (last 5 minutes) ──
    active_now_threshold = now - datetime.timedelta(minutes=5)
    active_now_visitors = AnalyticsVisitor.objects.filter(last_visit__gte=active_now_threshold).count()
    active_now_users = User.objects.filter(last_activity__gte=active_now_threshold).count()
    
    # ── Today Stats ──
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    page_views_today = AnalyticsPageView.objects.filter(timestamp__gte=today_start).count()
    unique_visitors_today = AnalyticsPageView.objects.filter(timestamp__gte=today_start).values('visitor').distinct().count()
    
    # Logged In Today: union of AnalyticsEvent, AuditLog, and User.last_login
    from audit.models import AuditLog
    logged_in_user_ids = set(
        AnalyticsEvent.objects.filter(timestamp__gte=today_start, event_type='login_success')
        .values_list('user_id', flat=True)
    )
    logged_in_user_ids.update(
        AuditLog.objects.filter(created_at__gte=today_start, action='user_login')
        .values_list('actor_id', flat=True)
    )
    logged_in_user_ids.update(
        User.objects.filter(last_login__gte=today_start)
        .values_list('id', flat=True)
    )
    logged_in_user_ids.discard(None)
    logged_in_today = len(logged_in_user_ids)

    # Active Today: distinct users with activity today
    active_users_today = User.objects.filter(
        Q(last_activity__gte=today_start) | Q(analytics_page_views__timestamp__gte=today_start)
    ).distinct().count()

    # ── Homepage / Main Page Visitor Tracking ──
    homepage_q = Q(url_path='/') | Q(url_path__startswith='/?') | Q(url_path='')
    homepage_pvs_period = page_views.filter(homepage_q)
    homepage_views_period = homepage_pvs_period.count()
    homepage_visitors_period = homepage_pvs_period.values('visitor').distinct().count()

    homepage_pvs_today = AnalyticsPageView.objects.filter(timestamp__gte=today_start).filter(homepage_q)
    homepage_views_today = homepage_pvs_today.count()
    homepage_visitors_today = homepage_pvs_today.values('visitor').distinct().count()

    # ── KPI Stats for website ──
    total_page_views = page_views.count()
    unique_visitors = page_views.values('visitor').distinct().count()
    total_registered_users = User.objects.count()
    all_time_visitors = AnalyticsVisitor.objects.count()
    all_time_page_views = AnalyticsPageView.objects.count()
    
    # Top Pages
    top_pages = (
        page_views.values('url_path')
        .annotate(views=Count('id'), unique_visitors=Count('visitor', distinct=True))
        .order_by('-views')[:10]
    )

    # Device breakdown
    device_breakdown = list(
        page_views.values('device_type')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # Trend Chart Data (daily grouping)
    views_data = page_views.values('timestamp', 'visitor_id')
    trend_dict = {}
    
    for v in views_data:
        date_str = v['timestamp'].strftime('%Y-%m-%d')
        if date_str not in trend_dict:
            trend_dict[date_str] = {'date': date_str, 'views': 0, 'visitors': set()}
        trend_dict[date_str]['views'] += 1
        trend_dict[date_str]['visitors'].add(v['visitor_id'])
        
    trend_chart = []
    for k in sorted(trend_dict.keys()):
        trend_chart.append({
            'date': k,
            'views': trend_dict[k]['views'],
            'unique_visitors': len(trend_dict[k]['visitors'])
        })

    # Login Activity
    successful_logins = events.filter(event_type='login_success').count()
    failed_logins = events.filter(event_type='login_failed').count()
    
    # User roles active
    active_candidates = User.objects.filter(
        Q(last_activity__gte=start_date) | Q(analytics_page_views__timestamp__gte=start_date),
        role='candidate'
    ).distinct().count()
    active_recruiters = User.objects.filter(
        Q(last_activity__gte=start_date) | Q(analytics_page_views__timestamp__gte=start_date),
        role__in=['recruiter', 'team_lead', 'team_manager']
    ).distinct().count()

    # Recent User and Visitor Activity Tracking (Last 30 page visits)
    recent_pvs = (
        page_views.select_related('user', 'visitor')
        .order_by('-timestamp')[:30]
    )
    recent_activity = []
    for pv in recent_pvs:
        u = pv.user or (pv.visitor.user if pv.visitor else None)
        user_name = None
        user_email = None
        user_role = 'guest'
        if u:
            full_name = getattr(getattr(u, 'profile', None), 'full_name', '')
            user_name = full_name if full_name else u.email
            user_email = u.email
            user_role = u.role
        
        recent_activity.append({
            'id': str(pv.id),
            'url_path': pv.url_path,
            'timestamp': pv.timestamp.isoformat(),
            'visitor_id': pv.visitor.visitor_id if pv.visitor else 'Unknown',
            'user_name': user_name,
            'user_email': user_email,
            'user_role': user_role,
            'device_type': pv.device_type or 'desktop',
            'referrer': pv.referrer or 'Direct',
            'ip_address': pv.visitor.ip_address if pv.visitor else 'Unknown',
        })

    return Response({
        'kpis': {
            'active_now': active_now_visitors,
            'active_users_now': active_now_users,
            'active_users_today': active_users_today,
            'logged_in_today': logged_in_today,
            'visitors_today': unique_visitors_today,
            'page_views_today': page_views_today,
            'homepage_visitors_today': homepage_visitors_today,
            'homepage_views_today': homepage_views_today,
            'homepage_visitors_period': homepage_visitors_period,
            'homepage_views_period': homepage_views_period,
            'unique_visitors': unique_visitors,
            'total_page_views': total_page_views,
            'all_time_visitors': all_time_visitors,
            'all_time_page_views': all_time_page_views,
            'total_registered_users': total_registered_users,
        },
        'top_pages': list(top_pages),
        'device_breakdown': device_breakdown,
        'trend_chart': trend_chart,
        'recent_activity': recent_activity,
        'login_activity': {
            'successful_logins': successful_logins,
            'failed_logins': failed_logins,
            'active_candidates': active_candidates,
            'active_recruiters': active_recruiters,
        }
    })
