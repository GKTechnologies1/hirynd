from django.urls import path
from . import views

urlpatterns = [
    path('', views.candidate_list, name='candidate_list'),
    path('<uuid:candidate_id>/', views.candidate_detail, name='candidate_detail'),
    path('<uuid:candidate_id>/status/', views.update_candidate_status, name='update_candidate_status'),
    path('<uuid:candidate_id>/intake/', views.intake, name='intake'),
    path('<uuid:candidate_id>/roles/', views.role_list, name='role_list'),
    path('<uuid:candidate_id>/roles/add/', views.add_role, name='add_role'),
    path('<uuid:candidate_id>/roles/confirm/', views.confirm_roles, name='confirm_roles'),
    path('<uuid:candidate_id>/credentials/', views.credential_list, name='credential_list'),
    path('<uuid:candidate_id>/credentials/upsert/', views.upsert_credential, name='upsert_credential'),
    path('<uuid:candidate_id>/referrals/', views.referrals, name='referrals'),
    path('<uuid:candidate_id>/interviews/', views.interviews, name='interviews'),
    path('<uuid:candidate_id>/placement/', views.placement, name='placement'),
]
