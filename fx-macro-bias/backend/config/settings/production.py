"""
Production settings — Hardened PostgreSQL, DEBUG off, SSL/HSTS, and Strict Security Controls
"""
from pathlib import Path
from .base import *  # noqa
from decouple import config
import dj_database_url

DEBUG = False

# Host Security
ALLOWED_HOSTS = [
    h.strip()
    for h in config(
        "ALLOWED_HOSTS",
        default="127.0.0.1,localhost,shiftfx.io,terminal.shiftfx.io,admin.shiftfx.io,.onrender.com",
    ).split(",")
    if h.strip()
]

# Auto-detect Render environment
render_host = config("RENDER_EXTERNAL_HOSTNAME", default=None)
if render_host and render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_host)

# Production Database (PostgreSQL with SSL & Connection Reuse, or fallback)
database_url = config("DATABASE_URL", default=None)
if database_url:
    DATABASES = {
        "default": dj_database_url.config(
            default=database_url,
            conn_max_age=60,
            ssl_require=True,
        )
    }
else:
    db_name = config("DB_NAME", default="")
    if db_name:
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": db_name,
                "USER": config("DB_USER", default="shiftfx_admin"),
                "PASSWORD": config("DB_PASSWORD", default=""),
                "HOST": config("DB_HOST", default="localhost"),
                "PORT": config("DB_PORT", default="5432"),
                "CONN_MAX_AGE": 60,
                "OPTIONS": {
                    "sslmode": config("DB_SSLMODE", default="prefer"),
                },
            }
        }
    else:
        # Fallback to local SQLite if no external DB configured
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": BASE_DIR / "db.sqlite3",
            }
        }

# ──────────────────────────────────────────────
# HTTPS & Transport Security (HSTS)
# ──────────────────────────────────────────────
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# HTTP Strict Transport Security (HSTS - 1 Year with subdomains & preload)
SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=31536000, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# ──────────────────────────────────────────────
# Cookie Hardening & CSRF Defenses
# ──────────────────────────────────────────────
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

# Frame & MIME Sniffing Lockdown
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# ──────────────────────────────────────────────
# Strict CORS & CSRF Trusted Origins
# ──────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in config(
        "CORS_ALLOWED_ORIGINS",
        default="https://shiftfx.io,https://terminal.shiftfx.io,https://admin.shiftfx.io",
    ).split(",")
    if o.strip()
]

CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in config(
        "CSRF_TRUSTED_ORIGINS",
        default="https://shiftfx.io,https://terminal.shiftfx.io,https://admin.shiftfx.io,https://*.onrender.com",
    ).split(",")
    if o.strip()
]

if render_host:
    render_origin = f"https://{render_host}"
    if render_origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(render_origin)
    if render_origin not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(render_origin)

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https:\/\/.*\.onrender\.com$",
    r"^https:\/\/.*\.shiftfx\.io$",
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# ──────────────────────────────────────────────
# Strict RBAC Permissions in Production
# ──────────────────────────────────────────────
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa
    "DEFAULT_PERMISSION_CLASSES": ["apps.common.permissions.IsAdminStaff"],
}
