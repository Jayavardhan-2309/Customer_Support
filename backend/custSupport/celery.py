import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "custSupport.settings")

app = Celery("custSupport")

# Read config from Django settings, namespace CELERY_
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()