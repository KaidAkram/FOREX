from django.apps import AppConfig
from django.db.backends.signals import connection_created
import os
import sys

def configure_sqlite_pragmas(sender, connection, **kwargs):
    if connection.vendor == 'sqlite':
        try:
            with connection.cursor() as cursor:
                cursor.execute("PRAGMA journal_mode=WAL;")
                cursor.execute("PRAGMA busy_timeout=30000;")
                cursor.execute("PRAGMA synchronous=NORMAL;")
        except Exception:
            pass

class MacroConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.macro'

    def ready(self):
        import apps.macro.signals  # noqa: F401
        connection_created.connect(configure_sqlite_pragmas)
        
        # Avoid running worker thread during build/management commands
        is_management = any(cmd in sys.argv for cmd in ['check', 'migrate', 'collectstatic', 'makemigrations', 'test', 'shell', 'createsuperuser', 'bootstrap_macro'])
        if not is_management and os.environ.get("ENABLE_IN_PROCESS_SCHEDULER", "true").lower() == "true":
            try:
                from apps.macro.services.scheduler import start_background_scheduler
                start_background_scheduler()
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Could not auto-start in-process scraper scheduler: {e}")
