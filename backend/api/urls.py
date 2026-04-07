from django.urls import path
from .views import SampleView, SignupView, LoginView, SupportAIView, LogoutView, MeView, ChatHistoryView, StaffTicketViewSet, StaffAnalyticsView, AdminSignupView, OrganizationListView
from rest_framework.routers import DefaultRouter
from . import views
from .views import SubmitFeedbackView, UserResolvedTicketsView, AdminAnalyticsView, AdminStaffDetailView

router= DefaultRouter()
router.register(r'samples', SampleView, basename='sample')
router.register(r'signup', SignupView, basename='signup')
router.register(r"staff/tickets", StaffTicketViewSet, basename="staff-tickets")
router.register(r"admin/pdfs", views.PDFViewSet, basename="pdf")
router.register(r"admin/staff", views.StaffViewSet, basename="staff")
router.register(r'admin-signup', AdminSignupView, basename='admin-signup')
urlpatterns=[path('login/', LoginView.as_view()), path("support-ai/", SupportAIView.as_view()), path('logout/', LogoutView.as_view()),
             path("me/", MeView.as_view()), path('chat/history/', ChatHistoryView.as_view()),
             path("staff/analytics/", StaffAnalyticsView.as_view()),
             path("organizations/", OrganizationListView.as_view()),
             path("tickets/<int:ticket_id>/feedback/", SubmitFeedbackView.as_view()),
             path("user/resolved-tickets/", UserResolvedTicketsView.as_view()),
             path("admin/analytics/", AdminAnalyticsView.as_view()),
             path("admin/analytics/staff/<int:staff_id>/", AdminStaffDetailView.as_view()),
             ]
urlpatterns+=router.urls