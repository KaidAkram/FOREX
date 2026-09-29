import yfinance as yf
import pandas as pd
import numpy as np
import datetime

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
    'USD JPY': ('USD', 'JPY=X'),
    'USD CHF': ('USD', 'CHF=X'),
    'USD CAD': ('USD', 'CAD=X'),
    'EUR USD': ('EUR', 'EURUSD=X'),
    'EUR JPY': ('EUR', 'EURJPY=X'),
    'EUR CHF': ('EUR', 'EURCHF=X'),
    'EUR GBP': ('EUR', 'EURGBP=X'),
    'EUR CAD': ('EUR', 'EURCAD=X'),
    'EUR AUD': ('EUR', 'EURAUD=X'),
    'EUR NZD': ('EUR', 'EURNZD=X'),
    'GBP USD': ('GBP', 'GBPUSD=X'),
    'GBP JPY': ('GBP', 'GBPJPY=X'),
    'GBP CHF': ('GBP', 'GBPCHF=X'),
    'GBP CAD': ('GBP', 'GBPCAD=X'),
    'GBP AUD': ('GBP', 'GBPAUD=X'),
    'GBP NZD': ('GBP', 'GBPNZD=X'),
    'CHF JPY': ('CHF', 'CHFJPY=X'),
    'AUD USD': ('AUD', 'AUDUSD=X'),
    'AUD CHF': ('AUD', 'AUDCHF=X'),
    'AUD JPY': ('AUD', 'AUDJPY=X'),
    'AUD NZD': ('AUD', 'AUDNZD=X'),
    'AUD CAD': ('AUD', 'AUDCAD=X'),
    'CAD JPY': ('CAD', 'CADJPY=X'),
    'NZD USD': ('NZD', 'NZDUSD=X'),
}

BJ_GRID = [0.25, 0.20, 0.18, 0.16, 0.14, 0.12, 0.10, 0.08, 0.06, 0.04, 0.02, 0.00,
           -0.02, -0.04, -0.06, -0.08, -0.10, -0.12, -0.14, -0.16, -0.18, -0.20, -0.25]
BK_GRID = [2, 3, 5, 7, 9, 10, 9, 7, 5, 3, 2, 0,
           -2, -3, -5, -7, -9, -10, -9, -7, -5, -3, -2]

def rate_equity(diff):
    if pd.isna(diff):
        return 0
    clamped = max(-0.25, min(0.25, float(diff)))
    idx = min(range(len(BJ_GRID)), key=lambda i: abs(BJ_GRID[i] - clamped))
    return int(BK_GRID[idx])

def build_equity_dataset():
    print("Fetching historical monthly data...")
    index_dfs = {}
    for code, ticker in INDEX_TICKERS.items():
        df = yf.Ticker(ticker).history(start='2000-01-01', interval='1mo')
        df.index = df.index.strftime('%Y-%m')
        df['is_green'] = df['Close'] >= df['Open']
        index_dfs[code] = df

    fx_dfs = {}
    for pair, (base, fx_ticker) in FX_TICKERS.items():
        df = yf.Ticker(fx_ticker).history(start='2000-01-01', interval='1mo')
        df.index = df.index.strftime('%Y-%m')
        fx_dfs[pair] = df

    # Months to evaluate
    all_months = []
    for y in range(2023, 2027):
        for m in range(1, 13):
            all_months.append(f"{y}-{m:02d}")

    # Result structure per pair
    results = {}
    for pair, (base_code, fx_ticker) in FX_TICKERS.items():
        i_df = index_dfs[base_code]
        f_df = fx_dfs[pair]

        common_idx = i_df.index.intersection(f_df.index).sort_values()
        o_s = f_df.loc[common_idx, 'Open'] * i_df.loc[common_idx, 'Open']
        c_s = f_df.loc[common_idx, 'Close'] * i_df.loc[common_idx, 'Close']
        h_s = f_df.loc[common_idx, 'High'] * i_df.loc[common_idx, 'High']
        is_green_s = c_s >= o_s

        pair_data = {}
        last_valid_data = None

        for ym in all_months:
            if ym in common_idx:
                past_idx = common_idx[common_idx <= ym]

                # Base index running ATH on green candle
                past_i_green = i_df.loc[past_idx][i_df.loc[past_idx, 'is_green']]
                base_ath = float(past_i_green['High'].max())
                base_cur = float(i_df.loc[ym, 'Close'])
                change_index = (base_cur - base_ath) / base_ath

                # Synthetic running ATH on green candle
                past_s_green = past_idx[is_green_s.loc[past_idx]]
                synth_ath = float(h_s.loc[past_s_green].max())
                synth_cur = float(c_s.loc[ym])
                change_synth = (synth_cur - synth_ath) / synth_ath

                # Final Equity Change & Rating: %a (Index) - %b (Synthetic)
                final_change = change_index - change_synth
                rating = rate_equity(final_change)

                pt = {
                    'synth_ath': synth_ath,
                    'synth_cur': synth_cur,
                    'change_synth': change_synth,
                    'base_ath': base_ath,
                    'base_cur': base_cur,
                    'change_index': change_index,
                    'final_change': final_change,
                    'rating': rating,
                }
                pair_data[ym] = pt
                last_valid_data = pt
            else:
                # Carry forward latest available data for future months (e.g. 2026-10..12)
                if last_valid_data:
                    pair_data[ym] = dict(last_valid_data)

        results[pair] = pair_data

    # Also compute Country-Level Index Change vs ATH
    country_index_map = {
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

    country_results = {}
    for c_name, code in country_index_map.items():
        i_df = index_dfs[code]
        c_series = {}
        last_val = None
        for ym in all_months:
            if ym in i_df.index:
                past_idx = i_df.index[i_df.index <= ym]
                past_green = i_df.loc[past_idx][i_df.loc[past_idx, 'is_green']]
                ath = float(past_green['High'].max())
                cur = float(i_df.loc[ym, 'Close'])
                chg = (cur - ath) / ath
                val = round(chg * 100, 4) # percentage
                c_series[ym] = val
                last_val = val
            elif last_val is not None:
                c_series[ym] = last_val
        country_results[c_name] = c_series

    return results, country_results

if __name__ == "__main__":
    res, c_res = build_equity_dataset()
    import json
    with open('equity_frontend.json', 'w') as f:
        json.dump({'pairs': res, 'countries': c_res}, f, indent=2)
    print("   -> Successfully saved equity_frontend.json")

    print("\n--- SAMPLE CALCULATED RESULTS FOR 2026-06 ---")
    for p in ['EUR USD', 'USD JPY', 'GBP USD', 'USD CAD', 'AUD USD']:
        pt = res[p]['2026-06']
        print(f"{p:<10}: Base Index Chg={pt['change_index']*100:+.2f}% | Synth Chg={pt['change_synth']*100:+.2f}% | Final Chg={pt['final_change']*100:+.2f}% | Rating={pt['rating']:+d}")

    print("\n--- SAMPLE CALCULATED RESULTS FOR 2026-09 ---")
    for p in ['EUR USD', 'USD JPY', 'GBP USD', 'USD CAD', 'AUD USD']:
        pt = res[p]['2026-09']
        print(f"{p:<10}: Base Index Chg={pt['change_index']*100:+.2f}% | Synth Chg={pt['change_synth']*100:+.2f}% | Final Chg={pt['final_change']*100:+.2f}% | Rating={pt['rating']:+d}")
