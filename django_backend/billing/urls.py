from django.urls import path
from . import views

urlpatterns = [
    # Subscription plans
    path('plans/', views.plan_list, name='plan_list'),
    path('plans/create/', views.plan_create, name='plan_create'),
    path('plans/<uuid:plan_id>/update/', views.plan_update, name='plan_update'),
    path('plans/<uuid:plan_id>/delete/', views.plan_delete, name='plan_delete'),

    # Admin global views
    path('all-payments/', views.all_payments, name='all_payments'),
    path('all-subscriptions/', views.all_subscriptions, name='all_subscriptions'),
    path('payment-summary/', views.payment_summary, name='payment_summary'),
    path('run-checks/', views.run_billing_checks, name='run_billing_checks'),

    # Invoice actions
    path('invoices/<uuid:invoice_id>/pay/', views.record_invoice_payment, name='record_invoice_payment'),
    path('invoices/<uuid:invoice_id>/fail/', views.mark_invoice_failed, name='mark_invoice_failed'),

    # Per-candidate
    path('<uuid:candidate_id>/subscription/', views.subscription_detail, name='subscription_detail'),
    path('<uuid:candidate_id>/subscription/create/', views.create_subscription, name='create_subscription'),
    path('<uuid:candidate_id>/subscription/update/', views.update_subscription, name='update_subscription'),
    path('<uuid:candidate_id>/subscription/pause/', views.pause_subscription, name='pause_subscription'),
    path('<uuid:candidate_id>/subscription/resume/', views.resume_subscription, name='resume_subscription'),
    path('<uuid:candidate_id>/subscription/cancel/', views.cancel_subscription, name='cancel_subscription'),
    path('<uuid:candidate_id>/payments/', views.payments, name='payments'),
    path('<uuid:candidate_id>/payments/record/', views.record_payment, name='record_payment'),
    path('<uuid:candidate_id>/invoices/', views.invoices, name='invoices'),
]
