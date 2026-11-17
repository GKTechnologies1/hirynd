from django.urls import path
from . import views

urlpatterns = [
    path('jobs/', views.list_discovered_jobs, name='discovery_jobs'),
    path('jobs/<uuid:job_id>/', views.get_discovered_job_detail, name='discovery_job_detail'),
    path('jobs/<uuid:job_id>/review/', views.review_discovered_job, name='discovery_job_review'),
    path('jobs/<uuid:job_id>/approve-for-job-management/', views.approve_for_job_management, name='discovery_approve_management'),
    path('statistics/', views.job_discovery_statistics, name='discovery_statistics'),
    path('filters/', views.get_job_discovery_filters, name='discovery_filters'),
]

