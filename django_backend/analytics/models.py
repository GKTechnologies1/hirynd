import uuid
from django.db import models
from users.models import User

class AnalyticsVisitor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visitor_id = models.CharField(max_length=100, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='analytics_visitors')
    created_at = models.DateTimeField(auto_now_add=True)
    last_visit = models.DateTimeField(auto_now=True, db_index=True)
    ip_address = models.CharField(max_length=45, blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'analytics_visitors'

    def __str__(self):
        return self.visitor_id


class AnalyticsSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visitor = models.ForeignKey(AnalyticsVisitor, on_delete=models.CASCADE, related_name='sessions')
    session_id = models.CharField(max_length=100, unique=True, db_index=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'analytics_sessions'

    def __str__(self):
        return self.session_id


class AnalyticsPageView(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visitor = models.ForeignKey(AnalyticsVisitor, on_delete=models.CASCADE, related_name='page_views')
    session = models.ForeignKey(AnalyticsSession, on_delete=models.SET_NULL, null=True, blank=True, related_name='page_views')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='analytics_page_views')
    url_path = models.CharField(max_length=500, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    referrer = models.CharField(max_length=500, blank=True, null=True)
    device_type = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'analytics_page_views'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.url_path} at {self.timestamp}"


class AnalyticsEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='analytics_events')
    event_type = models.CharField(max_length=50, db_index=True) # e.g., 'login_success', 'login_failed', 'logout'
    role = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    session_id = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'analytics_events'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.event_type} at {self.timestamp}"
