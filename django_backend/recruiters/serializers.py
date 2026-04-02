from rest_framework import serializers
from .models import RecruiterProfile, RecruiterAssignment, DailySubmissionLog, JobLinkEntry, RecruiterBankDetails
from users.serializers import ProfileSerializer


class RecruiterProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecruiterProfile
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class AdminRecruiterProfileSerializer(serializers.ModelSerializer):
    """Serializer for Admins to manage internal recruiter metadata."""
    class Meta:
        model = RecruiterProfile
        fields = [
            'company_name', 'employee_id', 'date_of_joining', 
            'department', 'specialization', 'max_clients'
        ]



class RecruiterBankDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecruiterBankDetails
        fields = ['bank_name', 'account_number_last4', 'routing_number_last4']
        read_only_fields = ['account_number_last4', 'routing_number_last4']


class RecruiterAssignmentSerializer(serializers.ModelSerializer):
    recruiter_name = serializers.SerializerMethodField()
    recruiter_email = serializers.SerializerMethodField()
    recruiter_phone = serializers.SerializerMethodField()
    candidate_name = serializers.SerializerMethodField()

    class Meta:
        model = RecruiterAssignment
        fields = '__all__'
        read_only_fields = ['id', 'assigned_at']

    def get_recruiter_name(self, obj):
        return obj.recruiter.profile.full_name if hasattr(obj.recruiter, 'profile') else ''

    def get_recruiter_email(self, obj):
        return obj.recruiter.email if obj.recruiter else ''

    def get_recruiter_phone(self, obj):
        return obj.recruiter.profile.phone if hasattr(obj.recruiter, 'profile') else ''

    def get_candidate_name(self, obj):
        return obj.candidate.user.profile.full_name if hasattr(obj.candidate.user, 'profile') else ''


class JobLinkEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = JobLinkEntry
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class DailySubmissionLogSerializer(serializers.ModelSerializer):
    job_entries = JobLinkEntrySerializer(many=True, read_only=True)

    class Meta:
        model = DailySubmissionLog
        fields = '__all__'
        read_only_fields = ['id', 'recruiter', 'created_at', 'updated_at']
