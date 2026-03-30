import uuid
from django.db import models
from users.models import User
from candidates.models import Candidate


class JobOpening(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('on_hold', 'On Hold'),
        ('closed', 'Closed'),
    ]
    EMPLOYMENT_CHOICES = [
        ('full_time', 'Full Time'),
        ('contract', 'Contract'),
        ('c2c', 'Corp-to-Corp'),
        ('w2', 'W2'),
        ('part_time', 'Part Time'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    company = models.CharField(max_length=200)
    location = models.CharField(max_length=200, blank=True)
    remote = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    required_skills = models.JSONField(default=list, blank=True)
    salary_range = models.CharField(max_length=100, blank=True)
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_CHOICES, default='contract')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    posted_by = models.ForeignKey(
        User, null=True, on_delete=models.SET_NULL, related_name='posted_jobs'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'job_openings'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} @ {self.company} [{self.status}]"


class CandidateSubmission(models.Model):
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('screening', 'Screening'),
        ('interviewing', 'Interviewing'),
        ('offered', 'Offered'),
        ('rejected', 'Rejected'),
        ('placed', 'Placed'),
        ('withdrawn', 'Withdrawn'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(JobOpening, on_delete=models.CASCADE, related_name='submissions')
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='job_submissions')
    submitted_by = models.ForeignKey(
        User, null=True, on_delete=models.SET_NULL, related_name='submitted_candidates'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    notes = models.TextField(blank=True)
    interview_date = models.DateTimeField(null=True, blank=True)
    offer_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'candidate_submissions'
        ordering = ['-created_at']
        unique_together = [('job', 'candidate')]

    def __str__(self):
        return f"{self.candidate.user.email} → {self.job.title} [{self.status}]"
