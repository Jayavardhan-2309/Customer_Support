import sys

from knowledge_base import embeddings as _module

sys.modules[__name__] = _module
