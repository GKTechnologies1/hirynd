from django.urls import path
from . import admin_views

urlpatterns = [
    path('referrals/', admin_views.admin_referrals, name='admin_referrals'),
    path('referrals/<uuid:referral_id>/', admin_views.admin_referral_update, name='admin_referral_update'),
    path('config/', admin_views.admin_config, name='admin_config'),
    path('training-clicks/', admin_views.admin_training_clicks, name='admin_training_clicks'),
    path('send-test-email/', admin_views.send_test_email, name='send_test_email'),
    path('reports/pipeline/', admin_views.report_pipeline, name='report_pipeline'),
    path('reports/recruiter-productivity/', admin_views.report_recruiter_productivity, name='report_recruiter_productivity'),
    path('reports/candidate-activity/', admin_views.report_candidate_activity, name='report_candidate_activity'),
    path('reports/subscription-ledger/', admin_views.report_subscription_ledger, name='report_subscription_ledger'),
]
