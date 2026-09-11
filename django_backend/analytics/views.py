import datetime
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from users.permissions import IsAdmin
from rest_framework.response import Response
from rest_framework import status
from .models import AnalyticsVisitor, AnalyticsSession, AnalyticsPageView, AnalyticsEvent
from users.models import User

@api_view(['POST'])
@permission_classes([AllowAny])
def track_page_view(request):
    data = request.data
    visitor_id = data.get('visitor_id')
    session_id = data.get('session_id')
    url_path = data.get('url_path')
    
    if not visitor_id or not url_path:
        return Response({'error': 'visitor_id and url_path are required'}, status=status.HTTP_400_BAD_REQUEST)

    # Get or create visitor
    visitor, _ = AnalyticsVisitor.objects.get_or_create(
        visitor_id=visitor_id,
        defaults={
            'ip_address': request.META.get('REMOTE_ADDR'),
            'user_agent': request.META.get('HTTP_USER_AGENT')
        }
    )
    
    # Update last visit
    visitor.last_visit = timezone.now()
    
    user = None
    if request.user.is_authenticated:
        user = request.user
        if visitor.user != user:
            visitor.user = user
    visitor.save(update_fields=['last_visit', 'user'])

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
    
    # Active now (visited in last 5 minutes)
    active_now_threshold = now - datetime.timedelta(minutes=5)
    active_now = AnalyticsVisitor.objects.filter(last_visit__gte=active_now_threshold).count()
    
    # Today stats
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    visitors_today = AnalyticsVisitor.objects.filter(last_visit__gte=today_start).count()
    unique_visitors_today = AnalyticsPageView.objects.filter(timestamp__gte=today_start).values('visitor').distinct().count()
    logged_in_today = AnalyticsEvent.objects.filter(timestamp__gte=today_start, event_type='login_success').values('user').distinct().count()

    # KPI stats
    total_page_views = page_views.count()
    unique_visitors = page_views.values('visitor').distinct().count()
    total_registered_users = User.objects.count()
    
    # Top Pages
    top_pages = (
        page_views.values('url_path')
        .annotate(views=Count('id'), unique_visitors=Count('visitor', distinct=True))
        .order_by('-views')[:10]
    )

    # Trend Chart Data (daily grouping)
    # Since SQLite/MySQL timezone grouping varies, we do it in Python for simplicity
    # For small/medium sets, pulling values is fine.
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
    active_candidates = User.objects.filter(role='candidate', last_activity__gte=start_date).count()
    active_recruiters = User.objects.filter(role__in=['recruiter', 'team_lead', 'team_manager'], last_activity__gte=start_date).count()

    return Response({
        'kpis': {
            'visitors_today': visitors_today,
            'unique_visitors_today': unique_visitors_today,
            'total_page_views': total_page_views,
            'unique_visitors': unique_visitors,
            'active_now': active_now,
            'logged_in_today': logged_in_today,
            'total_registered_users': total_registered_users,
        },
        'top_pages': list(top_pages),
        'trend_chart': trend_chart,
        'login_activity': {
            'successful_logins': successful_logins,
            'failed_logins': failed_logins,
            'active_candidates': active_candidates,
            'active_recruiters': active_recruiters,
        }
    })
