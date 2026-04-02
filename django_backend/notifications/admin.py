from django.contrib import admin
from .models import Notification, EmailLog

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('user__email', 'title', 'message')
    readonly_fields = ('created_at',)

@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ('recipient_email', 'email_type', 'status', 'created_at')
    list_filter = ('status', 'email_type', 'created_at')
    search_fields = ('recipient_email', 'error_message')
    readonly_fields = ('created_at', 'recipient_email', 'email_type', 'status', 'error_message')

