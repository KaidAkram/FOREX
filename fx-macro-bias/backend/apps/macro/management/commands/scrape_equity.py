import os
import sys
import datetime
import yfinance as yf
import pandas as pd
import numpy as np

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.macro.models import Country, MacroIndicator, MacroDataPoint, FXPair, Differential, Rating, FinalScore
from apps.macro.services.calculator import calculate_final_score

INDEX_TICKERS = {
    'USD': '^GSPC',       # S&P 500
    'EUR': '^STOXX50E',   # EURO STOXX 50
    'CAD': '^GSPTSE',     # S&P/TSX
    'JPY': '^N225',       # Nikkei 225
    'GBP': '^FTSE',       # FTSE 100
    'AUD': '^AXJO',       # S&P/ASX 200
    'CHF': '^SSMI',       # SMI
    'NZD': '^NZ50',       # S&P/NZX 50
    'NOK': 'OSEBX.OL',    # OSEBX
    'SEK': '^OMX',        # OMXS30
}

FX_TICKERS = {
    'USD/JPY': 'JPY=X',
    'USD/CHF': 'CHF=X',
    'USD/CAD': 'CAD=X',
    'EUR/USD': 'EURUSD=X',
    'EUR/JPY': 'EURJPY=X',
    'EUR/CHF': 'EURCHF=X',
    'EUR/GBP': 'EURGBP=X',
    'EUR/CAD': 'EURCAD=X',
    'EUR/AUD': 'EURAUD=X',
    'EUR/NZD': 'EURNZD=X',
    'GBP/USD': 'GBPUSD=X',
    'GBP/JPY': 'GBPJPY=X',
    'GBP/CHF': 'GBPCHF=X',
    'GBP/CAD': 'GBPCAD=X',
    'GBP/AUD': 'GBPAUD=X',
    'GBP/NZD': 'GBPNZD=X',
    'CHF/JPY': 'CHFJPY=X',
    'AUD/USD': 'AUDUSD=X',
    'AUD/CHF': 'AUDCHF=X',
    'AUD/JPY': 'AUDJPY=X',
    'AUD/NZD': 'AUDNZD=X',
    'AUD/CAD': 'AUDCAD=X',
    'CAD/JPY': 'CADJPY=X',
    'NZD/USD': 'NZDUSD=X',
}

BJ_GRID = [0.25, 0.20, 0.18, 0.16, 0.14, 0.12, 0.10, 0.08, 0.06, 0.04, 0.02, 0.00,
           -0.02, -0.04, -0.06, -0.08, -0.10, -0.12, -0.14, -0.16, -0.18, -0.20, -0.25]
BK_GRID = [2, 3, 5, 7, 9, 10, 9, 7, 5, 3, 2, 0,
           -2, -3, -5, -7, -9, -10, -9, -7, -5, -3, -2]

def rate_equity(diff):
    if diff is None or pd.isna(diff):
        return 0
    clamped = max(-0.25, min(0.25, float(diff)))
    idx = min(range(len(BJ_GRID)), key=lambda i: abs(BJ_GRID[i] - clamped))
    return int(BK_GRID[idx])

root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..', '..'))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
import equity_engine

