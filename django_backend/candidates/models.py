import uuid
from django.db import models
from users.models import User


class Candidate(models.Model):
    STATUS_CHOICES = [
        ('lead', 'Lead'),
        ('approved', 'Approved'),
        ('intake_submitted', 'Intake Submitted'),
        ('roles_suggested', 'Roles Suggested'),
        ('roles_confirmed', 'Roles Confirmed'),
        ('paid', 'Paid'),
        ('credential_completed', 'Credential Completed'),
        ('active_marketing', 'Active Marketing'),
        ('paused', 'Paused'),
        ('cancelled', 'Cancelled'),
        ('placed', 'Placed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='candidate')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='lead')
    visa_status = models.CharField(max_length=50, blank=True, null=True)
    university = models.CharField(max_length=255, blank=True, null=True)
    degree = models.CharField(max_length=255, blank=True, null=True)
    major = models.CharField(max_length=255, blank=True, null=True)
    graduation_year = models.CharField(max_length=10, blank=True, null=True)
    resume_url = models.URLField(blank=True, null=True)
    drive_folder_url = models.URLField(blank=True, null=True)
    referral_source = models.CharField(max_length=255, blank=True, null=True)
    referral_friend_name = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'candidates'

    def __str__(self):
        return f"Candidate({self.user.email})"


class ClientIntake(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.OneToOneField(Candidate, on_delete=models.CASCADE, related_name='intake')
    data = models.JSONField(default=dict)
    is_locked = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'client_intake'


class RoleSuggestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='role_suggestions')
    role_title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    suggested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    candidate_confirmed = models.BooleanField(null=True)
    confirmed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'role_suggestions'


class CredentialVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='credentials')
    data = models.JSONField(default=dict)
    edited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    version = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'credential_versions'
        ordering = ['-version']


class Referral(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    referrer = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='referrals')
    friend_name = models.CharField(max_length=255)
    friend_email = models.EmailField()
    friend_phone = models.CharField(max_length=20, blank=True, null=True)
    referral_note = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, default='new')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'referrals'


class InterviewLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='interview_logs')
    log_type = models.CharField(max_length=50)
    company_name = models.CharField(max_length=255, blank=True, null=True)
    role_title = models.CharField(max_length=255, blank=True, null=True)
    round = models.CharField(max_length=100, blank=True, null=True)
    interview_date = models.DateField(blank=True, null=True)
    outcome = models.CharField(max_length=50, blank=True, null=True)
    difficult_questions = models.TextField(blank=True, null=True)
    support_needed = models.BooleanField(default=False)
    support_notes = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    submitted_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interview_logs'
        ordering = ['-created_at']


class PlacementClosure(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.OneToOneField(Candidate, on_delete=models.CASCADE, related_name='placement')
    company_name = models.CharField(max_length=255)
    role_title = models.CharField(max_length=255)
    salary = models.CharField(max_length=100)
    start_date = models.DateField()
    hr_email = models.EmailField()
    interviewer_email = models.EmailField(blank=True, null=True)
    bgv_company_name = models.CharField(max_length=255, blank=True, null=True)
    offer_letter_url = models.URLField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    closed_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'placement_closures'
