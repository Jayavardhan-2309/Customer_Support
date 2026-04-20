from django.test import SimpleTestCase

from api.pagination import StaffCursorPagination, TicketCursorPagination


class PaginationConfigTests(SimpleTestCase):
    def test_ticket_pagination_defaults(self):
        self.assertEqual(TicketCursorPagination.page_size, 10)
        self.assertEqual(TicketCursorPagination.ordering, "-created_at")

    def test_staff_pagination_defaults(self):
        self.assertEqual(StaffCursorPagination.page_size, 10)
        self.assertEqual(StaffCursorPagination.ordering, "username")
