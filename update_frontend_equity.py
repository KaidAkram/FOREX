import json
import re

def main():
    print("--- 1. Loading equity_frontend.json ---")
    with open('equity_frontend.json', 'r') as f:
        eq_data = json.load(f)

    countries = eq_data['countries']
    pairs = eq_data['pairs']

    # --- 2. Update macroDataset.json ---
    print("--- 2. Updating macroDataset.json ---")
    json_path = 'fx-macro-bias/frontend/src/data/macroDataset.json'
    with open(json_path, 'r') as f:
        fe_json = json.load(f)

    fe_json['Equity'] = countries
    fe_json['PairEquity'] = pairs

    with open(json_path, 'w') as f:
        json.dump(fe_json, f, indent=2)
    print("   -> macroDataset.json updated!")

    # --- 3. Update macroDataset.ts ---
    print("--- 3. Updating macroDataset.ts ---")
    ts_path = 'fx-macro-bias/frontend/src/data/macroDataset.ts'
    with open(ts_path, 'r', encoding='utf-8') as f:
        ts_content = f.read()

    # Format country Equity JSON
    country_eq_ts = "  \"Equity\": " + json.dumps(countries, indent=4).replace("\n", "\n  ")

    # Replace "Equity": { ... } inside MASTER_MACRO_DATABASE
    # Find start of "Equity": { and end before };
    pattern = r'  "Equity":\s*\{[\s\S]*?\n  \}'
    if re.search(pattern, ts_content):
        ts_content = re.sub(pattern, country_eq_ts, ts_content, count=1)
        print("   -> Replaced MASTER_MACRO_DATABASE['Equity'] in macroDataset.ts")
    else:
        print("   [!] Could not regex match 'Equity' block in macroDataset.ts")

    # Format PAIR_EQUITY_DATA constant
    pair_eq_ts = "\nexport const PAIR_EQUITY_DATA: Record<string, Record<string, { synth_ath: number; synth_cur: number; change_synth: number; base_ath: number; base_cur: number; change_index: number; final_change: number; rating: number; }>> = " + json.dumps(pairs, indent=2) + ";\n"

    # Insert PAIR_EQUITY_DATA right before getCombinedDifferentialData
    target_str = "export function getCombinedDifferentialData(pairName: string, indicator: string, year: number) {"
    if "export const PAIR_EQUITY_DATA" not in ts_content:
        ts_content = ts_content.replace(target_str, pair_eq_ts + "\n" + target_str)
        print("   -> Inserted PAIR_EQUITY_DATA constant")

    # Update getCombinedDifferentialData to handle Equity explicitly
    # Check if indicator === "Equity" branch exists in getCombinedDifferentialData
    eq_branch = """    } else if (indicator === "Equity") {
      const pairData = (PAIR_EQUITY_DATA as any)[pair.name] || (PAIR_EQUITY_DATA as any)[pairName] || {};
      const pt = pairData[m];
      if (pt) {
        diffNum = parseFloat((pt.final_change * 100).toFixed(2));
        baseVal = (pt.change_synth * 100).toFixed(2) + "%";
        quoteVal = (pt.change_index * 100).toFixed(2) + "%";
        diff = (diffNum > 0 ? "+" : "") + diffNum.toFixed(2) + "%";
        rating = pt.rating;
        rule = `Equity Return Spread: ${diff}`;
        regime = rating >= 7 ? "Strong Bullish Bias" : rating > 0 ? "Moderate Bullish Bias" : rating === 0 ? "Neutral / Balanced" : rating <= -7 ? "Strong Bearish Bias" : "Moderate Bearish Bias";
      } else {
        baseVal = "0.00%";
        quoteVal = "0.00%";
        diff = "+0.00%";
        diffNum = 0;
        rating = 0;
        rule = "Neutral";
        regime = "Neutral / Balanced";
      }
    } else {"""

    # Replace "} else {" right after Interest Rate branch
    ir_branch_end = """      } else {
        rating = 0;
        rule = "-1.0% to 1.0%";
        regime = "Neutral / Balanced";
      }
    } else {"""

    if ir_branch_end in ts_content:
        ts_content = ts_content.replace(
            ir_branch_end,
            """      } else {
        rating = 0;
        rule = "-1.0% to 1.0%";
        regime = "Neutral / Balanced";
      }
""" + eq_branch
        )
        print("   -> Added Equity branch to getCombinedDifferentialData")

    with open(ts_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)
    print("   -> Saved updated macroDataset.ts!")

if __name__ == '__main__':
    main()
