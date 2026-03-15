from rest_framework import serializers
from .models import RecruiterProfile, RecruiterAssignment, DailySubmissionLog, JobLinkEntry
from users.serializers import ProfileSerializer


class RecruiterProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecruiterProfile
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class RecruiterAssignmentSerializer(serializers.ModelSerializer):
    recruiter_name = serializers.SerializerMethodField()
    candidate_name = serializers.SerializerMethodField()

    class Meta:
        model = RecruiterAssignment
        fields = '__all__'
        read_only_fields = ['id', 'assigned_at']

    def get_recruiter_name(self, obj):
        return obj.recruiter.profile.full_name if hasattr(obj.recruiter, 'profile') else ''

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
