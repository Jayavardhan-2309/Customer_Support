import os

from .settings import *  # noqa: F403,F401


_test_db_name = os.getenv("TEST_DB_NAME", "test_postgres1")
_database_url = os.getenv("DATABASE_URL")
_db_host = os.getenv("DB_HOST")

if _database_url:
    import dj_database_url

    _default_db = dj_database_url.config(
        default=_database_url,
        conn_max_age=0,
    )
    _default_db["TEST"] = {
        "NAME": _test_db_name,
    }
    DATABASES = {
        "default": _default_db,
    }
elif _db_host:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME"),
            "USER": os.getenv("DB_USER"),
            "PASSWORD": os.getenv("DB_PASSWORD"),
            "HOST": _db_host,
            "PORT": os.getenv("DB_PORT", "5432"),
            "OPTIONS": {"sslmode": "require"},
            "TEST": {
                "NAME": _test_db_name,
            },
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "test_db.sqlite3",  # noqa: F405
        }
    }

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}
