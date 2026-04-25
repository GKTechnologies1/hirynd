from django.urls import path
from . import views

from django.urls import path
from . import views

urlpatterns = [
    path('my-candidates/', views.my_candidates, name='my_candidates'),
    path('my-assignments/', views.my_assignments, name='my_assignments'),
    path('assign/', views.assign_recruiter, name='assign_recruiter'),
    path('unassign/<uuid:assignment_id>/', views.unassign_recruiter, name='unassign_recruiter'),
    path('<uuid:candidate_id>/assignments/', views.assignments, name='assignments'),
    path('<uuid:candidate_id>/daily-logs/', views.daily_logs, name='daily_logs'),
    path('jobs/<uuid:job_id>/status/', views.update_job_status, name='update_job_status'),
    path('fetch-job-details/', views.fetch_job_details, name='fetch_job_details'),
    path('stats/', views.recruiter_stats, name='recruiter_stats'),
    path('profile/', views.recruiter_profile, name='recruiter_profile'),
    path('admin/profile/<uuid:user_id>/', views.admin_update_profile, name='admin_update_profile'),
    path('admin/profile/<uuid:user_id>/assignments/', views.admin_get_assignments, name='admin_get_assignments'),
    path('bank-details/', views.bank_details, name='bank_details'),
]
