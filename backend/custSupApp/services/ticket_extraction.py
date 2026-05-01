import sys

from tickets.services import ticket_extraction as _module

sys.modules[__name__] = _module
