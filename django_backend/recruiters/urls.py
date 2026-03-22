from django.urls import path
from . import views

urlpatterns = [
    path('my-candidates/', views.my_candidates, name='my_candidates'),
    path('assign/', views.assign_recruiter, name='assign_recruiter'),
    path('unassign/<uuid:assignment_id>/', views.unassign_recruiter, name='unassign_recruiter'),
    path('all/', views.all_recruiters, name='all_recruiters'),
    path('<uuid:candidate_id>/assignments/', views.assignments, name='assignments'),
    path('<uuid:candidate_id>/daily-logs/', views.daily_logs, name='daily_logs'),
    path('jobs/<uuid:job_id>/status/', views.update_job_status, name='update_job_status'),
]
