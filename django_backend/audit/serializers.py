from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    actor_display_id = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = '__all__'

    def get_actor_name(self, obj):
        if obj.actor and hasattr(obj.actor, 'profile'):
            return obj.actor.profile.full_name
        return ''

    def get_actor_display_id(self, obj):
        if obj.actor:
            return obj.actor.display_id
        return ''
