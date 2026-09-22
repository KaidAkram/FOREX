"""Development settings — SQLite, DEBUG on, CORS open"""
from .base import *  # noqa

DEBUG = True
ALLOWED_HOSTS = ["*"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

CORS_ALLOW_ALL_ORIGINS = True

# Mock admin user context injected by dev middleware
DEV_MOCK_ADMIN = True
