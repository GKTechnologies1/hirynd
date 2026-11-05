from rest_framework import serializers
from .models import ScraperExecution, DiscoveredJob


class ScraperExecutionSerializer(serializers.ModelSerializer):
    triggered_by_email = serializers.SerializerMethodField()
    duration_seconds = serializers.SerializerMethodField()

    class Meta:
        model = ScraperExecution
        fields = [
            'id', 'trigger_type', 'triggered_by', 'triggered_by_email', 'status',
            'config', 'total_roles', 'total_jobs_found', 'total_inserted',
            'total_updated', 'total_duplicates', 'error_message',
            'started_at', 'completed_at', 'duration_seconds', 'created_at'
        ]

    def get_triggered_by_email(self, obj) -> str:
        if obj.triggered_by:
            return obj.triggered_by.email
        return 'System Scheduler' if obj.trigger_type == 'scheduled' else 'Anonymous'

    def get_duration_seconds(self, obj) -> int:
        if obj.completed_at and obj.started_at:
            return int((obj.completed_at - obj.started_at).total_seconds())
        return 0


class DiscoveredJobListSerializer(serializers.ModelSerializer):
    reviewed_by_email = serializers.SerializerMethodField()

    class Meta:
        model = DiscoveredJob
        fields = [
            'id', 'job_id', 'title', 'company_name', 'target_role',
            'location_raw', 'city', 'state', 'state_code', 'country',
            'is_remote', 'is_hybrid', 'salary_min', 'salary_max', 'salary_currency',
            'salary_period', 'salary_raw', 'employment_type', 'experience_level',
            'source_portal', 'date_posted', 'job_url', 'review_status',
            'is_duplicate', 'canonical_job_id', 'reviewed_by_email',
            'reviewed_at', 'created_at'
        ]

    def get_reviewed_by_email(self, obj) -> str:
        return obj.reviewed_by.email if obj.reviewed_by else None


class DiscoveredJobDetailSerializer(serializers.ModelSerializer):
    reviewed_by_email = serializers.SerializerMethodField()
    canonical_job_title = serializers.SerializerMethodField()

    class Meta:
        model = DiscoveredJob
        fields = [
            'id', 'job_id', 'content_hash', 'title', 'company_name', 'company_name_norm',
            'target_role', 'job_url', 'job_description', 'location_raw', 'city',
            'state', 'state_code', 'country', 'is_remote', 'is_hybrid',
            'salary_min', 'salary_max', 'salary_currency', 'salary_period', 'salary_raw',
            'employment_type', 'experience_level', 'source_portal', 'date_posted',
            'execution', 'review_status', 'is_duplicate', 'canonical_job',
            'canonical_job_title', 'reviewed_by', 'reviewed_by_email', 'reviewed_at',
            'review_notes', 'is_active', 'created_at', 'updated_at'
        ]

    def get_reviewed_by_email(self, obj) -> str:
        return obj.reviewed_by.email if obj.reviewed_by else None

    def get_canonical_job_title(self, obj) -> str:
        if obj.canonical_job:
            return f"{obj.canonical_job.title} @ {obj.canonical_job.company_name}"
        return None


class DiscoveredJobReviewSerializer(serializers.Serializer):
    review_status = serializers.ChoiceField(choices=DiscoveredJob.REVIEW_STATUS_CHOICES)
    review_notes = serializers.CharField(required=False, allow_blank=True)


class RoleItemSerializer(serializers.Serializer):
    role = serializers.CharField(max_length=150)
    limit = serializers.IntegerField(default=15, min_value=1, max_value=100)


class ScraperRunRequestSerializer(serializers.Serializer):
    roles = serializers.ListField(child=RoleItemSerializer(), min_length=1)
    sources = serializers.ListField(child=serializers.CharField(), required=False)


class ApproveForJobManagementSerializer(serializers.Serializer):
    candidate_id = serializers.UUIDField(required=False, allow_null=True)
    create_job_opening = serializers.BooleanField(default=False)
    notes = serializers.CharField(required=False, allow_blank=True)

