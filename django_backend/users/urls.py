from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.me, name='me'),
    path('profile/', views.update_profile, name='update_profile'),
    path('change-password/', views.change_password, name='change_password'),
    path('forgot-password/', views.forgot_password, name='forgot_password'),
    path('reset-password/', views.reset_password, name='reset_password'),
    path('pending-approvals/', views.pending_approvals, name='pending_approvals'),
    path('approve-user/', views.approve_user, name='approve_user'),
    path('users/', views.all_users, name='all_users'),
    path('users/<uuid:user_id>/', views.admin_update_user, name='admin_update_user'),
    path('users/<uuid:user_id>/delete/', views.admin_delete_user, name='admin_delete_user'),
    path('dashboard-stats/', views.admin_dashboard_stats, name='admin_dashboard_stats'),
]
