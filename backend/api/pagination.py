from rest_framework.pagination import CursorPagination


class TicketCursorPagination(CursorPagination):
    page_size = 10
    ordering = "-created_at"

class StaffCursorPagination(CursorPagination):
    page_size = 10
    ordering = "username"