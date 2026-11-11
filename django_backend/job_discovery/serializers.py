from rest_framework import serializers
from datetime import datetime
from .models import (
    ScraperExecution, DiscoveredJob, CompanyVisaHistory, CompanyAlias,
    RecruiterJobAssignment, ScraperCostRecord, EmployerPlacement, EmployerContact
)


class EmployerContactSerializer(serializers.ModelSerializer):
    created_by_email = serializers.SerializerMethodField()

    class Meta:
        model = EmployerContact
        fields = [
            'id', 'company', 'name', 'email', 'email_norm', 'role_designation',
            'phone_number', 'source', 'notes', 'created_by', 'created_by_email', 'created_at'
        ]

    def get_created_by_email(self, obj):
        return obj.created_by.email if obj.created_by else None


class EmployerPlacementSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployerPlacement
        fields = [
            'id', 'company', 'placement_closure', 'candidate_name', 'role_title',
            'offer_salary', 'currency', 'start_date', 'hr_contact',
            'verification_status', 'offer_letter_url', 'notes', 'created_at'
        ]


class CompanyVisaHistorySerializer(serializers.ModelSerializer):
    aliases = serializers.SerializerMethodField()
    placements = EmployerPlacementSerializer(many=True, read_only=True)
    contacts = EmployerContactSerializer(many=True, read_only=True)

    class Meta:
        model = CompanyVisaHistory
        fields = [
            'id', 'company_name', 'company_name_norm', 'h1b_total_filings',
            'h1b_approvals', 'h1b_denials', 'h1b_approval_rate', 'h1b_avg_salary',
            'h1b_last_filing_year', 'perm_total_filings', 'perm_last_year',
            'green_card_sponsor', 'everify_enrolled', 'h1b_sponsorship_willing',
            'h1b_sponsorship_source', 'visa_friendly_score',
            'visa_grade', 'website', 'industry', 'headquarters', 'contact_name',
            'contact_email', 'contact_phone', 'verification_status', 'data_sources',
            'placement_count', 'notes', 'updated_at', 'aliases', 'placements', 'contacts'
        ]

    def get_aliases(self, obj):
        return list(CompanyAlias.objects.filter(target_norm=obj.company_name_norm).values_list('alias_norm', flat=True))


class ScraperCostRecordSerializer(serializers.ModelSerializer):
    initiated_by_email = serializers.SerializerMethodField()

    class Meta:
        model = ScraperCostRecord
        fields = [
            'id', 'execution', 'initiated_by', 'initiated_by_email', 'role_name',
            'source_portal', 'api_calls', 'cost_usd', 'cost_type', 'provider',
            'run_id', 'items_count', 'created_at'
        ]

    def get_initiated_by_email(self, obj):
        return obj.initiated_by.email if obj.initiated_by else 'System / Anonymous'


class RecruiterJobAssignmentSerializer(serializers.ModelSerializer):
    recruiter_name = serializers.SerializerMethodField()
    recruiter_email = serializers.CharField(source='recruiter.email', read_only=True)
    job_title = serializers.CharField(source='job.title', read_only=True)
    company_name = serializers.CharField(source='job.company_name', read_only=True)

    class Meta:
        model = RecruiterJobAssignment
        fields = [
            'id', 'job', 'job_title', 'company_name', 'recruiter', 'recruiter_name',
            'recruiter_email', 'assigned_by', 'execution', 'notes', 'created_at'
        ]

    def get_recruiter_name(self, obj):
        if hasattr(obj.recruiter, 'profile') and obj.recruiter.profile and obj.recruiter.profile.full_name:
            return obj.recruiter.profile.full_name
        return obj.recruiter.email.split('@')[0].title()


