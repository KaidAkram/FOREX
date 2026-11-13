from django.apps import AppConfig
import os

class MacroConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.macro'

    def ready(self):
        import apps.macro.signals  # noqa: F401
        
        # When running in zero-cost / single-service mode without a dedicated worker
        if os.environ.get("ENABLE_IN_PROCESS_SCHEDULER") == "true":
            try:
                from apps.macro.services.scheduler import start_background_scheduler
                start_background_scheduler()
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Could not auto-start in-process scraper scheduler: {e}")
