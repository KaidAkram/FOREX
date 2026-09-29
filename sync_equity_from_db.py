import sqlite3
import json
import re

def sync_from_db():
    print("--- 1. Reading from Django DB ---")
    conn = sqlite3.connect('fx-macro-bias/backend/db.sqlite3')
    cur = conn.cursor()

    # Get country equity data points
    cur.execute("""
        SELECT c.name, d.month, d.value
        FROM macro_macrodatapoint d
        JOIN macro_country c ON d.country_id = c.id
        JOIN macro_macroindicator i ON d.indicator_id = i.id
        WHERE i.slug = 'equity'
        ORDER BY c.name, d.month
    """)
    fe_countries = {}
    for c_name, mo, val in cur.fetchall():
        ym = mo[:7]
        fe_countries.setdefault(c_name, {})[ym] = val

    # Get pair differentials and ratings
    cur.execute("""
        SELECT p.symbol, d.month, d.base_value, d.quote_value, d.difference, r.rating_value
        FROM macro_differential d
        JOIN macro_fxpair p ON d.pair_id = p.id
        JOIN macro_macroindicator i ON d.indicator_id = i.id
        LEFT JOIN macro_rating r ON r.differential_id = d.id
        WHERE i.slug = 'equity'
        ORDER BY p.symbol, d.month
    """)
    fe_pairs = {}
    for sym, mo, base_v, quote_v, diff_v, rat_v in cur.fetchall():
        ym = mo[:7]
        pt = {
            'synth_ath': 0.0,
            'synth_cur': 0.0,
            'change_synth': float(quote_v) if quote_v is not None else 0.0,
            'base_ath': 0.0,
            'base_cur': 0.0,
            'change_index': float(base_v) if base_v is not None else 0.0,
            'final_change': float(diff_v) if diff_v is not None else 0.0,
            'rating': int(rat_v) if rat_v is not None else 0,
        }
        fe_pairs.setdefault(sym.replace('/', ' '), {})[ym] = pt
        fe_pairs.setdefault(sym, {})[ym] = pt

    # Save to equity_frontend.json
    with open('equity_frontend.json', 'w', encoding='utf-8') as f:
        json.dump({'pairs': fe_pairs, 'countries': fe_countries}, f, indent=2)

    # Save to macroDataset.json
    json_path = 'fx-macro-bias/frontend/src/data/macroDataset.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        fe_json = json.load(f)
    fe_json['Equity'] = fe_countries
    fe_json['PairEquity'] = fe_pairs
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(fe_json, f, indent=2)

    # Save to macroDataset.ts
    ts_path = 'fx-macro-bias/frontend/src/data/macroDataset.ts'
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

    print("[SUCCESS] Fully synchronized DB to Frontend datasets!")

if __name__ == "__main__":
    sync_from_db()
