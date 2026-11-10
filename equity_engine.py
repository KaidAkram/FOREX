"""Equity Indicator calculation engine following Equity Indicator2.pdf.

Methodology (3 steps per FX pair, daily OHLC candles):
  1. Étape 1 — Base-currency primary equity index:
       X = current / month-end close
       Y = all-time high among green candles (Close > Open) up to that month
       Change_Index = (X - Y) / Y
  2. Étape 2 — Synthetic series (FX Pair * Base-Currency Equity Index):
       Synthetic_Open  = Index_Open  * FX_Open
       Synthetic_Close = Index_Close * FX_Close
       Synthetic_High  = Index_High  * FX_High
       Green synthetic candle: Synthetic_Close > Synthetic_Open
       Change_{FXxIndex} = (X_synth - Y_synth) / Y_synth
  3. Étape 3 — Final Equity Change:
       Final = Change_{FXxIndex} - Change_Index   (Étape 2 - Étape 1)
       Rating = rate_equity(Final)
"""
from __future__ import annotations

import datetime
import json
import os
from pathlib import Path

import pandas as pd
import yfinance as yf

CACHE_VERSION = 2

INDEX_TICKERS = {
    'USD': '^GSPC',       # S&P 500
    'EUR': '^STOXX50E',   # EURO STOXX 50
    'CAD': '^GSPTSE',     # S&P/TSX Composite
    'JPY': '^N225',       # Nikkei 225
    'GBP': '^FTSE',       # FTSE 100
    'AUD': '^AXJO',       # S&P/ASX 200
    'CHF': '^SSMI',       # SMI
    'NZD': '^NZ50',       # S&P/NZX 50
    'NOK': 'OSEBX.OL',    # Norway proxy (OBX.OL has only 1 day on Yahoo Finance)
    'SEK': '^OMX',        # OMXS30
}

# Canonical 28 G10 pairs + 2 legacy inverted aliases (AUD/USD, NZD/USD)
FX_TICKERS = {
    'EUR/USD': ('EUR', 'EURUSD=X'),
    'EUR/GBP': ('EUR', 'EURGBP=X'),
    'EUR/JPY': ('EUR', 'EURJPY=X'),
    'EUR/CHF': ('EUR', 'EURCHF=X'),
    'EUR/CAD': ('EUR', 'EURCAD=X'),
    'EUR/AUD': ('EUR', 'EURAUD=X'),
    'EUR/NZD': ('EUR', 'EURNZD=X'),
    'GBP/USD': ('GBP', 'GBPUSD=X'),
    'GBP/JPY': ('GBP', 'GBPJPY=X'),
    'GBP/CHF': ('GBP', 'GBPCHF=X'),
    'GBP/CAD': ('GBP', 'GBPCAD=X'),
    'GBP/AUD': ('GBP', 'GBPAUD=X'),
    'GBP/NZD': ('GBP', 'GBPNZD=X'),
    'USD/JPY': ('USD', 'JPY=X'),
    'USD/CHF': ('USD', 'CHF=X'),
    'USD/CAD': ('USD', 'CAD=X'),
    'USD/AUD': ('USD', 'USDAUD=X'),
    'USD/NZD': ('USD', 'USDNZD=X'),
    'CHF/JPY': ('CHF', 'CHFJPY=X'),
    'CAD/JPY': ('CAD', 'CADJPY=X'),
    'AUD/JPY': ('AUD', 'AUDJPY=X'),
    'NZD/JPY': ('NZD', 'NZDJPY=X'),
    'CAD/CHF': ('CAD', 'CADCHF=X'),
    'AUD/CHF': ('AUD', 'AUDCHF=X'),
    'NZD/CHF': ('NZD', 'NZDCHF=X'),
    'AUD/CAD': ('AUD', 'AUDCAD=X'),
    'NZD/CAD': ('NZD', 'NZDCAD=X'),
    'AUD/NZD': ('AUD', 'AUDNZD=X'),
    'AUD/USD': ('AUD', 'AUDUSD=X'),
    'NZD/USD': ('NZD', 'NZDUSD=X'),
}

COUNTRY_INDEX_MAP = {
    'United States': 'USD',
    'Euro Area': 'EUR',
    'Japan': 'JPY',
    'United Kingdom': 'GBP',
    'Canada': 'CAD',
    'Australia': 'AUD',
    'Switzerland': 'CHF',
    'New Zealand': 'NZD',
    'Norway': 'NOK',
    'Sweden': 'SEK',
}

