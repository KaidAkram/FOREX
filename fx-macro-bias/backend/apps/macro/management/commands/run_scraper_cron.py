"""
Management command: run_scraper_cron
Runs the automated macroeconomic scraper scheduler process or executes an immediate single cycle.

Usage:
    python manage.py run_scraper_cron --daemon    # Runs background scheduler daemon
    python manage.py run_scraper_cron --now       # Executes immediate scraping cycle
"""
import time
from django.core.management.base import BaseCommand
from apps.macro.services.scheduler import force_trigger_now, start_background_scheduler, get_scheduler_telemetry


class Command(BaseCommand):
    help = "Runs the automated macroeconomic scraper scheduler or executes an immediate cycle."

    def add_arguments(self, parser):
        parser.add_argument(
            "--now",
            action="store_true",
            help="Forces an immediate execution of the full macroeconomic pipeline."
        )
        parser.add_argument(
            "--daemon",
            action="store_true",
            help="Runs the persistent background scheduler process."
        )

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write("MACROECONOMIC SCRAPER CRON SCHEDULER ENGINE")
        self.stdout.write("=" * 70)

        if options["now"]:
            self.stdout.write("Executing immediate macroeconomic scraping pipeline...")
            res = force_trigger_now(trigger_source="cli_command")
            self.stdout.write(self.style.SUCCESS(
                f"Completed with status: {res.get('status')}. "
                f"Records recalculated: {res.get('records_recalculated')}. "
                f"Next run: {res.get('next_scheduled_run_display')}"
            ))
            if res.get("skipped_reason"):
                self.stdout.write(self.style.WARNING(f"Notice: {res.get('skipped_reason')}"))
            return

        # Daemon mode
        self.stdout.write("Starting persistent background scheduler worker...")
        start_background_scheduler()
        self.stdout.write(self.style.SUCCESS("Scheduler is active. Press Ctrl+C to exit."))

        try:
            while True:
                time.sleep(10)
                telemetry = get_scheduler_telemetry()
                self.stdout.write(
                    f"[{telemetry['last_scrape_time']}] Status: {telemetry['last_status']} | "
                    f"Next Run: {telemetry['next_scheduled_run_display']} | "
                    f"Active: {telemetry['cron_active']}"
                )
        except KeyboardInterrupt:
            self.stdout.write("\nStopping scheduler daemon.")
