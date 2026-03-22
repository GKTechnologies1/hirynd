from rest_framework import serializers
from .models import (
    Candidate, ClientIntake, RoleSuggestion, RoleConfirmation,
    CredentialVersion, Referral, InterviewLog, PlacementClosure,
    Payment, TrainingScheduleClick,
)
from users.serializers import ProfileSerializer


class CandidateSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_profile(self, obj):
        if hasattr(obj.user, 'profile'):
            return ProfileSerializer(obj.user.profile).data
        return None

    def get_full_name(self, obj):
        return obj.user.profile.full_name if hasattr(obj.user, 'profile') else ''

    def get_email(self, obj):
        return obj.user.email


class CandidateListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = ['id', 'status', 'full_name', 'email', 'visa_status', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        return obj.user.profile.full_name if hasattr(obj.user, 'profile') else ''

    def get_email(self, obj):
        return obj.user.email


class ClientIntakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientIntake
        fields = '__all__'
        read_only_fields = ['id', 'candidate', 'created_at', 'updated_at']


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
    class Meta:
        model = Referral
        fields = '__all__'
        read_only_fields = ['id', 'referrer', 'created_at']


class InterviewLogSerializer(serializers.ModelSerializer):
    submitted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InterviewLog
        fields = '__all__'
        read_only_fields = ['id', 'submitted_by', 'created_at', 'updated_at']

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
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class TrainingScheduleClickSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingScheduleClick
        fields = '__all__'
        read_only_fields = ['id', 'clicked_at']
