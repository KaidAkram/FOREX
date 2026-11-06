"""
Management command: scrape_interest_rate
Scrapes live official Central Bank Interest Rates from TradingEconomics (https://tradingeconomics.com/country/interest-rate).
Specification:
  - Source: Central Banks via TradingEconomics live stream
  - Indicator: Central Bank Policy Rate (%)
  - Frequency: Monthly
  - Precision: Full unrounded raw float numbers
  - Only official published prints are stored. Unreleased future months are left empty or manual.

Usage:
    python manage.py scrape_interest_rate
"""
from django.core.management.base import BaseCommand
from apps.macro.services.scraper_orchestrator import ScraperOrchestrator
from apps.macro.services.calculator import recalculate_full_matrix


class Command(BaseCommand):
    help = "Scrapes live official Central Bank Interest Rates from TradingEconomics autonomously."

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write("TRADINGECONOMICS AUTONOMOUS LIVE INTEREST RATE SCRAPER")
        self.stdout.write("=" * 70)

        self.stdout.write("Fetching live official policy rate data from TradingEconomics stream...")
        saved, skipped = ScraperOrchestrator._sync_interest_rates()
        self.stdout.write(self.style.SUCCESS(f"[SUCCESS] Ingested {saved} official Interest Rate points into database!"))
        if skipped:
            self.stdout.write(self.style.WARNING(f"Notice: {skipped}"))

        self.stdout.write("--> Recalculating bias engine matrix...")
        recalculated = recalculate_full_matrix()
        self.stdout.write(self.style.SUCCESS(f"[SUCCESS] Recalculated {recalculated} pair-month scores."))
        self.stdout.write("=" * 70)
