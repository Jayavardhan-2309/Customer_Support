# """
# Django settings for custSupport project.
# """

# from pathlib import Path
# from datetime import timedelta
# import os
# from dotenv import load_dotenv
# from pathlib import Path

# BASE_DIR = Path(__file__).resolve().parent.parent
# load_dotenv(BASE_DIR / ".env")

# BASE_DIR = Path(__file__).resolve().parent.parent


# SECRET_KEY = os.getenv("SECRET_KEY")

# DEBUG = os.getenv("DEBUG")=="True"

# ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",")

# INSTALLED_APPS = [
#     'django.contrib.admin',
#     'django.contrib.auth',
#     'django.contrib.contenttypes',
#     'django.contrib.sessions',
#     'django.contrib.messages',
#     'django.contrib.staticfiles',
#     'rest_framework',
#     'corsheaders',
#     'custSupApp',
#     'api',
# ]

# MIDDLEWARE = [
#     'corsheaders.middleware.CorsMiddleware',
#     "whitenoise.middleware.WhiteNoiseMiddleware",
#     'django.middleware.security.SecurityMiddleware',
#     'django.contrib.sessions.middleware.SessionMiddleware',
#     'django.middleware.common.CommonMiddleware',
#     'django.middleware.csrf.CsrfViewMiddleware',
#     'django.contrib.auth.middleware.AuthenticationMiddleware',
#     'django.contrib.messages.middleware.MessageMiddleware',
#     'django.middleware.clickjacking.XFrameOptionsMiddleware',
# ]

# ROOT_URLCONF = 'custSupport.urls'

# TEMPLATES = [
#     {
#         'BACKEND': 'django.template.backends.django.DjangoTemplates',
#         'DIRS': [],
#         'APP_DIRS': True,
#         'OPTIONS': {
#             'context_processors': [
#                 'django.template.context_processors.request',
#                 'django.contrib.auth.context_processors.auth',
#                 'django.contrib.messages.context_processors.messages',
#             ],
#         },
#     },
# ]

# WSGI_APPLICATION = 'custSupport.wsgi.application'

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         "NAME": os.getenv("DB_NAME"),
#         "USER": os.getenv("DB_USER"),
#         "PASSWORD": os.getenv("DB_PASSWORD"),
#         "HOST": os.getenv("DB_HOST"),
#         "PORT": os.getenv("DB_PORT"),
#         "OPTIONS": {
#             "sslmode": "require"
#         },
#     }
# }

# AUTH_PASSWORD_VALIDATORS = [
#     {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
#     {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
#     {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
#     {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
# ]

# AUTH_USER_MODEL = 'custSupApp.User'

# LANGUAGE_CODE = 'en-us'
# TIME_ZONE = 'UTC'
# USE_I18N = True
# USE_TZ = True

# STATIC_URL = 'static/'

# STATIC_ROOT = BASE_DIR / "staticfiles"
# # Media files — where uploaded PDFs are stored on disk
# MEDIA_URL = '/media/'
# MEDIA_ROOT = BASE_DIR / 'media'   # creates a /media folder at project root

# REST_FRAMEWORK = {
#     "DEFAULT_AUTHENTICATION_CLASSES": (
#         "custSupApp.authentication.CookieJWTAuthentication",
#     ),
#     "DEFAULT_PERMISSION_CLASSES": (
#         "rest_framework.permissions.IsAuthenticated",
#     ),
# }

# SIMPLE_JWT = {
#     'ACCESS_TOKEN_LIFETIME': timedelta(minutes=500),
#     'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
#     'ROTATE_REFRESH_TOKEN': False,
#     'AUTH_HEADER_TYPES': ('Bearer',),
#     'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
# }

# CORS_ALLOWED_ORIGINS = [
#     "http://localhost:3000",
# ]

# CORS_ALLOW_CREDENTIALS = True

# CSRF_TRUSTED_ORIGINS = [
#     "http://localhost:3000",
# ]

# DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField' # literal string


# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
# EMAIL_HOST = 'smtp.gmail.com'
# EMAIL_PORT = 587
# EMAIL_USE_TLS = True
# EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
# EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
# DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# LOGGING = {
#     "version": 1,
#     "disable_existing_loggers": False,   # ← IMPORTANT
#     "handlers": {
#         "console": {
#             "class": "logging.StreamHandler",
#         },
#     },
#     "root": {
#         "handlers": ["console"],
#         "level": "INFO",
#     },
# }

# CELERY_BROKER_URL = "redis://localhost:6379/0"
# CELERY_ACCEPT_CONTENT = ["json"]
# CELERY_TASK_SERIALIZER = "json"


# """
# Django settings for custSupport project.
# """

# from pathlib import Path
# from datetime import timedelta
# import os
# from dotenv import load_dotenv
# from pathlib import Path

# BASE_DIR = Path(__file__).resolve().parent.parent
# load_dotenv(BASE_DIR / ".env")

# BASE_DIR = Path(__file__).resolve().parent.parent


# SECRET_KEY = os.getenv("SECRET_KEY")

# DEBUG = os.getenv("DEBUG")=="True"

# ALLOWED_HOSTS = []

# INSTALLED_APPS = [
#     'django.contrib.admin',
#     'django.contrib.auth',
#     'django.contrib.contenttypes',
#     'django.contrib.sessions',
#     'django.contrib.messages',
#     'django.contrib.staticfiles',
#     'rest_framework',
#     'corsheaders',
#     'custSupApp',
#     'api',
# ]

