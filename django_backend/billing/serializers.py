from rest_framework import serializers
from .models import SubscriptionPlan, SubscriptionAddon, Subscription, SubscriptionAddonAssignment, RazorpayOrder, Payment, Invoice


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']


class SubscriptionAddonSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionAddon
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'created_by']


class SubscriptionAddonAssignmentSerializer(serializers.ModelSerializer):
    addon_detail = SubscriptionAddonSerializer(source='addon', read_only=True)

    class Meta:
        model = SubscriptionAddonAssignment
        fields = ['id', 'addon', 'addon_detail', 'added_by', 'added_at']
        read_only_fields = ['id', 'added_at', 'added_by']


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_detail = SubscriptionPlanSerializer(source='plan', read_only=True)
    addon_assignments = SubscriptionAddonAssignmentSerializer(many=True, read_only=True)
    candidate_name = serializers.SerializerMethodField()
    candidate_email = serializers.SerializerMethodField()
    total_addons_amount = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'assigned_by']

    def get_candidate_name(self, obj):
        user = obj.candidate.user
        if hasattr(user, 'profile') and user.profile.full_name:
            return user.profile.full_name
        return user.email

    def get_candidate_email(self, obj):
        return obj.candidate.user.email

    def get_total_addons_amount(self, obj):
        total = sum(a.addon.amount for a in obj.addon_assignments.all())
        return float(total)


class RazorpayOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = RazorpayOrder
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'verified_at']


class PaymentSerializer(serializers.ModelSerializer):
    candidate_name = serializers.SerializerMethodField()
    candidate_display_id = serializers.SerializerMethodField()
    display_id = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'recorded_by']

    def get_candidate_name(self, obj):
        user = obj.candidate.user
        if hasattr(user, 'profile') and user.profile.full_name:
            return user.profile.full_name
        return user.email

    def get_candidate_display_id(self, obj):
        return obj.candidate.display_id

    def get_display_id(self, obj):
        return f"PAY{str(obj.id)[:8].upper()}"


class InvoiceSerializer(serializers.ModelSerializer):
    candidate_display_id = serializers.SerializerMethodField()
    display_id = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def get_candidate_display_id(self, obj):
        return obj.candidate.display_id

    def get_display_id(self, obj):
        return f"INV{str(obj.id)[:8].upper()}"
