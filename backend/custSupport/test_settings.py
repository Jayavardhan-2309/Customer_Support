from .settings import (
    BASE_DIR,
    SECRET_KEY,
    DEBUG,
    INSTALLED_APPS,
    MIDDLEWARE,
    ROOT_URLCONF,
    TEMPLATES,
    WSGI_APPLICATION,
    ASGI_APPLICATION,
    AUTH_PASSWORD_VALIDATORS,
    AUTH_USER_MODEL,
    REST_FRAMEWORK,
    CORS_ALLOWED_ORIGINS,
    CELERY_BROKER_URL,
    CELERY_RESULT_BACKEND,
    CELERY_ACCEPT_CONTENT,
    CELERY_TASK_SERIALIZER,
    CELERY_RESULT_SERIALIZER,
    CELERY_TIMEZONE,
    CELERY_TASK_SOFT_TIME_LIMIT,
    CELERY_TASK_TIME_LIMIT,
)

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test_db.sqlite3",
    }
}

ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}