BJ_GRID = [
    0.25, 0.20, 0.18, 0.16, 0.14, 0.12, 0.10, 0.08, 0.06, 0.04, 0.02, 0.00,
    -0.02, -0.04, -0.06, -0.08, -0.10, -0.12, -0.14, -0.16, -0.18, -0.20, -0.25,
]
BK_GRID = [
    2, 3, 5, 7, 9, 10, 9, 7, 5, 3, 2, 0,
    -2, -3, -5, -7, -9, -10, -9, -7, -5, -3, -2,
]


class EquityFetchError(RuntimeError):
    """Raised when live Equity/FX market data cannot be retrieved or validated."""


def rate_equity(diff):
    if diff is None or pd.isna(diff):
        return 0
    clamped = max(-0.25, min(0.25, float(diff)))
    idx = min(range(len(BJ_GRID)), key=lambda i: abs(BJ_GRID[i] - clamped))
    return int(BK_GRID[idx])


def _clean_ohlc_frame(df):
    if df is None or df.empty:
        return pd.DataFrame(columns=['Open', 'High', 'Close'])
    sub = df[['Open', 'High', 'Close']].copy()
    sub = sub.dropna(subset=['Open', 'High', 'Close'])
    sub = sub[(sub['Open'] > 0) & (sub['High'] > 0) & (sub['Close'] > 0)]
    if sub.empty:
        return sub
    idx = pd.to_datetime(sub.index)
    if getattr(idx, 'tz', None) is not None:
        idx = idx.tz_localize(None)
    sub.index = idx.strftime('%Y-%m-%d')
    sub = sub[~sub.index.duplicated(keep='last')].sort_index()
    return sub


def fetch_market_data():
    """Fetch full daily OHLC history for all indices and FX pairs from Yahoo Finance."""
    index_dfs = {}
    for code, ticker in INDEX_TICKERS.items():
        try:
            hist = yf.Ticker(ticker).history(period='max', interval='1d')
            cleaned = _clean_ohlc_frame(hist)
        except Exception as exc:
            raise EquityFetchError(f"Failed to download index {code} ({ticker})") from exc
        if cleaned.empty:
            raise EquityFetchError(f"No historical OHLC candles returned for index {code} ({ticker})")
        index_dfs[code] = cleaned

    fx_symbols = sorted({t[1] for t in FX_TICKERS.values()})
    try:
        df_fx_all = yf.download(
            fx_symbols,
            start='1995-01-01',
            interval='1d',
            group_by='ticker',
            progress=False,
            threads=False,
        )
    except Exception as exc:
        raise EquityFetchError("Failed to download FX daily OHLC candles") from exc

    fx_dfs = {}
    for pair, (_, fx_ticker) in FX_TICKERS.items():
        try:
            raw_fx = df_fx_all[fx_ticker] if len(fx_symbols) > 1 else df_fx_all
            cleaned = _clean_ohlc_frame(raw_fx)
        except Exception as exc:
            raise EquityFetchError(f"Missing FX series {pair} ({fx_ticker})") from exc
        if cleaned.empty:
            raise EquityFetchError(f"No historical OHLC candles returned for FX pair {pair} ({fx_ticker})")
        fx_dfs[pair] = cleaned

    return index_dfs, fx_dfs


