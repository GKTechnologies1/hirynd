from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_jobs, name='list_jobs'),
    path('create/', views.create_job, name='create_job'),
    path('stats/', views.jobs_stats, name='jobs_stats'),
    path('submissions/', views.list_submissions, name='list_submissions'),
    path('submissions/create/', views.create_submission, name='create_submission'),
    path('submissions/<uuid:submission_id>/', views.manage_submission, name='manage_submission'),
    path('<uuid:job_id>/', views.manage_job, name='manage_job'),
]
