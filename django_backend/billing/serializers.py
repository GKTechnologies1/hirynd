from rest_framework import serializers
from .models import SubscriptionPlan, SubscriptionAddon, Subscription, SubscriptionAddonAssignment, RazorpayOrder, Payment, Invoice, PurchaseHistory


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
        fields = ['id', 'addon', 'addon_detail', 'added_by', 'added_at', 'amount', 'status', 'candidate', 'subscription']
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
        total = sum(a.amount if a.amount > 0 else a.addon.amount for a in obj.addon_assignments.all())
        return float(total)

    def to_representation(self, instance):
        instance.check_status()
        return super().to_representation(instance)



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

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Sanitise notes to exclude any auto-generated Razorpay payment ID strings
        if ret.get('notes'):
            import re
            cleaned = re.sub(r'(?:\s*\|\s*|\s*-\s*|\s*,\s*|^|\b)Razorpay\s*(?:payment|:)?\s*[a-zA-Z0-9_]+', '', ret['notes'], flags=re.IGNORECASE).strip()
            # Clean dangling separators
            cleaned = re.sub(r'^[|,\-\s]+|[|,\-\s]+$', '', cleaned).strip()
            ret['notes'] = cleaned or None
        return ret


class InvoiceSerializer(serializers.ModelSerializer):
    candidate_display_id = serializers.SerializerMethodField()
    display_id = serializers.SerializerMethodField()
    is_addon = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def get_candidate_display_id(self, obj):
        return obj.candidate.display_id

    def get_display_id(self, obj):
        return f"INV{str(obj.id)[:8].upper()}"

    def get_is_addon(self, obj):
        if obj.purchase_histories.exists():
            return True
        desc = (obj.description or "").lower()
        if any(x in desc for x in ["addon", "add-on", "mock practice", "interview support", "operations support"]):
            return True
        if not obj.subscription_id:
            return True
        return False

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Mask payment_reference if it's an automatically-linked Razorpay ID (starts with pay_ or doesn't start with ADMIN-)
        if ret.get('payment_reference'):
            ref = ret['payment_reference']
            if ref.startswith('pay_') or ref.startswith('rzp_') or (not ref.startswith('ADMIN-')):
                ret['payment_reference'] = None
        return ret


class PurchaseHistorySerializer(serializers.ModelSerializer):
    candidate_name = serializers.SerializerMethodField()
    candidate_display_id = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseHistory
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_candidate_name(self, obj):
        user = obj.candidate.user
        if hasattr(user, 'profile') and user.profile.full_name:
            return user.profile.full_name
        return user.email

    def get_candidate_display_id(self, obj):
        return obj.candidate.display_id

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Hide transaction_id if it is a Razorpay ID
        if ret.get('transaction_id'):
            tid = ret['transaction_id']
            if tid.startswith('pay_') or tid.startswith('rzp_') or (not tid.startswith('ADMIN-')):
                ret['transaction_id'] = None
        # Hide invoice_reference if it is a Razorpay ID
        if ret.get('invoice_reference'):
            ref = ret['invoice_reference']
            if ref.startswith('pay_') or ref.startswith('rzp_') or (not ref.startswith('ADMIN-')):
                ret['invoice_reference'] = None
        return ret
