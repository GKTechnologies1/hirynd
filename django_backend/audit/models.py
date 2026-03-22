import uuid
from django.db import models
from users.models import User


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=100)
    target_id = models.CharField(max_length=100, blank=True, null=True)
    target_type = models.CharField(max_length=50)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']


class AdminConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    config_key = models.CharField(max_length=100, unique=True)
    config_value = models.TextField(default='')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'admin_config'

    def __str__(self):
        return self.config_key
