import uuid
from django.db import models
from candidates.models import Candidate
from users.models import User


# ────────────────────────────────────────────────────────────────
#  Subscription Plans  (admin-managed catalogue)
# ────────────────────────────────────────────────────────────────
class SubscriptionPlan(models.Model):
    """Admin-defined reusable plan templates (e.g. Standard, Premium)."""
    BILLING_CYCLE_CHOICES = [
        ('one_time', 'One Time'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annual', 'Annual'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')
    billing_cycle = models.CharField(max_length=20, choices=BILLING_CYCLE_CHOICES, default='monthly')
    is_active = models.BooleanField(default=True)
    is_base = models.BooleanField(default=True, help_text='Base plan vs addon plan')
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='created_plans')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscription_plans'
        ordering = ['amount']

    def __str__(self):
        return f"{self.name} ({self.currency} {self.amount}/{self.billing_cycle})"


class SubscriptionAddon(models.Model):
    """Add-on products that can be appended to a base subscription."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='created_addons')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subscription_addons'
        ordering = ['amount']

    def __str__(self):
        return f"{self.name} (+{self.currency} {self.amount})"


# ────────────────────────────────────────────────────────────────
#  User Subscription  (plan instance assigned to a candidate)
# ────────────────────────────────────────────────────────────────
class Subscription(models.Model):
    STATUS_CHOICES = [
        ('pending_payment', 'Pending Payment'),   # admin assigned plan, awaiting candidate payment
        ('trialing', 'Trialing'),
        ('active', 'Active'),
        ('past_due', 'Past Due'),
        ('grace_period', 'Grace Period'),
        ('paused', 'Paused'),
        ('canceled', 'Canceled'),
        ('unpaid', 'Unpaid'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.OneToOneField(Candidate, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(SubscriptionPlan, null=True, blank=True, on_delete=models.SET_NULL, related_name='subscriptions')
    # keep flat fields for quick reads / backward compat
    plan_name = models.CharField(max_length=100, default='standard')
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default='USD')
    billing_cycle = models.CharField(max_length=20, default='monthly')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_payment')
    start_date = models.DateField(blank=True, null=True)
    next_billing_at = models.DateField(blank=True, null=True)
    last_payment_at = models.DateTimeField(blank=True, null=True)
    grace_days = models.IntegerField(default=5)
    grace_period_ends_at = models.DateTimeField(blank=True, null=True)
    failed_attempts = models.IntegerField(default=0)
    canceled_at = models.DateTimeField(blank=True, null=True)
    # who assigned / initiated payment
    assigned_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_subscriptions')
    payment_initiated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscriptions'

    def __str__(self):
        return f"Sub({self.candidate.user.email} — {self.plan_name})"


class SubscriptionAddonAssignment(models.Model):
    """Addons added to a specific candidate's subscription."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='addon_assignments')
    addon = models.ForeignKey(SubscriptionAddon, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='Actual price for this assignment')
    added_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='added_addons')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subscription_addon_assignments'
        unique_together = [('subscription', 'addon')]

    def __str__(self):
        return f"{self.addon.name} for {self.subscription.candidate.user.email}"


# ────────────────────────────────────────────────────────────────
#  Razorpay Order   (tracks each checkout attempt)
# ────────────────────────────────────────────────────────────────
from django.core.serializers.json import DjangoJSONEncoder


class RazorpayOrder(models.Model):
    STATUS_CHOICES = [
        ('created', 'Created'),
        ('attempted', 'Attempted'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='razorpay_orders')
    subscription = models.ForeignKey(Subscription, null=True, blank=True, on_delete=models.SET_NULL, related_name='razorpay_orders')
    razorpay_order_id = models.CharField(max_length=100, unique=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)          # in USD (not cents)
    currency = models.CharField(max_length=10, default='USD')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='created')
    payment_type = models.CharField(max_length=50, default='monthly_service')  # type category
    notes = models.JSONField(default=dict, encoder=DjangoJSONEncoder, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'razorpay_orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.razorpay_order_id} - {self.candidate.user.email} (${self.amount})"


# ────────────────────────────────────────────────────────────────
#  Payment   (confirmed payment ledger entry)
# ────────────────────────────────────────────────────────────────
class Payment(models.Model):
    PAYMENT_TYPE_CHOICES = [
        ('monthly_service', 'Monthly Service Fee ($400)'),
        ('mock_practice', 'Mock Practice Fee'),
        ('interview_support', 'Interview Support Fee'),
        ('operations_support', 'Operations Support Fee'),
        ('manual', 'Manual / Other'),
        ('refund', 'Refund'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='billing_payments')
    subscription = models.ForeignKey(Subscription, null=True, blank=True, on_delete=models.SET_NULL, related_name='payments')
    razorpay_order = models.OneToOneField(RazorpayOrder, null=True, blank=True, on_delete=models.SET_NULL, related_name='payment')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')
    payment_type = models.CharField(max_length=50, choices=PAYMENT_TYPE_CHOICES, default='subscription')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')   # completed / refunded / failed
    payment_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='recorded_payments')
    seq_number = models.PositiveIntegerField(null=True, blank=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def display_id(self):
        """Human-readable ID: e.g. HYRPAY001"""
        if not self.seq_number:
            return f"PAY-{str(self.id)[:8].upper()}"
        return f"HYRPAY{str(self.seq_number).zfill(6)}"

    def save(self, *args, **kwargs):
        if self._state.adding and not self.seq_number:
            from django.db.models import Max
            max_seq = Payment.objects.aggregate(Max('seq_number'))['seq_number__max'] or 0
            self.seq_number = max_seq + 1
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'billing_payments'
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.amount} {self.currency} - {self.candidate.user.email} ({self.status})"


# ────────────────────────────────────────────────────────────────
#  Invoice
# ────────────────────────────────────────────────────────────────
class Invoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='invoices')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(max_length=20, default='pending')
    attempted_at = models.DateTimeField(blank=True, null=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    payment_reference = models.CharField(max_length=255, blank=True, null=True)
    failure_reason = models.TextField(blank=True, null=True)
    seq_number = models.PositiveIntegerField(unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def display_id(self):
        if not self.seq_number:
            return f"HYRINV-{str(self.id).split('-')[0][:8].upper()}"
        return f"HYRINV{str(self.seq_number).zfill(6)}"

    def save(self, *args, **kwargs):
        if not self.seq_number:
            from django.db.models import Max
            max_seq = Invoice.objects.aggregate(Max('seq_number'))['seq_number__max'] or 0
            self.seq_number = max_seq + 1
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'invoices'
        ordering = ['-period_start']

    def __str__(self):
        return f"Invoice {self.display_id} - {self.candidate.user.email}"


class InvoiceItem(models.Model):
    """Line items for an invoice (Plan, Addons, etc.)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    item_type = models.CharField(max_length=50, choices=[('plan', 'Base Plan'), ('addon', 'Addon')], default='plan')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invoice_items'

    def __str__(self):
        return f"{self.name} - {self.amount} ({self.invoice.display_id})"
