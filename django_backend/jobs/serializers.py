from rest_framework import serializers
from .models import JobOpening, CandidateSubmission


class JobOpeningSerializer(serializers.ModelSerializer):
    submissions_count = serializers.SerializerMethodField()
    posted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = JobOpening
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'posted_by']

    def get_submissions_count(self, obj):
        return obj.submissions.count()

    def get_posted_by_name(self, obj):
        if obj.posted_by:
            return getattr(getattr(obj.posted_by, 'profile', None), 'full_name', None) or obj.posted_by.email
        return ''


class CandidateSubmissionSerializer(serializers.ModelSerializer):
    candidate_name = serializers.SerializerMethodField()
    candidate_email = serializers.SerializerMethodField()
    candidate_status = serializers.SerializerMethodField()
    job_title = serializers.SerializerMethodField()
    job_company = serializers.SerializerMethodField()
    submitted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CandidateSubmission
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'submitted_by']

    def get_candidate_name(self, obj):
        return getattr(getattr(obj.candidate.user, 'profile', None), 'full_name', '') or obj.candidate.user.email

    def get_candidate_email(self, obj):
        return obj.candidate.user.email

    def get_candidate_status(self, obj):
        return obj.candidate.status

    def get_job_title(self, obj):
        return obj.job.title

    def get_job_company(self, obj):
        return obj.job.company

    def get_submitted_by_name(self, obj):
        if obj.submitted_by:
            return getattr(getattr(obj.submitted_by, 'profile', None), 'full_name', None) or obj.submitted_by.email
        return ''
