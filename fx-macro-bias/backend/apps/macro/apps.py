from django.apps import AppConfig


class MacroConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.macro"

    def ready(self):
        import apps.macro.signals  # noqa — connect signals
        import os
        import sys

        # Only start scheduler in the main worker process (avoid duplicate threads in dev reloader)
        is_runserver = "runserver" in sys.argv
        is_main_worker = os.environ.get("RUN_MAIN") == "true"
        is_gunicorn = "gunicorn" in sys.argv[0] or "wsgi" in sys.argv[0]

        if (is_runserver and is_main_worker) or is_gunicorn:
            try:
                from apps.macro.services.scheduler import start_background_scheduler
                start_background_scheduler()
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Could not auto-start scraper scheduler: {e}")
