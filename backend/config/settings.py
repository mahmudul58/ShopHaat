from datetime import timedelta
from pathlib import Path

import os
import dj_database_url
from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY", default="dev-secret-key-change-me")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="*", cast=Csv())
if "RENDER_EXTERNAL_HOSTNAME" in os.environ:
    ALLOWED_HOSTS.append(os.environ["RENDER_EXTERNAL_HOSTNAME"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "cloudinary_storage",
    "django.contrib.staticfiles",
    "cloudinary",
    # third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    # local apps
    "apps.core",
    "apps.accounts",
    "apps.catalog",
    "apps.marketplace",
    "apps.cart",
    "apps.coupons",
    "apps.orders",
    "apps.reviews",
    "apps.wishlist",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Optional — only logs when REQUEST_TIMING_ENABLED=True on Render.
    "apps.core.middleware.RequestTimingMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": dj_database_url.config(
        default=config("DATABASE_URL", default="postgres://postgres:@127.0.0.1:5432/ShopHaat"),
        conn_max_age=config("DB_CONN_MAX_AGE", default=60, cast=int),
        conn_health_checks=True,
    )
}

# Supabase's Transaction pooler (PgBouncer in transaction mode) does not
# support named server-side cursors. With `DISABLE_SERVER_SIDE_CURSORS=True`
# Django falls back to client-side cursors which work fine through the
# pooler. This setting is a no-op on the Session pooler and on direct
# connections, so it's safe to enable unconditionally in production.
# Reference: https://docs.djangoproject.com/en/5.0/ref/settings/#disable-server-side-cursors
if config("DJANGO_DISABLE_SERVER_SIDE_CURSORS", default=False, cast=bool):
    DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True

# Render terminates TLS at the load balancer and proxies plain HTTP to
# gunicorn, so request.is_secure() returns False even on HTTPS URLs. Tell
# Django to trust the X-Forwarded-Proto header so generated absolute URLs
# (e.g. for product images) come back as https://.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Production-only hardening. Keeping these conditional on DEBUG=False
# means local dev over http://localhost still works without TLS gymnastics.
# On Render every request hits Django via TLS-terminated proxy, so these
# are always active there.
if not DEBUG:
    # Render is HTTPS-only, so all session/cookie flags can safely be
    # secure. Without these, `manage.py check --deploy` warns and a MITM
    # on the local network could steal the CSRF token.
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # Don't redirect http→https at the Django layer — Render's load balancer
    # already does this. Forcing it here would loop the redirect.
    SECURE_SSL_REDIRECT = False
    SECURE_REDIRECT_EXEMPT = [r"^health/", r"^api/health/"]
    # HSTS: 1 year, include subdomains, eligible for preload. Render's
    # load balancer terminates TLS, so this HSTS header travels with
    # every response.
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    # Defensive headers — Render doesn't set these for us.
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"
    X_FRAME_OPTIONS = "DENY"

AUTH_USER_MODEL = "accounts.User"

# Django's default password hashing (PBKDF2) is used as-is — no custom hasher.
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
    "default": {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}


CLOUDINARY_STORAGE = {
    "CLOUD_NAME": config("CLOUDINARY_CLOUD_NAME", default=""),
    "API_KEY": config("CLOUDINARY_API_KEY", default=""),
    "API_SECRET": config("CLOUDINARY_API_SECRET", default=""),
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- CORS ---
CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", default="http://localhost:5173", cast=Csv())
CORS_ALLOW_CREDENTIALS = True  # required so the refresh-token httpOnly cookie is sent cross-origin

# Django's CSRF middleware rejects POSTs from origins not in this list.
# We add it explicitly so cross-origin deployments (e.g. when the
# frontend bypasses the Vite proxy and hits the backend directly over
# the LAN IP) still pass CSRF checks on /auth/login/, /auth/refresh/,
# and other state-changing endpoints.
CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    default="http://localhost:5173,http://localhost:5174,http://192.168.0.104:5173",
    cast=Csv(),
)

# --- DRF ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": ("rest_framework.throttling.ScopedRateThrottle",),
    "DEFAULT_THROTTLE_RATES": {
        "auth": "10/min",
        "password_reset": "5/hour",
        "order_placement": "20/min",
        "seller_application": "100/min",
    },
}

# --- SimpleJWT ---
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=config("ACCESS_TOKEN_LIFETIME_MINUTES", default=15, cast=int)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=config("REFRESH_TOKEN_LIFETIME_DAYS", default=7, cast=int)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
}

REFRESH_COOKIE_NAME = "refresh_token"
# Cookie path is "/" so the refresh cookie is sent on every request the
# frontend makes (including the silent /auth/refresh/ call after a hard
# page refresh), regardless of where the cookie was originally issued.
# We previously had this scoped to /api/v1/ which clashed with the
# earlier /api/v1/auth/ path and left stale cookies in the browser.
REFRESH_COOKIE_PATH = "/"
REFRESH_COOKIE_SECURE = not DEBUG  # allow http cookie only in local dev
REFRESH_COOKIE_SAMESITE = config("REFRESH_COOKIE_SAMESITE", default="Lax" if DEBUG else "None")

# --- Email (console backend by default; swap for SMTP in production) ---
EMAIL_BACKEND = config("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:5173")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django.request": {"handlers": ["console"], "level": "ERROR", "propagate": False},
        "apps": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "apps.request_timing": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
