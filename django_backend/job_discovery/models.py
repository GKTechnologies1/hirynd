import uuid
from django.db import models
from django.utils import timezone
from users.models import User


class ScraperExecution(models.Model):
    TRIGGER_CHOICES = [
        ('manual', 'Manual'),
        ('scheduled', 'Scheduled'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trigger_type = models.CharField(max_length=20, choices=TRIGGER_CHOICES, default='manual')
    triggered_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='scraper_executions'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    config = models.JSONField(default=dict, blank=True)
    total_roles = models.IntegerField(default=0)
    total_jobs_found = models.IntegerField(default=0)
    total_inserted = models.IntegerField(default=0)
    total_updated = models.IntegerField(default=0)
    total_duplicates = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, null=True)
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'scraper_executions'
        ordering = ['-started_at']

    def __str__(self):
        return f"ScraperExecution [{self.trigger_type}] {self.status} @ {self.started_at}"


class DiscoveredJob(models.Model):
    REVIEW_STATUS_CHOICES = [
        ('PENDING_REVIEW', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('ALREADY_EXISTS', 'Already Exists'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job_id = models.CharField(max_length=255, unique=True, db_index=True)
    content_hash = models.CharField(max_length=64, db_index=True)
    is_duplicate = models.BooleanField(default=False, db_index=True)
    canonical_job = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='duplicates'
    )

    title = models.CharField(max_length=300)
    company_name = models.CharField(max_length=255, db_index=True)
    company_name_norm = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    target_role = models.CharField(max_length=150, db_index=True)

    job_url = models.TextField(blank=True, null=True)
    job_description = models.TextField(blank=True, null=True)

    location_raw = models.CharField(max_length=300, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    state_code = models.CharField(max_length=10, blank=True, null=True)
    country = models.CharField(max_length=50, default='USA')

    is_remote = models.BooleanField(default=False)
    is_hybrid = models.BooleanField(default=False)

    salary_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_currency = models.CharField(max_length=10, default='USD')
    salary_period = models.CharField(max_length=20, blank=True, null=True)
    salary_raw = models.CharField(max_length=150, blank=True, null=True)

    employment_type = models.CharField(max_length=50, blank=True, null=True)
    experience_level = models.CharField(max_length=50, blank=True, null=True)
    source_portal = models.CharField(max_length=50, db_index=True)
    date_posted = models.DateTimeField(null=True, blank=True)

    # Visa Intelligence fields
    visa_matched = models.BooleanField(default=False, db_index=True)
    h1b_sponsor = models.BooleanField(null=True, blank=True, db_index=True)
    h1b_filings_recent = models.IntegerField(default=0)
    h1b_approvals = models.IntegerField(default=0)
    h1b_denials = models.IntegerField(default=0)
    h1b_approval_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    h1b_avg_salary = models.IntegerField(null=True, blank=True)
    perm_filings = models.IntegerField(default=0)
    green_card_sponsor = models.BooleanField(null=True, blank=True)
    everify_enrolled = models.BooleanField(null=True, blank=True)
    visa_grade = models.CharField(max_length=2, null=True, blank=True, db_index=True)
    visa_friendly_score = models.IntegerField(default=0, db_index=True)
    company_match_confidence = models.CharField(max_length=20, default='none')

    execution = models.ForeignKey(
        ScraperExecution, null=True, blank=True, on_delete=models.SET_NULL, related_name='jobs'
    )

    review_status = models.CharField(
        max_length=30, choices=REVIEW_STATUS_CHOICES, default='PENDING_REVIEW', db_index=True
    )
    reviewed_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='reviewed_discovered_jobs'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True, null=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'discovered_jobs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['target_role', '-created_at'], name='idx_dj_role_created'),
            models.Index(fields=['source_portal', '-created_at'], name='idx_dj_source_created'),
            models.Index(fields=['review_status', '-created_at'], name='idx_dj_status_created'),
            models.Index(fields=['company_name', '-created_at'], name='idx_dj_company_created'),
            models.Index(fields=['visa_friendly_score', '-created_at'], name='idx_dj_score_created'),
            models.Index(fields=['visa_grade', '-created_at'], name='idx_dj_grade_created'),
        ]

    def __str__(self):
        return f"{self.title} @ {self.company_name} [{self.source_portal}]"


class CompanyVisaHistory(models.Model):
    id = models.BigAutoField(primary_key=True)
    company_name = models.CharField(max_length=255, db_index=True)
    company_name_norm = models.CharField(max_length=255, unique=True, db_index=True)
    h1b_total_filings = models.IntegerField(default=0, db_index=True)
    h1b_approvals = models.IntegerField(default=0)
    h1b_denials = models.IntegerField(default=0)
    h1b_approval_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    h1b_avg_salary = models.IntegerField(null=True, blank=True)
    h1b_last_filing_year = models.IntegerField(null=True, blank=True)
    perm_total_filings = models.IntegerField(default=0)
    perm_last_year = models.IntegerField(null=True, blank=True)
    green_card_sponsor = models.BooleanField(default=False)
    everify_enrolled = models.BooleanField(null=True, blank=True)
    visa_friendly_score = models.IntegerField(default=0, db_index=True)
    visa_grade = models.CharField(max_length=2, null=True, blank=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'company_visa_history'
        ordering = ['-visa_friendly_score', '-h1b_total_filings']

    def __str__(self):
        return f"{self.company_name} (Grade: {self.visa_grade}, Score: {self.visa_friendly_score})"


class CompanyAlias(models.Model):
    id = models.BigAutoField(primary_key=True)
    alias_norm = models.CharField(max_length=255, unique=True, db_index=True)
    target_norm = models.CharField(max_length=255, db_index=True)
    notes = models.CharField(max_length=500, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'company_aliases'

    def __str__(self):
        return f"{self.alias_norm} -> {self.target_norm}"
