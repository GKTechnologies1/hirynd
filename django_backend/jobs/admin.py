from django.contrib import admin
from .models import JobOpening, CandidateSubmission

@admin.register(JobOpening)
class JobOpeningAdmin(admin.ModelAdmin):
    list_display = ['title', 'company', 'status', 'employment_type', 'created_at']
    list_filter = ['status', 'employment_type']
    search_fields = ['title', 'company']

@admin.register(CandidateSubmission)
class CandidateSubmissionAdmin(admin.ModelAdmin):
    list_display = ['job', 'candidate', 'status', 'submitted_by', 'created_at']
    list_filter = ['status']
