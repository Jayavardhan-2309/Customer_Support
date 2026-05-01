from .views_folder.admin import AdminAnalyticsView, AdminStaffDetailView, PDFViewSet, StaffViewSet
from .views_folder.auth import (
    AdminSignupView,
    ChatHistoryView,
    LoginView,
    LogoutView,
    MeView,
    SignupView,
)
from .views_folder.feedback import OrganizationListView, SubmitFeedbackView, UserResolvedTicketsView
from .views_folder.permissions import IsAdmin, IsStaff, get_escalation_count_today
from .views_folder.staff import StaffAnalyticsView, StaffTicketViewSet
from .views_folder.support import SupportAIView
