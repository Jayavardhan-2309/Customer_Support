import sys

from tickets.services import ticket_service as _module

sys.modules[__name__] = _module
