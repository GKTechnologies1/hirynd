import sys
import django
from datetime import date
from django.shortcuts import render
from django.conf import settings


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
