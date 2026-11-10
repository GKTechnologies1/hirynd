from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_employers, name='admin_employers_list'),
    path('statistics/', views.employer_discovery_statistics, name='admin_employers_stats'),
    path('stats/', views.employer_discovery_statistics, name='admin_employers_stats_alias'),
    path('<int:company_id>/', views.get_or_update_employer_detail, name='admin_employer_detail'),
    path('<int:company_id>/placements/', views.manage_employer_placements, name='admin_employer_placements'),
    path('create/', views.create_employer, name='admin_employer_create'),
]
