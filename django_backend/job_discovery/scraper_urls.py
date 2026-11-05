from django.urls import path
from . import views

urlpatterns = [
    path('roles/', views.list_eligible_roles, name='scraper_roles'),
    path('run/', views.run_scraper, name='scraper_run'),
    path('executions/', views.list_executions, name='scraper_executions'),
    path('executions/<uuid:execution_id>/', views.get_execution_detail, name='scraper_execution_detail'),
]

