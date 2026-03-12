import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "custSupport.settings")

app = Celery("custSupport")

app.config_from_object("django.conf:settings", namespace="CELERY")

app.autodiscover_tasks()