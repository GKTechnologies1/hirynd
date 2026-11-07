from django.urls import path
from . import recruiter_views

urlpatterns = [
    path('jobs/', recruiter_views.list_recruiter_jobs, name='recruiter_discovery_jobs'),
    path('jobs/<uuid:job_id>/', recruiter_views.get_recruiter_job_detail, name='recruiter_discovery_job_detail'),
    path('statistics/', recruiter_views.recruiter_job_discovery_statistics, name='recruiter_discovery_statistics'),
    path('filters/', recruiter_views.get_recruiter_job_discovery_filters, name='recruiter_discovery_filters'),
]

