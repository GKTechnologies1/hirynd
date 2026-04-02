from django.contrib import admin
from .models import JobOpening, CandidateSubmission

class CandidateSubmissionInline(admin.TabularInline):
    model = CandidateSubmission
    extra = 0
    fields = ('candidate', 'status', 'submitted_by', 'created_at')
    readonly_fields = ('created_at',)

@admin.register(JobOpening)
class JobOpeningAdmin(admin.ModelAdmin):
    list_display = ('title', 'company', 'status', 'employment_type', 'remote', 'created_at')
    list_filter = ('status', 'employment_type', 'remote', 'created_at')
    search_fields = ('title', 'company', 'location')
    ordering = ('-created_at',)
    inlines = [CandidateSubmissionInline]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('title', 'company', 'status')
        }),
        ('Job Details', {
            'fields': ('location', 'remote', 'salary_range', 'employment_type', 'posted_by')
        }),
        ('Descriptions & Skills', {
            'fields': ('description', 'required_skills')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
        }),
    )
    readonly_fields = ('created_at', 'updated_at')

@admin.register(CandidateSubmission)
class CandidateSubmissionAdmin(admin.ModelAdmin):
    list_display = ('job', 'candidate', 'status', 'submitted_by', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('job__title', 'job__company', 'candidate__user__email')
    readonly_fields = ('created_at', 'updated_at')

