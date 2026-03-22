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
    path('pending-approvals/', views.pending_approvals, name='pending_approvals'),
    path('approve-user/', views.approve_user, name='approve_user'),
    path('users/', views.all_users, name='all_users'),
    path('users/<uuid:user_id>/', views.manage_user, name='manage_user'),
    path('change-password/', views.change_password, name='change_password'),
]
