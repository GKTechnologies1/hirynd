import uuid
from django.db import models
from django.core.serializers.json import DjangoJSONEncoder
from users.models import User


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=100)
    target_id = models.CharField(max_length=100, blank=True, null=True)
    target_type = models.CharField(max_length=50)
    details = models.JSONField(default=dict, encoder=DjangoJSONEncoder, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.actor.email if self.actor else 'System'} - {self.action} on {self.target_type} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"
