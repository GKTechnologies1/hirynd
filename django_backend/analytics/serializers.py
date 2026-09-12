from rest_framework import serializers
from .models import AnalyticsVisitor, AnalyticsSession, AnalyticsPageView, AnalyticsEvent

class AnalyticsPageViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsPageView
        fields = ['url_path', 'referrer', 'device_type']

class AnalyticsEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsEvent
        fields = ['event_type', 'role', 'session_id']
