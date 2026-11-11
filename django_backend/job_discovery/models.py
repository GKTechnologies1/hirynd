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
    total_cost_usd = models.DecimalField(max_digits=10, decimal_places=4, default=0.0000)
    api_calls_count = models.IntegerField(default=0)
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

    # Job Restrictions / Eligibility detection
    detected_restrictions = models.JSONField(default=list, blank=True)

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

    # Employer Intelligence fields
    website = models.URLField(max_length=500, blank=True, null=True)
    industry = models.CharField(max_length=150, blank=True, null=True, db_index=True)
    headquarters = models.CharField(max_length=255, blank=True, null=True)
    contact_name = models.CharField(max_length=150, blank=True, null=True)
    contact_email = models.CharField(max_length=255, blank=True, null=True)
    contact_phone = models.CharField(max_length=50, blank=True, null=True)
    verification_status = models.CharField(max_length=30, default='VERIFIED', db_index=True)
    data_sources = models.JSONField(default=list, blank=True)
    placement_count = models.IntegerField(default=0, db_index=True)
    notes = models.TextField(blank=True, null=True)

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


class RecruiterJobAssignment(models.Model):
    """
    Tracks administrative distribution of discovered jobs from a scraping session to recruiters.
    Preserves the global scraped job identity without data duplication.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(DiscoveredJob, on_delete=models.CASCADE, related_name='recruiter_assignments')
    recruiter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_discovered_jobs')
    assigned_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='created_job_assignments'
    )
    execution = models.ForeignKey(
        ScraperExecution, null=True, blank=True, on_delete=models.SET_NULL, related_name='recruiter_assignments'
    )
    notes = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'recruiter_job_assignments'
        unique_together = ('job', 'recruiter')
        indexes = [
            models.Index(fields=['recruiter', '-created_at'], name='idx_rja_recruiter_created'),
            models.Index(fields=['job', 'recruiter'], name='idx_rja_job_recruiter'),
        ]

    def __str__(self):
        return f"Assignment: Job {self.job_id} -> Recruiter {self.recruiter_id}"


class ScraperCostRecord(models.Model):
    """
    Audited cost and API usage breakdown for scraping executions.
    Strictly admin-accessible.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    execution = models.ForeignKey(ScraperExecution, on_delete=models.CASCADE, related_name='cost_records')
    initiated_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='scraper_costs'
    )
    role_name = models.CharField(max_length=150, db_index=True)
    source_portal = models.CharField(max_length=50, db_index=True)
    api_calls = models.IntegerField(default=1)
    cost_usd = models.DecimalField(max_digits=10, decimal_places=4, default=0.0000)
    cost_type = models.CharField(max_length=20, default='ACTUAL')  # ACTUAL, ESTIMATED, UNAVAILABLE
    provider = models.CharField(max_length=50, default='Apify')
    run_id = models.CharField(max_length=100, blank=True, null=True)
    items_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'scraper_cost_records'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['execution', '-created_at'], name='idx_scr_exec_created'),
            models.Index(fields=['role_name', '-created_at'], name='idx_scr_role_created'),
            models.Index(fields=['source_portal', '-created_at'], name='idx_scr_portal_created'),
        ]

    def __str__(self):
        return f"Cost: ${self.cost_usd} for {self.role_name} on {self.source_portal} ({self.cost_type})"


class EmployerPlacement(models.Model):
    """
    Enriches central Employer Intelligence with placement and offer history from Hyrind.
    Distinct from historical USCIS filings.
    """
    id = models.BigAutoField(primary_key=True)
    company = models.ForeignKey(CompanyVisaHistory, on_delete=models.CASCADE, related_name='placements')
    placement_closure = models.ForeignKey(
        'candidates.PlacementClosure', null=True, blank=True, on_delete=models.SET_NULL, related_name='employer_placements'
    )
    candidate_name = models.CharField(max_length=255, blank=True, null=True)
    role_title = models.CharField(max_length=255)
    offer_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, default='USD')
    start_date = models.DateField(null=True, blank=True)
    hr_contact = models.CharField(max_length=255, blank=True, null=True)
    verification_status = models.CharField(max_length=30, default='VERIFIED')
    offer_letter_url = models.CharField(max_length=500, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'employer_placements'
        ordering = ['-created_at']

    def __str__(self):
        return f"Placement @ {self.company.company_name} - {self.role_title}"


class CandidateJobOpportunity(models.Model):
    """
    Candidate-specific discovery opportunity.
    Tracks status (NOT_APPLIED, APPLIED, REJECTED) and rejection reason per candidate.
    Enables shared jobs across candidates to be displayed and managed independently.
    """
    STATUS_CHOICES = [
        ('NOT_APPLIED', 'Not Applied'),
        ('APPLIED', 'Applied'),
        ('REJECTED', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(
        'candidates.Candidate', on_delete=models.CASCADE, related_name='job_opportunities'
    )
    job = models.ForeignKey(
        DiscoveredJob, on_delete=models.CASCADE, related_name='candidate_opportunities'
    )
    recruiter = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='candidate_job_opportunities'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NOT_APPLIED', db_index=True)
    rejection_reason = models.TextField(blank=True, null=True)
    job_link_entry = models.ForeignKey(
        'recruiters.JobLinkEntry', null=True, blank=True, on_delete=models.SET_NULL, related_name='discovery_opportunity'
    )
    applied_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'candidate_job_opportunities'
        unique_together = ('candidate', 'job')
        indexes = [
            models.Index(fields=['candidate', 'status'], name='idx_cjo_cand_status'),
            models.Index(fields=['job', 'status'], name='idx_cjo_job_status'),
            models.Index(fields=['recruiter', '-created_at'], name='idx_cjo_rec_created'),
        ]

    def __str__(self):
        return f"Opportunity: Candidate {self.candidate_id} - Job {self.job_id} [{self.status}]"

