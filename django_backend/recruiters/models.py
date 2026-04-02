import uuid
from django.db import models
from users.models import User
from candidates.models import Candidate


class RecruiterProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='recruiter_profile')
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    university = models.CharField(max_length=255, blank=True, null=True)
    major = models.CharField(max_length=255, blank=True, null=True)
    graduation_date = models.DateField(blank=True, null=True)
    linkedin_url = models.URLField(blank=True, null=True)
    social_profile_url = models.URLField(blank=True, null=True)
    
    # New fields from legacy RecruiterRegister.jsx
    company_name = models.CharField(max_length=255, blank=True, null=True)
    employee_id = models.CharField(max_length=100, blank=True, null=True)
    date_of_joining = models.DateField(blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    specialization = models.CharField(max_length=100, blank=True, null=True)
    max_clients = models.IntegerField(default=3)

    prior_recruitment_experience = models.TextField(blank=True, null=True)
    work_type_preference = models.CharField(max_length=50, blank=True, null=True)
    documents_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'recruiter_profiles'

    def __str__(self):
        return f"Recruiter: {self.user.profile.full_name or self.user.email}"


class RecruiterBankDetails(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recruiter = models.OneToOneField(User, on_delete=models.CASCADE, related_name='bank_details')
    bank_name = models.CharField(max_length=255, blank=True, null=True)
    account_number_last4 = models.CharField(max_length=4, blank=True, null=True)
    routing_number_last4 = models.CharField(max_length=4, blank=True, null=True)
    # Full values stored encrypted; only last4 exposed
    account_number_encrypted = models.TextField(blank=True, null=True)
    routing_number_encrypted = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'recruiter_bank_details'

    def __str__(self):
        return f"Bank Details - {self.recruiter.email}"


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

    def __str__(self):
        return f"{self.recruiter.email} -> {self.candidate.user.email} ({self.role_type})"


class TeamLeadAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='team_lead_assignments')
    team_lead = models.ForeignKey(User, on_delete=models.CASCADE, related_name='team_lead_assignments')
    is_active = models.BooleanField(default=True)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='+')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'team_lead_assignments'

    def __str__(self):
        return f"TL: {self.team_lead.email} for {self.candidate.user.email}"


class DailySubmissionLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='daily_logs')
    recruiter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submission_logs')
    log_date = models.DateField()
    applications_count = models.IntegerField(default=0)
    screening_count = models.IntegerField(default=0)
    interview_count = models.IntegerField(default=0)
    offer_count = models.IntegerField(default=0)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'daily_submission_logs'

    def __str__(self):
        return f"Log {self.log_date} - {self.recruiter.email}"


class JobLinkEntry(models.Model):
    APPLICATION_STATUS_CHOICES = [
        ('applied', 'Applied'),
        ('screening', 'Screening'),
        ('interview', 'Interview'),
        ('rejected', 'Rejected'),
        ('offer', 'Offer'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission_log = models.ForeignKey(DailySubmissionLog, on_delete=models.CASCADE, related_name='job_entries')
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='job_postings')
    company_name = models.CharField(max_length=255)
    role_title = models.CharField(max_length=255)
    job_url = models.URLField()
    job_description = models.TextField(blank=True, null=True)
    fetch_status = models.CharField(max_length=20, default='pending')
    resume_used = models.CharField(max_length=255, blank=True, null=True)
    application_status = models.CharField(max_length=50, choices=APPLICATION_STATUS_CHOICES, default='applied')
    candidate_response_status = models.CharField(max_length=50, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    submitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'job_link_entries'

    def __str__(self):
        return f"{self.company_name} - {self.role_title} ({self.candidate.user.email})"
