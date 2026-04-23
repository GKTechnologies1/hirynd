import os
import sys
import django
from datetime import date
from django.shortcuts import render
from django.conf import settings
from django.http import FileResponse, JsonResponse, HttpResponseRedirect


def landing_page(request):
    """Premium developer landing page for the Hyrind backend API."""
    context = {
        'django_version': django.get_version(),
        'python_version': f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        'year': date.today().year,
        'debug_mode': '🔧 DEBUG MODE' if settings.DEBUG else '🚀 PRODUCTION',
        'environment': 'Development' if settings.DEBUG else 'Production',
    }
    return render(request, 'landing.html', context)


def serve_media(request, path):
    """
    Industry standard media server for development/staging.
    Ensures that missing files return a proper JSON error
    rather than a debug routes page.
    """
    # Security check: prevent directory traversal
    if '..' in path or path.startswith('/'):
        return JsonResponse({'error': 'Invalid path'}, status=400)

    file_path = os.path.join(settings.MEDIA_ROOT, path)
    
    if not os.path.exists(file_path):
        return JsonResponse({
            'error': 'File not found',
            'detail': f'The requested file "{path}" could not be located on our servers.',
            'status': 404
        }, status=404)
    
    try:
        return FileResponse(open(file_path, 'rb'))
    except Exception as e:
        return JsonResponse({'error': 'Error serving file', 'detail': str(e)}, status=500)


def custom_404(request, exception=None):
    """
    Industry standard 404 handler.
    Returns JSON for all paths.
    """
    return JsonResponse({
        'error': 'Resource not found',
        'detail': 'The requested endpoint or resource does not exist.',
        'status': 404
    }, status=404)


def custom_500(request):
    """
    Industry standard 500 handler.
    Returns JSON for all paths.
    """
    return JsonResponse({
        'error': 'Internal server error',
        'detail': 'An unexpected error occurred on the server.',
        'status': 500
    }, status=500)
