from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from .views import landing_page

# ── Customize Django Admin header ──
admin.site.site_header  = "Hyrind Admin"
admin.site.site_title   = "Hyrind Control Panel"
admin.site.index_title  = "Welcome to Hyrind Back Office"

urlpatterns = [
    # ── Landing page ──
    path('', landing_page, name='landing'),

    # ── Django Admin ──
    path('admin/', admin.site.urls),

    # ── OpenAPI Schema + Docs ──
    path('api/schema/',  SpectacularAPIView.as_view(),  name='schema'),
    path('api/docs/',    SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/',   SpectacularRedocView.as_view(url_name='schema'),   name='redoc'),

    # ── App API Routes ──
    path('api/auth/',          include('users.urls')),
    path('api/candidates/',    include('candidates.urls')),
    path('api/recruiters/',    include('recruiters.urls')),
    path('api/billing/',       include('billing.urls')),
    path('api/audit/',         include('audit.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/files/',         include('files.urls')),
    path('api/chat/',          include('chat.urls')),
    path('api/jobs/',          include('jobs.urls')),
    path('api/admin/',         include('audit.admin_urls')),
] + (static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
     if settings.DEBUG and getattr(settings, 'USE_LOCAL_STORAGE', True) else [])
