from django.apps import AppConfig
import os
import sys

class MacroConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.macro'

    def ready(self):
        import apps.macro.signals  # noqa: F401
        
        # Avoid running worker thread during build/management commands
        is_management = any(cmd in sys.argv for cmd in ['check', 'migrate', 'collectstatic', 'makemigrations', 'test', 'shell', 'createsuperuser', 'bootstrap_macro'])
        if not is_management and os.environ.get("ENABLE_IN_PROCESS_SCHEDULER", "false").lower() == "true":
            try:
                from apps.macro.services.scheduler import start_background_scheduler
                start_background_scheduler()
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Could not auto-start in-process scraper scheduler: {e}")
