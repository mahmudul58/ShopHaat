from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    verbose_name = "Core"

    def ready(self):
        # Register production settings check.
        from . import checks  # noqa: F401

        # Hook into Django's check framework.
        from django.core.checks import register

        register(checks.production_settings_check)
