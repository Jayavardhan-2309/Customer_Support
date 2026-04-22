import os

os.environ["USE_SQLITE_FOR_TESTS"] = "1"
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "custSupport.test_settings")

import django
from django.core.management import call_command

django.setup()
call_command("migrate", run_syncdb=True, verbosity=0)
