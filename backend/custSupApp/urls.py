from rest_framework.routers import DefaultRouter
from .views import UserView, ChatMessageView

router= DefaultRouter()
router.register(r"users", UserView, basename='users')
router.register(r"chat", ChatMessageView, basename="chats")

urlpatterns=router.urls