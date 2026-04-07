from django.contrib import admin
from .models import (
    Candidate, ClientIntake, RoleSuggestion, RoleConfirmation, 
    CredentialVersion, Referral, InterviewLog, PlacementClosure, Payment, TrainingScheduleClick,
    InterestedCandidate,
)

class ClientIntakeInline(admin.StackedInline):
    model = ClientIntake
    can_delete = False
    verbose_name_plural = 'Client Intake'
    fields = ('data', 'is_locked', 'submitted_at')

@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ('get_full_name', 'email', 'status', 'created_at')
    list_filter = ('status', 'referral_source', 'created_at')
    search_fields = ('user__email', 'user__profile__full_name', 'university', 'major')
    ordering = ('-created_at',)
    inlines = [ClientIntakeInline]
    
    fieldsets = (
        ('Account Info', {
            'fields': ('user', 'status')
        }),
        ('Academic Background', {
            'fields': ('university', 'degree', 'major', 'graduation_date')
        }),
        ('Professional Profiles', {
            'fields': ('resume_url', 'drive_folder_url', 'linkedin_url', 'github_url', 'portfolio_url')
        }),
        ('Internal Tracking', {
            'fields': ('referral_source', 'referral_friend_name', 'current_location', 'opt_end_date', 'notes')
        }),
        ('Cal.com Links', {
            'classes': ('collapse',),
            'fields': ('cal_training_url', 'cal_mock_practice_url', 'cal_interview_training_url', 'cal_interview_support_url', 'cal_operations_call_url')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
        }),
    )
    readonly_fields = ('created_at', 'updated_at')

    def get_full_name(self, obj):
        return obj.user.profile.full_name
    get_full_name.short_description = 'Full Name'
    
    def email(self, obj):
        return obj.user.email


@admin.register(InterestedCandidate)
class InterestedCandidateAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'university', 'visa_status', 'created_at')
    list_filter = ('visa_status', 'referral_source', 'created_at')
    search_fields = ('name', 'email', 'university', 'degree_major', 'referral_source', 'referral_friend_name')
    ordering = ('-created_at',)

    fieldsets = (
        ('Lead Information', {
            'fields': ('name', 'email', 'phone', 'status', 'user')
        }),
        ('Interest Details', {
            'fields': ('university', 'degree_major', 'graduation_year', 'visa_status', 'referral_source', 'referral_friend_name', 'current_location', 'notes', 'resume_url')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
        }),
    )
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ClientIntake)
class ClientIntakeAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'is_locked', 'submitted_at')
    list_filter = ('is_locked', 'submitted_at')
    search_fields = ('candidate__user__email', 'candidate__user__profile__full_name')

@admin.register(RoleSuggestion)
class RoleSuggestionAdmin(admin.ModelAdmin):
    list_display = ('role_title', 'candidate', 'suggested_by', 'candidate_confirmed', 'created_at')
    list_filter = ('candidate_confirmed', 'created_at')
    search_fields = ('role_title', 'candidate__user__email')

@admin.register(RoleConfirmation)
class RoleConfirmationAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'response', 'responded_at')
    list_filter = ('response', 'responded_at')

@admin.register(CredentialVersion)
class CredentialVersionAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'version', 'edited_by', 'created_at')
    list_filter = ('version', 'created_at')
    readonly_fields = ('created_at',)

@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ('friend_name', 'friend_email', 'referrer', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('friend_name', 'friend_email', 'referrer__user__email')

@admin.register(InterviewLog)
class InterviewLogAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'interview_type', 'company_name', 'role_title', 'interview_date', 'outcome')
    list_filter = ('interview_type', 'outcome', 'interview_date')
    search_fields = ('company_name', 'role_title', 'candidate__user__email')

@admin.register(PlacementClosure)
class PlacementClosureAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'company_name', 'role_title', 'salary', 'start_date')
    search_fields = ('company_name', 'candidate__user__email')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('charge_name', 'candidate', 'amount', 'due_date', 'payment_status')
    list_filter = ('payment_status', 'charge_type', 'due_date')
    search_fields = ('charge_name', 'candidate__user__email')

@admin.register(TrainingScheduleClick)
class TrainingScheduleClickAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'schedule_type', 'clicked_by', 'clicked_at')
    list_filter = ('schedule_type', 'clicked_at')

