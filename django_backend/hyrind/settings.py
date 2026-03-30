import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'change-me-in-production')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'storages',
    # Local apps
    'users',
    'candidates',
    'recruiters',
    'billing',
    'audit',
    'notifications',
    'files',
    'chat',
    'jobs',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'hyrind.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'hyrind.wsgi.application'

# Database — SQLite for local dev, MySQL for production
USE_SQLITE = os.getenv('USE_SQLITE', 'True') == 'True'

if USE_SQLITE:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.getenv('MYSQL_DB', 'hyrind_db'),
            'USER': os.getenv('MYSQL_USER', 'root'),
            'PASSWORD': os.getenv('MYSQL_PASSWORD', ''),
            'HOST': os.getenv('MYSQL_HOST', '127.0.0.1'),
            'PORT': os.getenv('MYSQL_PORT', '3306'),
            'OPTIONS': {
                'charset': 'utf8mb4',
            },
        }
    }

AUTH_USER_MODEL = 'users.User'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': None,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:8080,http://localhost:5173,https://hyrnd.netlify.app'
).split(',')
CORS_ALLOW_CREDENTIALS = True

# File Storage — local for dev, MinIO/S3 for production
USE_LOCAL_STORAGE = os.getenv('USE_LOCAL_STORAGE', 'True') == 'True'

if USE_LOCAL_STORAGE:
    MEDIA_URL = '/media/'
    MEDIA_ROOT = BASE_DIR / 'media'
else:
    AWS_ACCESS_KEY_ID = os.getenv('MINIO_ACCESS_KEY', '')
    AWS_SECRET_ACCESS_KEY = os.getenv('MINIO_SECRET_KEY', '')
    AWS_STORAGE_BUCKET_NAME = os.getenv('MINIO_BUCKET', 'hyrind-files')
    AWS_S3_ENDPOINT_URL = os.getenv('MINIO_ENDPOINT', 'http://localhost:9000')
    AWS_S3_REGION_NAME = 'us-east-1'
    AWS_DEFAULT_ACL = 'private'
    AWS_S3_FILE_OVERWRITE = False

# Email — Resend SDK (used directly in notifications/utils.py).
# Set RESEND_API_KEY in .env.  If missing/placeholder, emails log to console only.
RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')
RESEND_FROM_EMAIL = os.getenv('RESEND_FROM_EMAIL', 'Hyrind <noreply@hyrind.com>')
ADMIN_NOTIFICATION_EMAIL = os.getenv('ADMIN_EMAIL', 'hyrind.operations@gmail.com')
SITE_URL = os.getenv('SITE_URL', 'https://hyrnd.netlify.app')

# Django email backend kept for admin password-reset views only
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Razorpay Payment Gateway
# Use test keys from https://dashboard.razorpay.com — key_id starts with rzp_test_
# For production, replace with rzp_live_ keys
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', 'rzp_test_mock_xxxxxxxxxxx')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', 'xxxxxxxxxxxxxxxxxxxxxxxx')


# Static files
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'root': {'handlers': ['console'], 'level': 'INFO'},
}
