import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "custSupport.settings")
os.environ.setdefault("USE_SQLITE_FOR_TESTS", "1")

import django

django.setup()
