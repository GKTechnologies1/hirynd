from django.contrib import admin
from .models import (
    SubscriptionPlan, SubscriptionAddon, Subscription, 
    SubscriptionAddonAssignment, RazorpayOrder, Payment, Invoice
)

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'amount', 'currency', 'billing_cycle', 'is_active', 'is_base')
    list_filter = ('billing_cycle', 'is_active', 'is_base')
    search_fields = ('name',)

@admin.register(SubscriptionAddon)
class SubscriptionAddonAdmin(admin.ModelAdmin):
    list_display = ('name', 'amount', 'currency', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'plan_name', 'amount', 'status', 'next_billing_at')
    list_filter = ('status', 'billing_cycle', 'plan_name')
    search_fields = ('candidate__user__email', 'candidate__user__profile__full_name')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(SubscriptionAddonAssignment)
class SubscriptionAddonAssignmentAdmin(admin.ModelAdmin):
    list_display = ('subscription', 'addon', 'amount', 'added_at')
    list_filter = ('added_at',)

@admin.register(RazorpayOrder)
class RazorpayOrderAdmin(admin.ModelAdmin):
    list_display = ('razorpay_order_id', 'candidate', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('razorpay_order_id', 'candidate__user__email')
    readonly_fields = ('created_at',)

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'amount', 'currency', 'payment_type', 'status', 'payment_date')
    list_filter = ('status', 'payment_type', 'payment_date')
    search_fields = ('candidate__user__email', 'notes')
    readonly_fields = ('created_at',)

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'amount', 'period_start', 'period_end', 'status')
    list_filter = ('status', 'period_start')
    search_fields = ('candidate__user__email',)

