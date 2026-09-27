"""
Management command: scrape_imf_fx
Scrapes live Foreign Exchange Reserves (excluding gold) from the official IMF SDMX 3.0 API,
merges with EXCEL8EXAMPLE.xlsx baseline preserving full floating-point precision (NO floor/ceil/round),
computes 12-Month moving average flows, pair spreads, and ratings per 'Calcul du différentiel — FX Reserves Exchange.docx'.
"""
import urllib.request
import json
from datetime import datetime, date
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.macro.models import Country, MacroIndicator, MacroDataPoint, FXPair, Differential, Rating, FinalScore
from apps.macro.services.calculator import calculate_differential, calculate_rating, calculate_final_score
import sys
from pathlib import Path
project_root = Path(__file__).resolve().parents[6]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

import fx_reserves_engine


class Command(BaseCommand):
    help = "Scrapes live official IMF FX Reserves (excluding gold) via SDMX 3.0 API and executes 3-step math."

    def add_arguments(self, parser):
        parser.add_argument(
            "--start-year",
            type=int,
            default=2022,
            help="Starting year for observations (default: 2022)"
        )

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write("OFFICIAL IMF FX RESERVES EXTRACTION & 3-STEP DIFFERENTIAL ENGINE")
        self.stdout.write("   Dataset:   International Liquidity (IMF.STA:IL(13.0.1))")
        self.stdout.write("   Indicator: Reserves excluding gold, foreign exchange (RXF11FX_REVS)")
        self.stdout.write("   Unit:      USD (Scaled to Millions of USD, Full Float Precision)")
        self.stdout.write("=" * 70)

        indicator = MacroIndicator.objects.filter(slug="fx_reserves").first()
        if not indicator:
            raise CommandError("Indicator 'fx_reserves' does not exist in MacroIndicator table.")

        # 1. Build FX dataset using fx_reserves_engine
        self.stdout.write("\n[1/4] Building authoritative FX Reserves dataset (IMF API + Excel baseline)...")
        df_raw, df_avg12, pair_results, country_raw, country_flow = fx_reserves_engine.build_fx_dataset()

        # 2. Upsert unrounded raw data points into MacroDataPoint
        self.stdout.write("\n[2/4] Upserting exact unrounded float observations into MacroDataPoint...")
        active_countries = {c.name: c for c in Country.objects.filter(is_active=True)}

        records_to_upsert = []
        for c_name, pts in country_raw.items():
            country_obj = active_countries.get(c_name)
            if not country_obj:
                continue
            for ym, val in pts.items():
                if val is not None:
                    y, m = ym.split("-")
                    dt = date(int(y), int(m), 1)
                    records_to_upsert.append(
                        MacroDataPoint(
                            country=country_obj,
                            indicator=indicator,
                            month=dt,
                            value=float(val),
                            source="Official IMF SDMX 3.0 (RXF11FX_REVS)",
                            status="PROCESSED",
                            is_active_value=True,
                        )
                    )

        with transaction.atomic():
            # Delete old points for fx_reserves to clear any previously rounded/corrupted records
            MacroDataPoint.objects.filter(indicator=indicator).delete()
            MacroDataPoint.objects.bulk_create(records_to_upsert)
        self.stdout.write(self.style.SUCCESS(f"  -> Successfully loaded {len(records_to_upsert)} unrounded raw points."))

        # 3. Calculate Differentials and Ratings for all pairs from 2023-01 to 2026-12
        self.stdout.write("\n[3/4] Calculating 12-Month Moving Average Flows, Spreads & Ratings...")
        active_pairs = list(FXPair.objects.filter(is_active=True).select_related("base_currency", "quote_currency"))

        # Months from 2023-01 to 2026-12 (48 months)
        eval_months = []
        for y in range(2023, 2027):
            for m in range(1, 13):
                eval_months.append(date(y, m, 1))

        diff_count = 0
        with transaction.atomic():
            for ym_date in eval_months:
                for pair in active_pairs:
                    diff = calculate_differential(pair.pk, indicator.pk, ym_date)
                    calculate_rating(diff.pk)
                    diff_count += 1
        self.stdout.write(self.style.SUCCESS(f"  -> Successfully computed {diff_count} pair differentials & ratings."))

        # 4. Recompute FinalScore across all pairs
        self.stdout.write("\n[4/4] Recomputing composite FinalScore and Macro Bias for all pairs...")
        score_count = 0
        with transaction.atomic():
            for ym_date in eval_months:
                for pair in active_pairs:
                    calculate_final_score(pair.pk, ym_date)
                    score_count += 1
        self.stdout.write(self.style.SUCCESS(f"  -> Successfully recomputed {score_count} composite final scores."))

        self.stdout.write(self.style.SUCCESS("\n[SUCCESS] FX Reserves completely rectified across Django database!"))
