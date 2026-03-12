from django.urls import path
from .views import SampleView, SignupView, LoginView, SupportAIView, LogoutView, MeView, ChatHistoryView, StaffTicketViewSet, StaffAnalyticsView
from rest_framework.routers import DefaultRouter
from . import views

router= DefaultRouter()
router.register(r'samples', SampleView, basename='sample')
router.register(r'signup', SignupView, basename='signup')
router.register(r"staff/tickets", StaffTicketViewSet, basename="staff-tickets")
router.register(r"admin/pdfs", views.PDFViewSet, basename="pdf")
router.register(r"admin/staff", views.StaffViewSet, basename="staff")
urlpatterns=[path('login/', LoginView.as_view()), path("support-ai/", SupportAIView.as_view()), path('logout/', LogoutView.as_view()),
             path("me/", MeView.as_view()), path('chat/history/', ChatHistoryView.as_view()),
             path("staff/analytics/", StaffAnalyticsView.as_view())
             ]
urlpatterns+=router.urls