class ScraperExecutionSerializer(serializers.ModelSerializer):
    triggered_by_email = serializers.SerializerMethodField()
    duration_seconds = serializers.SerializerMethodField()

    class Meta:
        model = ScraperExecution
        fields = [
            'id', 'trigger_type', 'triggered_by', 'triggered_by_email', 'status',
            'config', 'total_roles', 'total_jobs_found', 'total_inserted',
            'total_updated', 'total_duplicates', 'total_cost_usd', 'api_calls_count',
            'error_message', 'started_at', 'completed_at', 'duration_seconds', 'created_at'
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
            'id', 'job_id', 'title', 'company_name', 'company_name_norm', 'target_role',
            'location_raw', 'city', 'state', 'state_code', 'country',
            'is_remote', 'is_hybrid', 'salary_min', 'salary_max', 'salary_currency',
            'salary_period', 'salary_raw', 'employment_type', 'experience_level',
            'source_portal', 'date_posted', 'job_url', 'review_status',
            'is_duplicate', 'canonical_job_id', 'reviewed_by_email',
            'reviewed_at', 'created_at',
            # Visa Intelligence fields
            'visa_matched', 'h1b_sponsor', 'h1b_filings_recent', 'everify_enrolled',
            'green_card_sponsor', 'visa_grade', 'visa_friendly_score',
            'company_match_confidence',
            # Job restrictions / eligibility
            'detected_restrictions'
        ]

    def get_reviewed_by_email(self, obj) -> str:
        return obj.reviewed_by.email if obj.reviewed_by else None


class DiscoveredJobDetailSerializer(serializers.ModelSerializer):
    reviewed_by_email = serializers.SerializerMethodField()
    canonical_job_title = serializers.SerializerMethodField()
    score_factors = serializers.SerializerMethodField()

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
            'review_notes', 'is_active', 'created_at', 'updated_at',
            # Full Visa Intelligence & Explanation
            'visa_matched', 'h1b_sponsor', 'h1b_filings_recent', 'h1b_approvals',
            'h1b_denials', 'h1b_approval_rate', 'h1b_avg_salary', 'perm_filings',
            'green_card_sponsor', 'everify_enrolled', 'visa_grade',
            'visa_friendly_score', 'company_match_confidence', 'score_factors',
            # Job restrictions / eligibility
            'detected_restrictions'
        ]

    def get_reviewed_by_email(self, obj) -> str:
        return obj.reviewed_by.email if obj.reviewed_by else None

    def get_canonical_job_title(self, obj) -> str:
        if obj.canonical_job:
            return f"{obj.canonical_job.title} @ {obj.canonical_job.company_name}"
        return None

    def get_score_factors(self, obj) -> dict:
        from .visa.scoring import compute_visa_score
        res = compute_visa_score(
            h1b_filings=obj.h1b_filings_recent,
            approvals=obj.h1b_approvals,
            denials=obj.h1b_denials,
            perm_filings=obj.perm_filings,
            everify=bool(obj.everify_enrolled),
            year=datetime.now().year if obj.visa_matched else 0,
        )
        return res.get('factors', {})


class DiscoveredJobReviewSerializer(serializers.Serializer):
    review_status = serializers.ChoiceField(choices=DiscoveredJob.REVIEW_STATUS_CHOICES)
    review_notes = serializers.CharField(required=False, allow_blank=True)


class RoleItemSerializer(serializers.Serializer):
    role = serializers.CharField(max_length=150)
    limit = serializers.IntegerField(default=15, min_value=1, max_value=100)


class ScraperRunRequestSerializer(serializers.Serializer):
    roles = serializers.ListField(child=RoleItemSerializer(), min_length=1)
    companies = serializers.ListField(child=serializers.CharField(), required=False)
    sources = serializers.ListField(child=serializers.CharField(), required=False)
    mode = serializers.ChoiceField(choices=['STANDARD', 'VISA_FILTERED'], default='STANDARD', required=False)
    minimum_score = serializers.IntegerField(default=0, min_value=0, max_value=100, required=False)


class ApproveForJobManagementSerializer(serializers.Serializer):
    candidate_id = serializers.UUIDField(required=False, allow_null=True)
    create_job_opening = serializers.BooleanField(default=False)
    notes = serializers.CharField(required=False, allow_blank=True)

