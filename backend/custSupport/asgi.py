"""
ASGI config for custSupport project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os
import sys
from pathlib import Path

# Ensure the backend root is on Python path so sibling Django apps like `accounts` can be imported.
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from django.core.asgi import get_asgi_application

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import custSupApp.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'custSupport.settings')


django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,  # normal Django
    "websocket": AuthMiddlewareStack(
        URLRouter(
            custSupApp.routing.websocket_urlpatterns
        )
    ),
})