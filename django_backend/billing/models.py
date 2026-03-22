import uuid
from django.db import models
from candidates.models import Candidate
from users.models import User


class SubscriptionPlan(models.Model):
    """Admin-defined subscription plans."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    billing_cycle = models.CharField(max_length=20, default='monthly')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscription_plans'

    def __str__(self):
        return f"{self.name} - {self.amount} {self.currency}"


class Subscription(models.Model):
    STATUS_CHOICES = [
        ('trialing', 'Trialing'), ('active', 'Active'), ('past_due', 'Past Due'),
        ('canceled', 'Canceled'), ('unpaid', 'Unpaid'), ('grace_period', 'Grace Period'), ('paused', 'Paused'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.OneToOneField(Candidate, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True, related_name='subscriptions')
    plan_name = models.CharField(max_length=100, default='standard')
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default='INR')
    billing_cycle = models.CharField(max_length=20, default='monthly')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    start_date = models.DateField(blank=True, null=True)
    next_billing_at = models.DateField(blank=True, null=True)
    last_payment_at = models.DateTimeField(blank=True, null=True)
    grace_days = models.IntegerField(default=5)
    grace_period_ends_at = models.DateTimeField(blank=True, null=True)
    failed_attempts = models.IntegerField(default=0)
    canceled_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscriptions'


class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'), ('completed', 'Completed'), ('failed', 'Failed'), ('refunded', 'Refunded'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    payment_type = models.CharField(max_length=50, default='subscription')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    payment_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    razorpay_order_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']


class Invoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='invoices')
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='invoices')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(max_length=20, default='pending')
    attempted_at = models.DateTimeField(blank=True, null=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    payment_reference = models.CharField(max_length=255, blank=True, null=True)
    failure_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invoices'
        ordering = ['-period_start']
