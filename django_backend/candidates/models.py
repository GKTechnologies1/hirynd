import uuid
from django.db import models
from users.models import User


class Candidate(models.Model):
    STATUS_CHOICES = [
        ('pending_approval', 'Pending Approval'),
        ('lead', 'Lead'),
        ('approved', 'Approved'),
        ('intake_submitted', 'Intake Submitted'),
        ('roles_suggested', 'Roles Suggested'),
        ('roles_confirmed', 'Roles Confirmed'),
        ('paid', 'Paid'),
        ('credential_completed', 'Credential Completed'),
        ('active_marketing', 'Active Marketing'),
        ('paused', 'Paused'),
        ('on_hold', 'On Hold'),
        ('past_due', 'Past Due'),
        ('cancelled', 'Cancelled'),
        ('placed', 'Placed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='candidate')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending_approval')
    visa_status = models.CharField(max_length=50, blank=True, null=True)
    university = models.CharField(max_length=255, blank=True, null=True)
    degree = models.CharField(max_length=255, blank=True, null=True)
    major = models.CharField(max_length=255, blank=True, null=True)
    graduation_year = models.CharField(max_length=10, blank=True, null=True)
    graduation_date = models.DateField(blank=True, null=True)
    resume_url = models.URLField(blank=True, null=True)
    drive_folder_url = models.URLField(blank=True, null=True)
    linkedin_url = models.URLField(blank=True, null=True)
    portfolio_url = models.URLField(blank=True, null=True)
    referral_source = models.CharField(max_length=255, blank=True, null=True)
    referral_friend_name = models.CharField(max_length=255, blank=True, null=True)
    current_location = models.CharField(max_length=255, blank=True, null=True)
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
    reopened_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reopened_intakes')
    reopened_at = models.DateTimeField(blank=True, null=True)
    reopen_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'client_intake'


class RoleSuggestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='role_suggestions')
    role_title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    admin_note = models.TextField(blank=True, null=True)
    suggested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='suggested_roles')
    candidate_confirmed = models.BooleanField(null=True)
    confirmed_at = models.DateTimeField(blank=True, null=True)
    change_request_note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'role_suggestions'


class RoleConfirmation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='role_confirmations')
    suggestion = models.ForeignKey(RoleSuggestion, on_delete=models.CASCADE, related_name='confirmations')
    response = models.CharField(max_length=20, choices=[('accepted', 'Accepted'), ('declined', 'Declined'), ('change_requested', 'Change Requested')])
    change_request_note = models.TextField(blank=True, null=True)
    custom_role_title = models.CharField(max_length=255, blank=True, null=True)
    custom_reason = models.TextField(blank=True, null=True)
    responded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'role_confirmations'


class CredentialVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='credentials')
    data = models.JSONField(default=dict)
    edited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    source_role = models.CharField(max_length=20, default='candidate')
    version = models.IntegerField(default=1)
    changed_fields = models.JSONField(default=list)
    diff_summary = models.JSONField(default=dict)
    full_snapshot = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'credential_versions'
        ordering = ['-version']


class Referral(models.Model):
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('contacted', 'Contacted'),
        ('onboarded', 'Onboarded'),
        ('closed', 'Closed'),
        ('rejected', 'Rejected'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    referrer = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='referrals')
    friend_name = models.CharField(max_length=255)
    friend_email = models.EmailField()
    friend_phone = models.CharField(max_length=20, blank=True, null=True)
    referred_for = models.CharField(max_length=255, blank=True, null=True)
    referral_note = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'referrals'


class InterviewLog(models.Model):
    INTERVIEW_TYPE_CHOICES = [
        ('screening_call', 'Screening Call'),
        ('technical_interview', 'Technical Interview'),
        ('hr_interview', 'HR Interview'),
        ('client_round', 'Client Round'),
        ('final_round', 'Final Round'),
        ('mock_interview', 'Mock Interview'),
        ('support_call', 'Support Call'),
    ]
    OUTCOME_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('completed', 'Completed'),
        ('selected', 'Selected / Passed'),
        ('rejected', 'Rejected'),
        ('follow_up_needed', 'Follow-up Needed'),
        ('rescheduled', 'Rescheduled'),
        ('no_show', 'No Show'),
    ]
    INTERVIEW_MODE_CHOICES = [
        ('video', 'Video'),
        ('phone', 'Phone'),
        ('in_person', 'In Person'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='interview_logs')
    interview_type = models.CharField(max_length=50, choices=INTERVIEW_TYPE_CHOICES)
    stage_round = models.CharField(max_length=100, blank=True, null=True)
    company_name = models.CharField(max_length=255)
    role_title = models.CharField(max_length=255)
    interview_date = models.DateField()
    interview_time = models.TimeField(blank=True, null=True)
    time_zone = models.CharField(max_length=50, default='America/New_York')
    interviewer_name = models.CharField(max_length=255, blank=True, null=True)
    interview_mode = models.CharField(max_length=20, choices=INTERVIEW_MODE_CHOICES, default='video')
    meeting_link = models.URLField(blank=True, null=True)
    outcome = models.CharField(max_length=30, choices=OUTCOME_CHOICES, default='scheduled')
    difficult_questions = models.TextField(blank=True, null=True)
    feedback_notes = models.TextField(blank=True, null=True)
    support_needed = models.TextField(blank=True, null=True)
    next_round_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    submitted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submitted_interviews')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_interviews')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'interview_logs'
        ordering = ['-interview_date', '-created_at']


class PlacementClosure(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.OneToOneField(Candidate, on_delete=models.CASCADE, related_name='placement')
    company_name = models.CharField(max_length=255)
    role_title = models.CharField(max_length=255)
    salary = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')
    start_date = models.DateField()
    hr_email = models.EmailField()
    interviewer_email = models.EmailField(blank=True, null=True)
    bgv_company_name = models.CharField(max_length=255, blank=True, null=True)
    offer_letter_url = models.URLField(blank=True, null=True)
    placement_notes = models.TextField(blank=True, null=True)
    closed_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'placement_closures'


class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('waived', 'Waived'),
        ('partially_paid', 'Partially Paid'),
        ('cancelled', 'Cancelled'),
    ]
    CHARGE_TYPE_CHOICES = [
        ('monthly_service_fee', 'Monthly Service Fee'),
        ('mock_practice_fee', 'Mock Practice Fee'),
        ('interview_support_fee', 'Interview Support Fee'),
        ('operations_support_fee', 'Operations Support Fee'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='payments')
    charge_name = models.CharField(max_length=255)
    charge_type = models.CharField(max_length=50, choices=CHARGE_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')
    due_date = models.DateField()
    payment_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_notes = models.TextField(blank=True, null=True)
    is_internal_note = models.BooleanField(default=False)
    previous_due_date = models.DateField(blank=True, null=True)
    due_date_changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='payment_date_changes')
    due_date_change_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-due_date']


class TrainingScheduleClick(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='training_clicks')
    clicked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    schedule_type = models.CharField(max_length=100)
    clicked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'training_schedule_clicks'
