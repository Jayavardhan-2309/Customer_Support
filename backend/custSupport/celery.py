import os
import sys
from pathlib import Path
from celery import Celery

# Ensure the backend root is on the Python path so Django apps such as `accounts` can be imported.
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "custSupport.settings")

app = Celery("custSupport")

# Read config from Django settings, namespace CELERY_
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()