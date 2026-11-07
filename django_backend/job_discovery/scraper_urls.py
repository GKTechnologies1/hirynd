from django.urls import path
from . import views

urlpatterns = [
    path('roles/', views.list_eligible_roles, name='scraper_roles'),
    path('companies/', views.list_visa_companies, name='scraper_companies'),
    path('companies/<int:company_id>/visa-details/', views.get_company_visa_detail, name='scraper_company_visa_detail'),
    path('run/', views.run_scraper, name='scraper_run'),
    path('executions/', views.list_executions, name='scraper_executions'),
    path('executions/<uuid:execution_id>/', views.get_execution_detail, name='scraper_execution_detail'),
]