class Command(BaseCommand):
    help = "Calculates Equity Indicator according to official daily green-candle ATH methodology (1.docx)"

    def handle(self, *args, **options):
        self.stdout.write("[START] Computing Equity Indicator via Yahoo Finance daily history (per 1.docx)...")
        pair_results, country_results = equity_engine.build_equity_dataset(use_cache=True)

        equity_indicator = MacroIndicator.objects.get(slug="equity")

        # 1. Populate Country MacroDataPoints
        self.stdout.write("  -> Populating Country MacroDataPoints for Equity...")
        c_count = 0
        countries = Country.objects.filter(is_active=True)
        with transaction.atomic():
            for country in countries:
                c_series = country_results.get(country.name, {})
                for ym, val in c_series.items():
                    month_date = f"{ym}-01"
                    MacroDataPoint.objects.update_or_create(
                        country=country,
                        indicator=equity_indicator,
                        month=month_date,
                        defaults={
                            "value": val,
                            "status": MacroDataPoint.Status.PUBLISHED,
                            "source": "Yahoo Finance (Equity Engine)",
                            "is_active_value": True,
                        }
                    )
                    c_count += 1
        self.stdout.write(f"     [OK] Saved {c_count} country Equity data points.")

        # 2. Populate Pair Differentials and Ratings
        self.stdout.write("  -> Populating Pair Differentials & Ratings...")
        diff_count = 0
        active_pairs = FXPair.objects.filter(is_active=True).select_related("base_currency", "quote_currency")
        with transaction.atomic():
            for pair in active_pairs:
                pair_sym = pair.symbol
                pair_clean = pair_sym.replace('/', ' ')
                p_data = pair_results.get(pair_clean, pair_results.get(pair_sym, {}))
                for ym, pt in p_data.items():
                    month_date = f"{ym}-01"
                    diff, _ = Differential.objects.update_or_create(
                        pair=pair,
                        indicator=equity_indicator,
                        month=month_date,
                        defaults={
                            "base_value": pt['change_index'],
                            "quote_value": pt['change_synth'],
                            "difference": pt['final_change'],
                            "is_complete": True,
                        }
                    )
                    Rating.objects.update_or_create(
                        differential=diff,
                        defaults={
                            "rating_value": pt['rating'],
                        }
                    )
                    diff_count += 1
        self.stdout.write(f"     [OK] Saved {diff_count} pair-month Equity differentials and ratings.")

        # 3. Recalculate FinalScore composite matrix atomically
        self.stdout.write("  -> Recalculating FinalScore composite matrix atomically...")
        recalc_count = 0
        all_months = [f"{y}-{m:02d}" for y in range(2023, 2027) for m in range(1, 13)]
        with transaction.atomic():
            for p in active_pairs:
                for ym in all_months:
                    month_date = f"{ym}-01"
                    calculate_final_score(p.pk, month_date)
                    recalc_count += 1
        self.stdout.write(f"[SUCCESS] Recalculated {recalc_count} pair-month composite scores and biases!")

        # 4. Auto-sync Frontend macroDataset.json & macroDataset.ts
        import json
        import re
        equity_frontend_path = os.path.join(root_dir, 'equity_frontend.json')
        with open(equity_frontend_path, 'w', encoding='utf-8') as f:
            json.dump({'pairs': pair_results, 'countries': country_results}, f, indent=2)

        # Include both slash and space keys in pair_results for frontend
        fe_pairs = dict(pair_results)
        for k, v in list(pair_results.items()):
            fe_pairs[k.replace(' ', '/')] = v
            fe_pairs[k.replace('/', ' ')] = v

        json_path = os.path.join(root_dir, 'fx-macro-bias', 'frontend', 'src', 'data', 'macroDataset.json')
        if os.path.exists(json_path):
            with open(json_path, 'r', encoding='utf-8') as f:
                fe_json = json.load(f)
            fe_json['Equity'] = country_results
            fe_json['PairEquity'] = fe_pairs
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(fe_json, f, indent=2)

        ts_path = os.path.join(root_dir, 'fx-macro-bias', 'frontend', 'src', 'data', 'macroDataset.ts')
        if os.path.exists(ts_path):
            with open(ts_path, 'r', encoding='utf-8') as f:
                ts_content = f.read()

            country_eq_ts = "  \"Equity\": " + json.dumps(country_results, indent=4).replace("\n", "\n  ")
            pattern = r'  "Equity":\s*\{[\s\S]*?\n  \}'
            if re.search(pattern, ts_content):
                ts_content = re.sub(pattern, country_eq_ts, ts_content, count=1)

            start_str = "export const PAIR_EQUITY_DATA"
            target_str = "export function getCombinedDifferentialData(pairName: string, indicator: string, year: number) {"
            if start_str in ts_content:
                prefix = ts_content.split(start_str)[0]
                suffix = ts_content.split(target_str)[1]
                ts_content = prefix + "export const PAIR_EQUITY_DATA: Record<string, Record<string, { synth_ath: number; synth_cur: number; change_synth: number; base_ath: number; base_cur: number; change_index: number; final_change: number; rating: number; }>> = " + json.dumps(fe_pairs, indent=2) + ";\n\n" + target_str + suffix

            with open(ts_path, 'w', encoding='utf-8') as f:
                f.write(ts_content)
            self.stdout.write("     [OK] Frontend macroDataset.json & macroDataset.ts updated synchronously!")
