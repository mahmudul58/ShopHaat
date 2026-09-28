"""
Django startup checks for production-grade configuration.

These run on every `manage.py check` invocation, so they'll fire during
deploys. They also run from the test suite so we can lock in behaviour.

Currently enforced:
  - SECRET_KEY must not be the public placeholder when DEBUG=False.

Add more here as the production hardening list grows (ALLOWED_HOSTS,
CORS allowlist, database SSL, etc.).
"""
from django.conf import settings
from django.core.checks import Error


PLACEHOLDER_SECRET_KEYS = {
    "dev-secret-key-change-me",
    "test-secret-key-do-not-use-in-production",
}


def production_settings_check(app_configs, **kwargs):
    """system-check-style callable registered in AppConfig.ready()."""
    errors = []

    if getattr(settings, "DEBUG", False):
        return errors

    secret_key = getattr(settings, "SECRET_KEY", "") or ""
    if not secret_key:
        errors.append(
            Error(
                "SECRET_KEY is empty in production.",
                hint="Set the SECRET_KEY environment variable.",
                id="shophaat.E001",
            )
        )
    elif secret_key in PLACEHOLDER_SECRET_KEYS:
        errors.append(
            Error(
                "SECRET_KEY is set to a public placeholder value in production.",
                hint="Generate a unique SECRET_KEY and inject it via env vars.",
                id="shophaat.E002",
            )
        )
    elif len(secret_key) < 32:
        errors.append(
            Error(
                "SECRET_KEY is shorter than 32 characters in production.",
                hint="Use at least 50 characters of random data.",
                id="shophaat.E003",
            )
        )

    return errors
