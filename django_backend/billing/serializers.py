from rest_framework import serializers
from .models import SubscriptionPlan, SubscriptionAddon, Subscription, SubscriptionAddonAssignment, RazorpayOrder, Payment, Invoice, InvoiceItem


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
    candidate_display_id = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            'id', 'candidate', 'candidate_name', 'candidate_email', 'plan', 'plan_name', 
            'amount', 'currency', 'billing_cycle', 'status', 'start_date', 'next_billing_at', 
            'last_payment_at', 'total_addons_amount', 'addon_assignments', 'plan_detail',
            'candidate_display_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'assigned_by']

    def get_candidate_name(self, obj):
        user = obj.candidate.user
        if hasattr(user, 'profile') and user.profile.full_name:
            return user.profile.full_name
        return user.email

    def get_candidate_email(self, obj):
        return obj.candidate.user.email

    def get_total_addons_amount(self, obj):
        total = sum((a.addon.amount if a.addon else 0) for a in obj.addon_assignments.all())
        return float(total)

    def get_candidate_display_id(self, obj):
        return obj.candidate.display_id


class RazorpayOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = RazorpayOrder
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'verified_at']


class PaymentSerializer(serializers.ModelSerializer):
    candidate_name = serializers.SerializerMethodField()
    candidate_email = serializers.SerializerMethodField()
    candidate_display_id = serializers.SerializerMethodField()
    display_id = serializers.ReadOnlyField()
    associated_invoice_id = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'display_id', 'candidate', 'candidate_name', 'candidate_email', 
            'candidate_display_id', 'subscription', 'plan_name', 'amount', 'currency', 
            'payment_type', 'status', 'payment_date', 'notes', 'created_at',
            'associated_invoice_id'
        ]
        read_only_fields = ['id', 'created_at', 'recorded_by', 'display_id']

    def get_plan_name(self, obj):
        if obj.subscription and obj.subscription.plan_name:
            return obj.subscription.plan_name
        return "Manual/One-off"

    def get_candidate_name(self, obj):
        user = obj.candidate.user
        if hasattr(user, 'profile') and user.profile.full_name:
            return user.profile.full_name
        return user.email

    def get_candidate_email(self, obj):
        return obj.candidate.user.email

    def get_candidate_display_id(self, obj):
        return obj.candidate.display_id

    def get_associated_invoice_id(self, obj):
        # Link to invoice if exists via reference
        ref = None
        if obj.razorpay_order and obj.razorpay_order.razorpay_payment_id:
            ref = obj.razorpay_order.razorpay_payment_id
        else:
            ref = f"ADMIN-{obj.id}"
        
        from .models import Invoice
        inv = Invoice.objects.filter(payment_reference=ref).first()
        return inv.id if inv else None


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ['id', 'name', 'amount', 'item_type']


class InvoiceSerializer(serializers.ModelSerializer):
    display_id = serializers.ReadOnlyField()
    candidate_display_id = serializers.SerializerMethodField()
    candidate_name = serializers.SerializerMethodField()
    candidate_email = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    items = InvoiceItemSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'display_id', 'subscription', 'plan_name', 'candidate', 'candidate_display_id', 
            'candidate_name', 'candidate_email', 'amount', 'currency', 'status', 'period_start', 
            'period_end', 'paid_at', 'payment_reference', 'created_at', 'items'
        ]
        read_only_fields = ['id', 'created_at', 'display_id']

    def get_candidate_display_id(self, obj):
        return obj.candidate.display_id


    def get_candidate_name(self, obj):
        user = obj.candidate.user
        if hasattr(user, 'profile') and user.profile.full_name:
            return user.profile.full_name
        return user.email

    def get_candidate_email(self, obj):
        return obj.candidate.user.email

    def get_plan_name(self, obj):
        if obj.subscription and obj.subscription.plan_name:
            return obj.subscription.plan_name
        return "Manual/One-off"