def compute_equity_from_frames(index_dfs, fx_dfs, *, start_year=2023, today=None):
    """Compute pair-level Equity indicators from clean daily OHLC DataFrames."""
    today = today or datetime.datetime.now(datetime.timezone.utc).date()
    current_ym = today.strftime('%Y-%m')
    all_months = pd.period_range(f'{start_year}-01', current_ym, freq='M').astype(str).tolist()

    prepared_indices = {}
    for code, i_raw in index_dfs.items():
        i_df = i_raw.copy()
        i_df['is_green'] = i_df['Close'] > i_df['Open']
        prepared_indices[code] = i_df

    results = {}
    for pair, (base_code, _) in FX_TICKERS.items():
        if base_code not in prepared_indices or pair not in fx_dfs:
            continue
        i_df = prepared_indices[base_code]
        f_df = fx_dfs[pair]

        common_dates = sorted(set(i_df.index).intersection(set(f_df.index)))
        if not common_dates:
            continue

        i_sub = i_df.loc[common_dates]
        f_sub = f_df.loc[common_dates]

        s_open = i_sub['Open'] * f_sub['Open']
        s_close = i_sub['Close'] * f_sub['Close']
        s_high = i_sub['High'] * f_sub['High']
        s_df = pd.DataFrame(
            {
                'Open': s_open,
                'Close': s_close,
                'High': s_high,
                'is_green': s_close > s_open,
            },
            index=common_dates,
        )

        i_months = i_df.index.str.slice(0, 7)
        s_months = s_df.index.str.slice(0, 7)

        pair_data = {}
        for ym in all_months:
            i_cur_m = i_df.loc[i_months == ym]
            i_past = i_df.loc[i_months <= ym]
            s_cur_m = s_df.loc[s_months == ym]
            s_past = s_df.loc[s_months <= ym]

            if i_cur_m.empty or s_cur_m.empty:
                continue

            past_i_green = i_past[i_past['is_green']]
            past_s_green = s_past[s_past['is_green']]
            if past_i_green.empty or past_s_green.empty:
                continue

            # Étape 1 — Base currency equity index vs accepted green-candle ATH
            base_cur = float(i_cur_m['Close'].iloc[-1])
            base_ath = float(past_i_green['High'].max())
            if base_ath <= 0:
                continue
            change_index = (base_cur - base_ath) / base_ath

            # Étape 2 — Synthetic FX × Index vs accepted green-candle ATH
            synth_cur = float(s_cur_m['Close'].iloc[-1])
            synth_ath = float(past_s_green['High'].max())
            if synth_ath <= 0:
                continue
            change_synth = (synth_cur - synth_ath) / synth_ath

            # Étape 3 — Final Equity Change = Étape 2 − Étape 1 (Synthetic − Index)
            final_change = change_synth - change_index
            rating = rate_equity(final_change)

            pair_data[ym] = {
                'synth_ath': synth_ath,
                'synth_cur': synth_cur,
                'change_synth': change_synth,
                'base_ath': base_ath,
                'base_cur': base_cur,
                'change_index': change_index,
                'final_change': final_change,
                'rating': rating,
                'as_of_date': str(s_cur_m.index[-1]),
                'is_provisional': ym == current_ym,
            }

        results[pair] = pair_data

    country_results = {}
    for c_name, code in COUNTRY_INDEX_MAP.items():
        if code not in prepared_indices:
            continue
        i_df = prepared_indices[code]
        i_months = i_df.index.str.slice(0, 7)
        c_series = {}
        for ym in all_months:
            i_cur_m = i_df.loc[i_months == ym]
            i_past = i_df.loc[i_months <= ym]
            past_green = i_past[i_past['is_green']]
            if i_cur_m.empty or past_green.empty:
                continue
            cur = float(i_cur_m['Close'].iloc[-1])
            ath = float(past_green['High'].max())
            if ath > 0:
                c_series[ym] = round((cur - ath) / ath * 100, 4)
        country_results[c_name] = c_series

    return results, country_results


def build_equity_dataset(use_cache=False, live_update=True, *, start_year=2023, today=None):
    cache_path = Path(__file__).resolve().parent / 'equity_dataset_cache.json'
    if use_cache and not live_update and cache_path.exists():
        with open(cache_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if data.get('version') == CACHE_VERSION and 'pairs' in data:
            return data['pairs'], data.get('countries', {})

    index_dfs, fx_dfs = fetch_market_data()
    results, country_results = compute_equity_from_frames(
        index_dfs, fx_dfs, start_year=start_year, today=today
    )
    if not results:
        raise EquityFetchError("Computed empty Equity pair dataset")

    payload = {
        'version': CACHE_VERSION,
        'fetched_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'latest_month': max((max(m) for m in results.values() if m), default=None),
        'pairs': results,
        'countries': country_results,
    }
    with open(cache_path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2)

    return results, country_results


if __name__ == "__main__":
    res, _ = build_equity_dataset(use_cache=False, live_update=True)
    with open('equity_frontend.json', 'w', encoding='utf-8') as f:
        json.dump({'pairs': res, 'countries': {}}, f, indent=2)
    print(f"Computed {len(res)} FX pairs. Latest samples:")
    for p in ['EUR/USD', 'USD/JPY', 'GBP/USD', 'USD/CAD', 'USD/AUD']:
        months = sorted(res.get(p, {}))
        for ym in months[-2:]:
            pt = res[p][ym]
            print(
                f"  {p:<8} {ym}: Index={pt['change_index']*100:+.2f}% | "
                f"Synth={pt['change_synth']*100:+.2f}% | Final={pt['final_change']*100:+.2f}% | R={pt['rating']:+d}"
            )
