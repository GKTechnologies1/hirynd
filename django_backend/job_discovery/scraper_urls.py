from django.urls import path
from . import views

urlpatterns = [
    path('roles/', views.list_eligible_roles, name='scraper_roles'),
    path('companies/', views.list_visa_companies, name='scraper_companies'),
    path('companies/<int:company_id>/visa-details/', views.get_company_visa_detail, name='scraper_company_visa_detail'),
    path('run/', views.run_scraper, name='scraper_run'),
    path('executions/', views.list_executions, name='scraper_executions'),
    path('executions/<uuid:execution_id>/', views.get_execution_detail, name='scraper_execution_detail'),
    path('executions/<uuid:execution_id>/report/', views.get_execution_session_report, name='scraper_execution_report'),
    path('executions/<uuid:execution_id>/roles/', views.get_execution_roles_breakdown, name='scraper_execution_roles'),
    path('executions/<uuid:execution_id>/distribution/', views.get_execution_distribution, name='scraper_execution_distribution'),
    path('executions/<uuid:execution_id>/assign/', views.assign_execution_jobs, name='scraper_execution_assign'),
    path('cost-reports/', views.get_scraping_cost_reports, name='scraper_cost_reports'),
]

