import openpyxl
import pandas as pd
import numpy as np
import urllib.request
import json
import datetime
from pathlib import Path

# 8 G10 economies + Sweden & Norway
COUNTRIES = [
    'United States', 'Euro Area', 'Japan', 'United Kingdom',
    'Australia', 'Canada', 'Switzerland', 'New Zealand', 'Sweden', 'Norway'
]

PAIRS = [
    ('EUR/USD', 'Euro Area', 'United States'),
    ('USD/JPY', 'United States', 'Japan'),
    ('GBP/USD', 'United Kingdom', 'United States'),
    ('AUD/USD', 'Australia', 'United States'),
    ('USD/CAD', 'United States', 'Canada'),
    ('USD/CHF', 'United States', 'Switzerland'),
    ('NZD/USD', 'New Zealand', 'United States'),
    ('USD/AUD', 'United States', 'Australia'),
    ('USD/NZD', 'United States', 'New Zealand'),
    ('EUR/JPY', 'Euro Area', 'Japan'),
    ('GBP/JPY', 'United Kingdom', 'Japan'),
    ('EUR/GBP', 'Euro Area', 'United Kingdom'),
    ('EUR/CHF', 'Euro Area', 'Switzerland'),
    ('AUD/JPY', 'Australia', 'Japan'),
    ('CAD/JPY', 'Canada', 'Japan'),
    ('CHF/JPY', 'Switzerland', 'Japan'),
    ('NZD/JPY', 'New Zealand', 'Japan'),
    ('EUR/AUD', 'Euro Area', 'Australia'),
    ('EUR/CAD', 'Euro Area', 'Canada'),
    ('EUR/NZD', 'Euro Area', 'New Zealand'),
    ('GBP/AUD', 'United Kingdom', 'Australia'),
    ('GBP/CAD', 'United Kingdom', 'Canada'),
    ('GBP/CHF', 'United Kingdom', 'Switzerland'),
    ('GBP/NZD', 'United Kingdom', 'New Zealand'),
    ('AUD/CAD', 'Australia', 'Canada'),
    ('AUD/CHF', 'Australia', 'Switzerland'),
    ('AUD/NZD', 'Australia', 'New Zealand'),
    ('CAD/CHF', 'Canada', 'Switzerland'),
    ('NZD/CAD', 'New Zealand', 'Canada'),
    ('NZD/CHF', 'New Zealand', 'Switzerland'),
]

# Rating lookup grid from EXCEL8EXAMPLE.xlsx (Cols BK & BL)
BK_SPREAD = [-2000 + 200*i for i in range(21)]
BL_RATING = [10 - i for i in range(21)]

def rate_fx_spread(spread):
    if spread is None or pd.isna(spread):
        return 0
    clamped = max(-2000.0, min(2000.0, float(spread)))
    idx = min(range(len(BK_SPREAD)), key=lambda i: abs(BK_SPREAD[i] - clamped))
    return int(BL_RATING[idx])

def build_fx_dataset(start_year=2022):
    """Fetch official observations and keep the existing differential/rating math.

    A transport/parse failure is an error, never a successful Excel refresh.
    The calendar expands automatically; releases are determined by IMF values.
    """
    from imf_fx_reserves import fetch_observations

    country_raw, metadata = fetch_observations(start_year)
    last_month = datetime.date.today().strftime('%Y-%m')
    date_strs = pd.period_range(f'{start_year}-01', last_month, freq='M').astype(str).tolist()
    df_raw = pd.DataFrame({name: pd.Series(points, dtype=float) for name, points in country_raw.items()}).reindex(date_strs)
    df_raw.attrs['imf_refresh'] = metadata
    df_avg12 = df_raw.diff().rolling(window=12, min_periods=12).mean()
    pair_results = {}
    for pair_name, base_c, quote_c in PAIRS:
        if base_c not in df_avg12 or quote_c not in df_avg12:
            continue
        spreads = df_avg12[base_c] - df_avg12[quote_c]
        pair_results[pair_name] = {
            month: {
                'base_flow': float(df_avg12.at[month, base_c]) if pd.notna(df_avg12.at[month, base_c]) else None,
                'quote_flow': float(df_avg12.at[month, quote_c]) if pd.notna(df_avg12.at[month, quote_c]) else None,
                'spread': float(spreads.at[month]) if pd.notna(spreads.at[month]) else None,
                'rating': rate_fx_spread(spreads.at[month]),
            }
            for month in date_strs if month >= f'{start_year + 1}-01'
        }
    country_flow = {
        name: {month: float(value) if pd.notna(value) else None for month, value in column.items()}
        for name, column in df_avg12.items()
    }
    return df_raw, df_avg12, pair_results, country_raw, country_flow

if __name__ == "__main__":
    df_raw, df_avg12, pair_res, c_raw, c_flow = build_fx_dataset()
    print("\nSAMPLE FX DIFFERENTIAL & RATINGS FOR 2026-06:")
    for p in ['EUR/USD', 'USD/JPY', 'GBP/USD', 'AUD/USD', 'USD/CAD', 'USD/CHF']:
        pt = pair_res[p]['2026-06']
        print(f"{p:<9}: Base Flow={pt['base_flow']:+9.2f}M | Quote Flow={pt['quote_flow']:+9.2f}M | Spread={pt['spread']:+9.2f}M | Rating={pt['rating']:+3d}")

    print("\nSAMPLE FX DIFFERENTIAL & RATINGS FOR 2026-09:")
    for p in ['EUR/USD', 'USD/JPY', 'GBP/USD', 'AUD/USD', 'USD/CAD', 'USD/CHF']:
        pt = pair_res[p]['2026-09']
        print(f"{p:<9}: Base Flow={pt['base_flow']:+9.2f}M | Quote Flow={pt['quote_flow']:+9.2f}M | Spread={pt['spread']:+9.2f}M | Rating={pt['rating']:+3d}")
