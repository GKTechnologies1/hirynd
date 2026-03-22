from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/candidates/', include('candidates.urls')),
    path('api/recruiters/', include('recruiters.urls')),
    path('api/billing/', include('billing.urls')),
    path('api/audit/', include('audit.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/files/', include('files.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/admin/', include('audit.admin_urls')),
]
