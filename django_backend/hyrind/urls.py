from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from .views import landing_page, serve_media, custom_404, custom_500

handler404 = 'hyrind.views.custom_404'
handler500 = 'hyrind.views.custom_500'

# ── Customize Django Admin header ──
admin.site.site_header  = "Hyrind Admin"
admin.site.site_title   = "Hyrind Control Panel"
admin.site.index_title  = "Welcome to Hyrind Back Office"

urlpatterns = [
    # ── Media serving with proper error handling ──
    # This replaces the default static() serve and ensures missing files return JSON/clean HTML
    path('media/<path:path>', serve_media, name='serve_media'),
    
    # ── Legacy compatibility for resumes (now handled by generic serve_media) ──
    path('leads/resumes/<path:path>', serve_media, name='serve_resume_leads'),
    path('resumes/<path:path>', serve_media, name='serve_resume_cands'),

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
    
    # ── API Catch-all for proper 404 JSON ──
    path('api/<path:undefined>', custom_404),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
