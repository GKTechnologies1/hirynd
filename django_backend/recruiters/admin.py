from django.contrib import admin
from .models import (
    RecruiterProfile, RecruiterBankDetails, RecruiterAssignment, 
    TeamLeadAssignment, DailySubmissionLog, JobLinkEntry
)

class JobLinkEntryInline(admin.TabularInline):
    model = JobLinkEntry
    extra = 0
    fields = ('company_name', 'role_title', 'application_status', 'job_url')

@admin.register(RecruiterProfile)
class RecruiterProfileAdmin(admin.ModelAdmin):
    list_display = ('get_full_name', 'user_email', 'company_name', 'department', 'max_clients', 'created_at')
    list_filter = ('company_name', 'department', 'created_at')
    search_fields = ('user__email', 'user__profile__full_name', 'company_name', 'employee_id')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Identity', {
            'fields': ('user', 'company_name', 'employee_id', 'department')
        }),
        ('Professional Specs', {
            'fields': ('specialization', 'max_clients', 'prior_recruitment_experience', 'work_type_preference')
        }),
        ('Academic & Links', {
            'fields': ('university', 'major', 'graduation_date', 'linkedin_url', 'social_profile_url')
        }),
        ('Location', {
            'fields': ('city', 'state', 'country')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
        }),
    )

    def get_full_name(self, obj):
        return obj.user.profile.full_name
    get_full_name.short_description = 'Full Name'

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email'

@admin.register(RecruiterBankDetails)
class RecruiterBankDetailsAdmin(admin.ModelAdmin):
    list_display = ('recruiter', 'bank_name', 'account_number_last4', 'updated_at')
    readonly_fields = ('created_at', 'updated_at', 'account_number_encrypted', 'routing_number_encrypted')

@admin.register(RecruiterAssignment)
class RecruiterAssignmentAdmin(admin.ModelAdmin):
    list_display = ('recruiter', 'candidate', 'role_type', 'is_active', 'assigned_at')
    list_filter = ('is_active', 'role_type', 'assigned_at')
    search_fields = ('recruiter__email', 'candidate__user__email')

@admin.register(TeamLeadAssignment)
class TeamLeadAssignmentAdmin(admin.ModelAdmin):
    list_display = ('team_lead', 'candidate', 'is_active', 'assigned_at')
    list_filter = ('is_active', 'assigned_at')

@admin.register(DailySubmissionLog)
class DailySubmissionLogAdmin(admin.ModelAdmin):
    list_display = ('log_date', 'recruiter', 'candidate', 'applications_count', 'offer_count')
    list_filter = ('log_date', 'recruiter')
    search_fields = ('recruiter__email', 'candidate__user__email')
    inlines = [JobLinkEntryInline]

@admin.register(JobLinkEntry)
class JobLinkEntryAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'role_title', 'candidate', 'application_status', 'created_at')
    list_filter = ('application_status', 'created_at')
    search_fields = ('company_name', 'role_title', 'candidate__user__email')

