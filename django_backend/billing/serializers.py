import re
from rest_framework import serializers
from .models import SubscriptionPlan, SubscriptionAddon, Subscription, SubscriptionAddonAssignment, RazorpayOrder, Payment, Invoice, PurchaseHistory


def clean_razorpay_ids(text):
    if not text:
        return text
    # Mask/strip patterns like "| Razorpay payment pay_Sv1Ta4P6sPfata" or similar
    cleaned = re.sub(r'(?:\s*\|\s*|\s*-\s*|\s*,\s*|^|\b)Razorpay\s*(?:payment|Signature|Order|:)?\s*[a-zA-Z0-9_]+', '', text, flags=re.IGNORECASE).strip()
    # Strip any general pay_, order_, sign_, rzp_ patterns
    cleaned = re.sub(r'\b(?:pay|order|sign|rzp)_[a-zA-Z0-9_]+\b', '', cleaned, flags=re.IGNORECASE).strip()
    # Clean dangling separators
    cleaned = re.sub(r'^[|,\-\s]+|[|,\-\s]+$', '', cleaned).strip()
    return cleaned or None


def is_razorpay_id(ref):
    if not ref:
        return False
    ref = str(ref).strip()
    if ref.startswith('pay_') or ref.startswith('rzp_') or ref.startswith('order_') or ref.startswith('sign_'):
        return True
    if not (ref.startswith('ADMIN-') or ref.startswith('INV') or ref.startswith('PAY') or ref.startswith('TXN-')):
        return True
    return False


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
    addon_assignments = serializers.SerializerMethodField()
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

    def get_addon_assignments(self, obj):
        assignments = SubscriptionAddonAssignment.objects.filter(candidate=obj.candidate).order_by('-added_at')
        return SubscriptionAddonAssignmentSerializer(assignments, many=True).data

    def get_total_addons_amount(self, obj):
        total = sum(a.amount if a.amount > 0 else a.addon.amount for a in obj.candidate.addon_assignments.all())
        return float(total)

    def to_representation(self, instance):
        instance.check_status()
        return super().to_representation(instance)



class RazorpayOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = RazorpayOrder
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'verified_at']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        is_admin = request and request.user and request.user.role == 'admin'
        if not is_admin:
            if ret.get('razorpay_order_id'):
                ret['razorpay_order_id'] = f"ORD-{str(instance.id)[:8].upper()}"
            if ret.get('razorpay_payment_id'):
                ret['razorpay_payment_id'] = f"TXN-{str(instance.id)[:8].upper()}"
            if ret.get('razorpay_signature'):
                ret['razorpay_signature'] = None
        return ret


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
        if ret.get('notes'):
            ret['notes'] = clean_razorpay_ids(ret['notes'])
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
        if ret.get('description'):
            ret['description'] = clean_razorpay_ids(ret['description'])
        if ret.get('payment_reference'):
            ref = ret['payment_reference']
            if is_razorpay_id(ref):
                ret['payment_reference'] = f"TXN-{str(instance.id)[:8].upper()}"
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
        if ret.get('service_name'):
            ret['service_name'] = clean_razorpay_ids(ret['service_name'])
        if ret.get('transaction_id'):
            tid = ret['transaction_id']
            if is_razorpay_id(tid):
                ret['transaction_id'] = f"TXN-{str(instance.id)[:8].upper()}"
        if ret.get('invoice_reference'):
            ref = ret['invoice_reference']
            if is_razorpay_id(ref):
                ret['invoice_reference'] = f"TXN-{str(instance.id)[:8].upper()}"
        return ret
