import uuid
from django.db import models
from users.models import User
from candidates.models import Candidate


class RecruiterProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='recruiter_profile')
    location = models.CharField(max_length=255, blank=True, null=True)
    documents_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'recruiter_profiles'


class RecruiterAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='assignments')
    recruiter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recruiter_assignments')
    role_type = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='+')
    assigned_at = models.DateTimeField(auto_now_add=True)
    unassigned_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'recruiter_assignments'


class DailySubmissionLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='daily_logs')
    recruiter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submission_logs')
    log_date = models.DateField(auto_now_add=True)
    applications_count = models.IntegerField(default=0)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'daily_submission_logs'


class JobLinkEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission_log = models.ForeignKey(DailySubmissionLog, on_delete=models.CASCADE, related_name='job_entries')
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='job_postings')
    company_name = models.CharField(max_length=255, default='')
    role_title = models.CharField(max_length=255, default='')
    job_url = models.URLField(default='')
    resume_used = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=50, default='applied')
    candidate_response_status = models.CharField(max_length=50, blank=True, null=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'job_link_entries'
