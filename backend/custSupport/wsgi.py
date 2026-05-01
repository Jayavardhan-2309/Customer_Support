"""
WSGI config for custSupport project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
import sys
from pathlib import Path

# Ensure the backend root is on Python path so sibling Django apps like `accounts` can be imported.
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# Fallback if Render used a repo root and placed backend inside a subdirectory.
BACKEND_ALT = BASE_DIR / "backend"
if BACKEND_ALT.exists() and BACKEND_ALT not in sys.path:
    sys.path.insert(0, str(BACKEND_ALT))

print('DEBUG WSGI BASE_DIR=', BASE_DIR)
print('DEBUG WSGI BACKEND_ALT=', BACKEND_ALT, 'exists=', BACKEND_ALT.exists())
print('DEBUG WSGI sys.path[:5]=', sys.path[:5])
print('DEBUG WSGI accounts exists in BASE_DIR=', (BASE_DIR / 'accounts').exists())
print('DEBUG WSGI accounts exists in BACKEND_ALT=', (BACKEND_ALT / 'accounts').exists())

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'custSupport.settings')

application = get_wsgi_application()
