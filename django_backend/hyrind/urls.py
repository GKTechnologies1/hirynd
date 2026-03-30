from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

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
    path('api/jobs/', include('jobs.urls')),
    path('api/admin/', include('audit.admin_urls')),
] + (static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) if settings.DEBUG and getattr(settings, 'USE_LOCAL_STORAGE', True) else [])
