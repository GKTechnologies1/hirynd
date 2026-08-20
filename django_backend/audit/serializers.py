from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = '__all__'

    def get_actor_name(self, obj):
        if obj.actor:
            if hasattr(obj.actor, 'profile') and obj.actor.profile and obj.actor.profile.full_name:
                return obj.actor.profile.full_name
            return obj.actor.email
        return 'System'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        is_admin = request and request.user and request.user.role == 'admin'
        if not is_admin and ret.get('details'):
            import json
            import re
            details_str = json.dumps(ret['details'])
            cleaned_str = re.sub(r'\b(?:pay|order|sign|rzp)_[a-zA-Z0-9_]+\b', 'TXN-HIDDEN', details_str, flags=re.IGNORECASE)
            try:
                ret['details'] = json.loads(cleaned_str)
            except Exception:
                pass
        return ret
