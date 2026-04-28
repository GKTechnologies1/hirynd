from rest_framework import serializers
from .models import (
    Candidate, ClientIntake, RoleSuggestion, RoleConfirmation,
    CredentialVersion, Referral, InterviewLog, PlacementClosure,
    CandidateLegacyPayment, TrainingScheduleClick, InterestedCandidate,
    WorkExperience, Certification,
)
from billing.models import Payment
from users.serializers import ProfileSerializer


class WorkExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkExperience
        fields = ['id', 'job_title', 'company_name', 'company_address', 'start_date', 'end_date', 'job_type', 'responsibilities']


class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = ['id', 'name', 'organization', 'issued_date', 'expires_date', 'credential_url']


class InterestedCandidateSerializer(serializers.ModelSerializer):
    display_id = serializers.CharField(read_only=True)

    class Meta:
        model = InterestedCandidate
        fields = [
            'id', 'display_id', 'user', 'status', 'name', 'email', 'phone', 
            'university', 'degree', 'major', 'graduation_year', 'visa_status', 
            'current_location', 'referral_source', 'referral_friend_name', 
            'notes', 'resume_url', 'resume_file', 'marketing_email', 
            'marketing_phone', 'desired_years_of_experience', 'selected_services',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'display_id', 'user', 'created_at', 'updated_at']


class CandidateSerializer(serializers.ModelSerializer):
    subscription_status = serializers.SerializerMethodField()
    profile = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    display_id = serializers.SerializerMethodField()
    total_applications = serializers.SerializerMethodField()
    total_interviews = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = [
            'id', 'display_id', 'user', 'profile', 'full_name', 'email', 'status', 'visa_status', 'university', 'degree', 'major', 
            'graduation_year', 'graduation_date', 'resume_url', 'resume_file', 'services', 
            'drive_folder_url', 'linkedin_url', 'portfolio_url', 'referral_source', 
            'referral_friend_name', 'current_location', 'github_url', 'marketing_email', 
            'marketing_phone', 'personal_email', 'bachelors_graduation_date', 
            'masters_graduation_date', 'first_entry_us', 'opt_start_date', 'opt_end_date', 
            'desired_years_of_experience', 'notes', 'cal_training_url', 'cal_mock_practice_url', 
            'cal_interview_training_url', 'cal_interview_support_url', 'cal_operations_call_url', 
            'created_at', 'updated_at', 'subscription_status', 'total_applications', 'total_interviews'
        ]
        read_only_fields = ['id', 'display_id', 'user', 'profile', 'full_name', 'email', 'created_at', 'updated_at', 'subscription_status', 'total_applications', 'total_interviews']

    def get_subscription_status(self, obj):
        if hasattr(obj, 'subscription'):
            return obj.subscription.status
        return None

    def get_profile(self, obj):
        if hasattr(obj.user, 'profile'):
            return ProfileSerializer(obj.user.profile).data
        return None

    def get_full_name(self, obj):
        return obj.user.profile.full_name if hasattr(obj.user, 'profile') else ''

    def get_email(self, obj):
        return obj.user.email

    def get_display_id(self, obj):
        return obj.user.display_id

    def get_total_applications(self, obj):
        from recruiters.models import DailySubmissionLog
        from django.db.models import Sum
        return DailySubmissionLog.objects.filter(candidate=obj).aggregate(Sum('applications_count'))['applications_count__sum'] or 0

    def get_total_interviews(self, obj):
        from .models import InterviewLog
        return InterviewLog.objects.filter(candidate=obj).count()


class CandidateListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    display_id = serializers.SerializerMethodField()
    total_applications = serializers.SerializerMethodField()
    total_interviews = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = [
            'id', 'display_id', 'status', 'full_name', 'email', 'visa_status', 'created_at', 'updated_at',
            'university', 'degree', 'major', 'graduation_year', 'graduation_date', 'referral_source',
            'referral_friend_name', 'current_location', 'notes',
            'total_applications', 'total_interviews'
        ]

    def get_full_name(self, obj):
        return obj.user.profile.full_name if hasattr(obj.user, 'profile') else ''

    def get_email(self, obj):
        return obj.user.email

    def get_display_id(self, obj):
        return obj.user.display_id

    def get_total_applications(self, obj):
        from recruiters.models import DailySubmissionLog
        from django.db.models import Sum
        return DailySubmissionLog.objects.filter(candidate=obj).aggregate(Sum('applications_count'))['applications_count__sum'] or 0

    def get_total_interviews(self, obj):
        from .models import InterviewLog
        return InterviewLog.objects.filter(candidate=obj).count()


class ClientIntakeSerializer(serializers.ModelSerializer):
    experiences = serializers.SerializerMethodField()
    certifications = serializers.SerializerMethodField()

    class Meta:
        model = ClientIntake
        fields = '__all__'
        read_only_fields = ['id', 'candidate', 'created_at', 'updated_at']

    def get_experiences(self, obj):
        """Include related work experiences"""
        if obj.candidate:
            return WorkExperienceSerializer(
                WorkExperience.objects.filter(candidate=obj.candidate),
                many=True
            ).data
        return []

    def get_certifications(self, obj):
        """Include related certifications"""
        if obj.candidate:
            return CertificationSerializer(
                Certification.objects.filter(candidate=obj.candidate),
                many=True
            ).data
        return []


class RoleSuggestionSerializer(serializers.ModelSerializer):
    suggested_by_name = serializers.SerializerMethodField()

    class Meta:
        model = RoleSuggestion
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def get_suggested_by_name(self, obj):
        if obj.suggested_by and hasattr(obj.suggested_by, 'profile'):
            return obj.suggested_by.profile.full_name
        return ''


class RoleConfirmationSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoleConfirmation
        fields = '__all__'
        read_only_fields = ['id', 'responded_at']


class CredentialVersionSerializer(serializers.ModelSerializer):
    editor_name = serializers.SerializerMethodField()

    class Meta:
        model = CredentialVersion
        fields = '__all__'
        read_only_fields = ['id', 'candidate', 'edited_by', 'version', 'created_at']

    def get_editor_name(self, obj):
        if obj.edited_by and hasattr(obj.edited_by, 'profile'):
            return obj.edited_by.profile.full_name
        return ''


class ReferralSerializer(serializers.ModelSerializer):
    display_id = serializers.CharField(read_only=True)
    class Meta:
        model = Referral
        fields = '__all__'
        read_only_fields = ['id', 'referrer', 'created_at', 'display_id']


class InterviewLogSerializer(serializers.ModelSerializer):
    submitted_by_name = serializers.SerializerMethodField()
    display_id = serializers.CharField(read_only=True)

    class Meta:
        model = InterviewLog
        fields = '__all__'
        read_only_fields = ['id', 'submitted_by', 'created_at', 'updated_at', 'display_id']

    def get_submitted_by_name(self, obj):
        if obj.submitted_by and hasattr(obj.submitted_by, 'profile'):
            return obj.submitted_by.profile.full_name
        return ''


class PlacementClosureSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlacementClosure
        fields = '__all__'
        read_only_fields = ['id', 'closed_by', 'created_at']


class PaymentSerializer(serializers.ModelSerializer):
    display_id = serializers.CharField(read_only=True)
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'display_id']


class TrainingScheduleClickSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingScheduleClick
        fields = '__all__'
        read_only_fields = ['id', 'clicked_at']
