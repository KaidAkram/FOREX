"""
Management command: scrape_cpi
Scrapes live official CPI Inflation Rate from TradingEconomics (https://tradingeconomics.com/country/inflation-cpi).
Specification:
  - Source: National Statistics Bureaus via TradingEconomics live stream
  - Indicator: CPI Inflation Rate (%) YoY
  - Frequency: Monthly
  - Precision: Full unrounded raw float numbers
  - Only official published prints are stored. Unreleased future months are left empty or manual.

Usage:
    python manage.py scrape_cpi
"""
from django.core.management.base import BaseCommand
from apps.macro.services.scraper_orchestrator import ScraperOrchestrator
from apps.macro.services.calculator import recalculate_full_matrix


class Command(BaseCommand):
    help = "Scrapes live official CPI Inflation Rate from TradingEconomics autonomously."

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write("TRADINGECONOMICS AUTONOMOUS LIVE CPI SCRAPER")
        self.stdout.write("=" * 70)

        self.stdout.write("Fetching live official CPI data points from TradingEconomics stream...")
        saved, skipped = ScraperOrchestrator._sync_cpi()
        self.stdout.write(self.style.SUCCESS(f"[SUCCESS] Ingested {saved} official CPI points into database!"))
        if skipped:
            self.stdout.write(self.style.WARNING(f"Notice: {skipped}"))

        self.stdout.write("--> Recalculating bias engine matrix...")
        recalculated = recalculate_full_matrix()
        self.stdout.write(self.style.SUCCESS(f"[SUCCESS] Recalculated {recalculated} pair-month scores."))
        self.stdout.write("=" * 70)
