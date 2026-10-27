import os
import sys
from datetime import date
from pathlib import Path

# Django setup
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

import django
django.setup()

from apps.macro.models import MacroDataPoint, MacroIndicator, Country
from apps.macro.signals import disable_macro_signals
from django.db import transaction

def fix_all_statuses():
    print("Fixing macro publication statuses based on official release calendar...")
    with disable_macro_signals(), transaction.atomic():
        # 1. GDP: Cutoff is 2026-09. 2026-10, 2026-11, 2026-12 are forward forecasts / estimates.
        ind_gdp = MacroIndicator.objects.get(slug="gdp")
        p_count = MacroDataPoint.objects.filter(indicator=ind_gdp, month__lte=date(2026, 9, 1)).update(
            status=MacroDataPoint.Status.PUBLISHED
        )
        f_count = MacroDataPoint.objects.filter(indicator=ind_gdp, month__gt=date(2026, 9, 1)).update(
            status=MacroDataPoint.Status.FORECAST
        )
        print(f"GDP: {p_count} set to published (<= 2026-09), {f_count} set to forecast (> 2026-09)")

        # 2. Current Account: Cutoff is 2026-09. 2026-10, 2026-11, 2026-12 are forward forecasts.
        ind_ca = MacroIndicator.objects.get(slug="ca_gdp")
        p_count = MacroDataPoint.objects.filter(indicator=ind_ca, month__lte=date(2026, 9, 1)).update(
            status=MacroDataPoint.Status.PUBLISHED
        )
        f_count = MacroDataPoint.objects.filter(indicator=ind_ca, month__gt=date(2026, 9, 1)).update(
            status=MacroDataPoint.Status.FORECAST
        )
        print(f"Current Account: {p_count} set to published, {f_count} set to forecast")

        # 3. FX Reserves: Cutoff is 2026-09. 2026-10, 2026-11, 2026-12 are forward forecasts.
        ind_fx = MacroIndicator.objects.get(slug="fx_reserves")
        p_count = MacroDataPoint.objects.filter(indicator=ind_fx, month__lte=date(2026, 9, 1)).update(
            status=MacroDataPoint.Status.PUBLISHED
        )
        f_count = MacroDataPoint.objects.filter(indicator=ind_fx, month__gt=date(2026, 9, 1)).update(
            status=MacroDataPoint.Status.FORECAST
        )
        print(f"FX Reserves: {p_count} set to published, {f_count} set to forecast")

        # 4. CPI Inflation:
        # USA, Euro Area, Japan, Australia, Canada, Switzerland, Sweden, Norway: <= 2026-09 is published.
        # United Kingdom: <= 2026-08 is published, 2026-09 is forecast.
        # All countries: >= 2026-10 are forecast.
        ind_cpi = MacroIndicator.objects.get(slug="cpi")
        MacroDataPoint.objects.filter(indicator=ind_cpi, month__lte=date(2026, 8, 1)).update(
            status=MacroDataPoint.Status.PUBLISHED
        )
        MacroDataPoint.objects.filter(indicator=ind_cpi, month=date(2026, 9, 1)).exclude(
            country__name="United Kingdom"
        ).update(status=MacroDataPoint.Status.PUBLISHED)
        MacroDataPoint.objects.filter(indicator=ind_cpi, month=date(2026, 9, 1), country__name="United Kingdom").update(
            status=MacroDataPoint.Status.FORECAST
        )
        MacroDataPoint.objects.filter(indicator=ind_cpi, month__gte=date(2026, 10, 1)).update(
            status=MacroDataPoint.Status.FORECAST
        )
        print("CPI: Published up to 2026-09 (UK pending 2026-09), forward months set to forecast")

        # 5. Interest Rate: Published through 2026-10. 2026-11 and 2026-12 are forecast.
        ind_ir = MacroIndicator.objects.get(slug="interest_rate")
        p_count = MacroDataPoint.objects.filter(indicator=ind_ir, month__lte=date(2026, 10, 1)).update(
            status=MacroDataPoint.Status.PUBLISHED
        )
        f_count = MacroDataPoint.objects.filter(indicator=ind_ir, month__gt=date(2026, 10, 1)).update(
            status=MacroDataPoint.Status.FORECAST
        )
        print(f"Interest Rate: {p_count} published (<= 2026-10), {f_count} forecast (> 2026-10)")

        # 6. Equity: Real-time calculation through 2026-10. 2026-11 and 2026-12 are forecast.
        ind_eq = MacroIndicator.objects.get(slug="equity")
        p_count = MacroDataPoint.objects.filter(indicator=ind_eq, month__lte=date(2026, 10, 1)).update(
            status=MacroDataPoint.Status.PUBLISHED
        )
        f_count = MacroDataPoint.objects.filter(indicator=ind_eq, month__gt=date(2026, 10, 1)).update(
            status=MacroDataPoint.Status.FORECAST
        )
        print(f"Equity: {p_count} published (<= 2026-10), {f_count} forecast (> 2026-10)")

    print("Successfully corrected all macro publication statuses!")

if __name__ == "__main__":
    fix_all_statuses()
