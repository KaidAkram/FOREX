from django.apps import AppConfig


class MacroConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.macro"

    def ready(self):
        import apps.macro.signals  # noqa — connect signals