# MIDDLEWARE = [
#     'corsheaders.middleware.CorsMiddleware',
#     'django.middleware.security.SecurityMiddleware',
#     'django.contrib.sessions.middleware.SessionMiddleware',
#     'django.middleware.common.CommonMiddleware',
#     'django.middleware.csrf.CsrfViewMiddleware',
#     'django.contrib.auth.middleware.AuthenticationMiddleware',
#     'django.contrib.messages.middleware.MessageMiddleware',
#     'django.middleware.clickjacking.XFrameOptionsMiddleware',
# ]

# ROOT_URLCONF = 'custSupport.urls'

# TEMPLATES = [
#     {
#         'BACKEND': 'django.template.backends.django.DjangoTemplates',
#         'DIRS': [],
#         'APP_DIRS': True,
#         'OPTIONS': {
#             'context_processors': [
#                 'django.template.context_processors.request',
#                 'django.contrib.auth.context_processors.auth',
#                 'django.contrib.messages.context_processors.messages',
#             ],
#         },
#     },
# ]

# WSGI_APPLICATION = 'custSupport.wsgi.application'

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': 'customerSupdb',
#         'USER': 'cust_user',
#         'PASSWORD': os.getenv("DB_PASSWORD_LOCAL"),
#         'HOST': 'localhost',
#         'PORT': '5432',
#     }
# }

# AUTH_PASSWORD_VALIDATORS = [
#     {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
#     {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
#     {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
#     {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
# ]

# AUTH_USER_MODEL = 'custSupApp.User'

# LANGUAGE_CODE = 'en-us'
# TIME_ZONE = 'UTC'
# USE_I18N = True
# USE_TZ = True

# STATIC_URL = 'static/'

# # Media files — where uploaded PDFs are stored on disk
# MEDIA_URL = '/media/'
# MEDIA_ROOT = BASE_DIR / 'media'   # creates a /media folder at project root

# REST_FRAMEWORK = {
#     "DEFAULT_AUTHENTICATION_CLASSES": (
#         "custSupApp.authentication.CookieJWTAuthentication",
#     ),
#     "DEFAULT_PERMISSION_CLASSES": (
#         "rest_framework.permissions.IsAuthenticated",
#     ),
# }

# SIMPLE_JWT = {
#     'ACCESS_TOKEN_LIFETIME': timedelta(minutes=500),
#     'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
#     'ROTATE_REFRESH_TOKEN': False,
#     'AUTH_HEADER_TYPES': ('Bearer',),
#     'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
# }

# CORS_ALLOWED_ORIGINS = [
#     "http://localhost:3000",
# ]

# CORS_ALLOW_CREDENTIALS = True

# CSRF_TRUSTED_ORIGINS = [
#     "http://localhost:3000",
# ]

# DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField' # literal string


# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
# EMAIL_HOST = 'smtp.gmail.com'
# EMAIL_PORT = 587
# EMAIL_USE_TLS = True
# EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
# EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
# DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# LOGGING = {
#     "version": 1,
#     "disable_existing_loggers": False,   # ← IMPORTANT
#     "handlers": {
#         "console": {
#             "class": "logging.StreamHandler",
#         },
#     },
#     "root": {
#         "handlers": ["console"],
#         "level": "INFO",
#     },
# }

# CELERY_BROKER_URL = "redis://localhost:6379/0"
# CELERY_ACCEPT_CONTENT = ["json"]
# CELERY_TASK_SERIALIZER = "json"


"""
Django settings for custSupport project.
"""

from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env only for local (Render ignores it anyway)
load_dotenv(BASE_DIR / ".env")

# -----------------------
# CORE SETTINGS
# -----------------------

SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key")

DEBUG = os.getenv("DEBUG", "False") == "True"

# Fix: avoid [''] issue
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "*").split(",")

# -----------------------
# APPS
# -----------------------

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'custSupApp',
    'api',
]

# -----------------------
# MIDDLEWARE
# -----------------------

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    "whitenoise.middleware.WhiteNoiseMiddleware",
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'custSupport.urls'

# -----------------------
# TEMPLATES
# -----------------------

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'custSupport.wsgi.application'

# -----------------------
# DATABASE (SAFE VERSION)
# -----------------------

if os.getenv("DATABASE_URL"):
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(default=os.getenv("DATABASE_URL"))
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            "NAME": os.getenv("DB_NAME"),
            "USER": os.getenv("DB_USER"),
            "PASSWORD": os.getenv("DB_PASSWORD"),
            "HOST": os.getenv("DB_HOST"),
            "PORT": os.getenv("DB_PORT", "5432"),
            "OPTIONS": {
                "sslmode": "require"
            },
        }
    }

# -----------------------
# AUTH
# -----------------------

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

AUTH_USER_MODEL = 'custSupApp.User'

# -----------------------
# INTERNATIONALIZATION
# -----------------------

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# -----------------------
# STATIC / MEDIA
# -----------------------

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# -----------------------
# DRF + JWT
# -----------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "custSupApp.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=500),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKEN': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# -----------------------
# CORS / CSRF
# -----------------------

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
]

# -----------------------
# EMAIL
# -----------------------

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# -----------------------
# LOGGING
# -----------------------

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}

# -----------------------
# REMOVE CELERY (for now)
# -----------------------
# Commented because localhost Redis will break on Render

# CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
# CELERY_ACCEPT_CONTENT = ["json"]
# CELERY_TASK_SERIALIZER = "json"

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
