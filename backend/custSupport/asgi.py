"""
ASGI config for custSupport project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import custSupApp.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'custSupport.settings')

# application = get_asgi_application()

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,  # normal Django
    "websocket": AuthMiddlewareStack(
        URLRouter(
            custSupApp.routing.websocket_urlpatterns
        )
    ),
})