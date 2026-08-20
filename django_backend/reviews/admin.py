from django.contrib import admin
from .models import Review

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'rating', 'is_approved', 'created_at')
    list_filter = ('is_approved', 'rating')
    search_fields = ('candidate__user__email', 'review_text', 'job_title')
