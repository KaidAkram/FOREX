import os
import sys
import datetime
import yfinance as yf
import pandas as pd
import numpy as np

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.macro.models import Country, MacroIndicator, MacroDataPoint, FXPair, Differential, Rating, FinalScore
from apps.macro.services.calculator import recalculate_all_for_month

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

class Command(BaseCommand):
    help = "Calculates Equity Indicator according to official 3-step methodology (Equity Indicator.docx)"

    def handle(self, *args, **options):
        self.stdout.write("[START] Computing Equity Indicator via Yahoo Finance history...")

        # 1. Preload Equity Indices
        self.stdout.write("  -> Downloading historical index monthly candles...")
        index_dfs = {}
        for code, ticker in INDEX_TICKERS.items():
            df = yf.Ticker(ticker).history(start='2000-01-01', interval='1mo')
            df.index = df.index.strftime('%Y-%m')
            df['is_green'] = df['Close'] >= df['Open']
            index_dfs[code] = df

        # 2. Preload FX Pairs
        self.stdout.write("  -> Downloading historical FX pair monthly candles...")
        fx_dfs = {}
        for pair_sym, fx_ticker in FX_TICKERS.items():
            df = yf.Ticker(fx_ticker).history(start='2000-01-01', interval='1mo')
            df.index = df.index.strftime('%Y-%m')
            fx_dfs[pair_sym] = df

        equity_indicator = MacroIndicator.objects.get(slug="equity")

        all_months = []
        for y in range(2023, 2027):
            for m in range(1, 13):
                all_months.append(f"{y}-{m:02d}")

        # 3. Populate Country MacroDataPoints (Étape 1: Index Return vs accepted ATH)
        self.stdout.write("  -> Populating Country MacroDataPoints for Equity...")
        c_count = 0
        fe_countries = {}
        countries = Country.objects.filter(is_active=True)
        for country in countries:
            code = country.iso_code
            if code not in index_dfs:
                continue
            i_df = index_dfs[code]
            last_val = None
            c_series = {}
            for ym in all_months:
                month_date = f"{ym}-01"
                if ym in i_df.index:
                    past_idx = i_df.index[i_df.index <= ym]
                    past_green = i_df.loc[past_idx][i_df.loc[past_idx, 'is_green']]
                    ath = float(past_green['High'].max())
                    cur = float(i_df.loc[ym, 'Close'])
                    chg = (cur - ath) / ath
                    val = round(chg * 100, 4)
                    c_series[ym] = val
                    last_val = val
                elif last_val is not None:
                    c_series[ym] = last_val
                    val = last_val
                else:
                    continue

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
            fe_countries[country.name] = c_series
        self.stdout.write(f"     [OK] Saved {c_count} country Equity data points.")

        # 4. Populate Pair Differentials and Ratings directly
        self.stdout.write("  -> Computing Synthetic Pairs, Differentials & Ratings...")
        diff_count = 0
        active_pairs = FXPair.objects.filter(is_active=True).select_related("base_currency", "quote_currency")
        fe_pairs = {}

        for pair in active_pairs:
            pair_sym = pair.symbol
            if pair_sym not in FX_TICKERS:
                continue
            base_code = pair.base_currency.iso_code
            if base_code not in index_dfs:
                continue

            i_df = index_dfs[base_code]
            f_df = fx_dfs[pair_sym]

            common_idx = i_df.index.intersection(f_df.index).sort_values()
            o_s = f_df.loc[common_idx, 'Open'] * i_df.loc[common_idx, 'Open']
            c_s = f_df.loc[common_idx, 'Close'] * i_df.loc[common_idx, 'Close']
            h_s = f_df.loc[common_idx, 'High'] * i_df.loc[common_idx, 'High']
            is_green_s = c_s >= o_s

            last_pt = None
            p_data = {}
            for ym in all_months:
                month_date = f"{ym}-01"
                if ym in common_idx:
                    past_idx = common_idx[common_idx <= ym]

                    # Base index ATH on green candle
                    past_i_green = i_df.loc[past_idx][i_df.loc[past_idx, 'is_green']]
                    base_ath = float(past_i_green['High'].max())
                    base_cur = float(i_df.loc[ym, 'Close'])
                    change_index = (base_cur - base_ath) / base_ath

                    # Synthetic ATH on green candle
                    past_s_green = past_idx[is_green_s.loc[past_idx]]
                    synth_ath = float(h_s.loc[past_s_green].max())
                    synth_cur = float(c_s.loc[ym])
                    change_synth = (synth_cur - synth_ath) / synth_ath

                    # %a (Base Index) - %b (Synthetic series)
                    final_change = change_index - change_synth
                    rating_val = rate_equity(final_change)

                    pt = {
                        'synth_ath': synth_ath,
                        'synth_cur': synth_cur,
                        'change_synth': change_synth,
                        'base_ath': base_ath,
                        'base_cur': base_cur,
                        'change_index': change_index,
                        'final_change': final_change,
                        'rating': rating_val,
                    }
                    p_data[ym] = pt
                    last_pt = (change_index, change_synth, final_change, rating_val, pt)
                elif last_pt is not None:
                    change_index, change_synth, final_change, rating_val, pt = last_pt
                    p_data[ym] = dict(pt)
                else:
                    continue

                diff, _ = Differential.objects.update_or_create(
                    pair=pair,
                    indicator=equity_indicator,
                    month=month_date,
                    defaults={
                        "base_value": change_index,
                        "quote_value": change_synth,
                        "difference": final_change,
                        "is_complete": True,
                    }
                )

                Rating.objects.update_or_create(
                    differential=diff,
                    defaults={
                        "rating_value": rating_val,
                    }
                )
                diff_count += 1

            fe_pairs[pair.symbol.replace('/', ' ')] = p_data
            fe_pairs[pair.symbol] = p_data

        self.stdout.write(f"     [OK] Computed {diff_count} pair-month Equity differentials and ratings.")

        # 5. Atomic matrix recalculation for all active pairs and months
        self.stdout.write("  -> Recalculating FinalScore composite matrix atomically...")
        recalc_count = 0
        with transaction.atomic():
            for p in active_pairs:
                for ym in all_months:
                    month_date = f"{ym}-01"
                    recalculate_all_for_month(p.pk, month_date)
                    recalc_count += 1

        self.stdout.write(f"[SUCCESS] Recalculated {recalc_count} pair-month composite scores and biases!")

        # 6. Auto-sync Frontend macroDataset.json & macroDataset.ts
        import json
        import re
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..', '..'))
        equity_frontend_path = os.path.join(root_dir, 'equity_frontend.json')
        with open(equity_frontend_path, 'w', encoding='utf-8') as f:
            json.dump({'pairs': fe_pairs, 'countries': fe_countries}, f, indent=2)

        json_path = os.path.join(root_dir, 'fx-macro-bias', 'frontend', 'src', 'data', 'macroDataset.json')
        if os.path.exists(json_path):
            with open(json_path, 'r', encoding='utf-8') as f:
                fe_json = json.load(f)
            fe_json['Equity'] = fe_countries
            fe_json['PairEquity'] = fe_pairs
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(fe_json, f, indent=2)

        ts_path = os.path.join(root_dir, 'fx-macro-bias', 'frontend', 'src', 'data', 'macroDataset.ts')
        if os.path.exists(ts_path):
            with open(ts_path, 'r', encoding='utf-8') as f:
                ts_content = f.read()

            country_eq_ts = "  \"Equity\": " + json.dumps(fe_countries, indent=4).replace("\n", "\n  ")
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
