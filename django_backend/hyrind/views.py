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
    Supports serving from both local storage and MinIO.
    """
    # Security check: prevent directory traversal
    normalized_path = os.path.normpath(path)
    if normalized_path.startswith('..') or normalized_path.startswith('/') or '..' in normalized_path:
        return JsonResponse({'error': 'Invalid path'}, status=400)

    # 1. If not using local storage, try serving from S3/MinIO first
    if not getattr(settings, 'USE_LOCAL_STORAGE', True):
        try:
            from files.views import _get_s3_client
            s3 = _get_s3_client()
            obj = s3.get_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=normalized_path)
            
            # FileResponse can wrap the StreamingBody from boto3
            response = FileResponse(obj['Body'])
            if 'ContentType' in obj:
                response['Content-Type'] = obj['ContentType']
            if 'ContentLength' in obj:
                response['Content-Length'] = obj['ContentLength']
            return response
        except Exception as e:
            # Fall back to local check in case it's a legacy local file or temporary transition
            pass

    # 2. Local storage serving
    file_path = os.path.join(settings.MEDIA_ROOT, normalized_path)
    
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


def custom_404(request, exception=None, **kwargs):
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
