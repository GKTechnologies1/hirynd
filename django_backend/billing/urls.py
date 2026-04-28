from django.urls import path
from . import views

urlpatterns = [
    # Subscription plans catalogue
    path('plans/', views.list_plans, name='list_plans'),
    path('plans/create/', views.create_plan, name='create_plan'),
    path('plans/<uuid:plan_id>/', views.manage_plan, name='manage_plan'),

    # Subscription addons catalogue
    path('addons/', views.list_addons, name='list_addons'),
    path('addons/create/', views.create_addon, name='create_addon'),
    path('addons/<uuid:addon_id>/', views.manage_addon, name='manage_addon'),

    # Admin overview
    path('subscriptions/', views.all_subscriptions, name='all_subscriptions'),
    path('payments/all/', views.all_payments, name='all_payments'),
    path('invoices/all/', views.all_invoices, name='all_invoices'),
    path('alerts/', views.billing_alerts, name='billing_alerts'),
    path('analytics/', views.billing_analytics, name='billing_analytics'),
    path('invoices/<uuid:invoice_id>/update/', views.update_invoice, name='update_invoice'),

    # Per-candidate
    path('<uuid:candidate_id>/subscription/', views.subscription_detail, name='subscription_detail'),
    path('<uuid:candidate_id>/subscription/create/', views.create_subscription_manual, name='create_subscription_manual'),
    path('<uuid:candidate_id>/subscription/assign/', views.assign_plan, name='assign_plan'),
    path('<uuid:candidate_id>/subscription/update/', views.update_subscription, name='update_subscription'),
    path('<uuid:candidate_id>/subscription/addon/', views.add_addon_to_subscription, name='add_addon_to_subscription'),

    # Razorpay
    path('<uuid:candidate_id>/payment/create-order/', views.create_razorpay_order, name='create_razorpay_order'),
    path('<uuid:candidate_id>/payment/verify/', views.verify_razorpay_payment, name='verify_razorpay_payment'),

    # Payment history
    path('<uuid:candidate_id>/payments/', views.payments, name='payments'),
    path('<uuid:candidate_id>/payments/record/', views.record_payment, name='record_payment'),
    path('<uuid:candidate_id>/payments/<uuid:payment_id>/pay/', views.initiate_payment, name='initiate_payment'),
    path('<uuid:candidate_id>/payments/<uuid:payment_id>/verify/', views.verify_individual_payment, name='verify_individual_payment'),
    path('payments/<uuid:payment_id>/manage/', views.manage_payment, name='manage_payment'),
    path('<uuid:candidate_id>/invoices/', views.invoices, name='invoices'),
    
    # New endpoints for Frontend Candidate Billing
    path('<uuid:candidate_id>/overview/', views.candidate_overview, name='candidate_overview'),
    path('invoices/<uuid:invoice_id>/download/', views.download_invoice, name='download_invoice'),
]
