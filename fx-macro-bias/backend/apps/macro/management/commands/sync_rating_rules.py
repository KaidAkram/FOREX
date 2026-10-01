import os
import sys
import json
import re

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.macro.models import MacroIndicator, RatingRule, RuleVersion, Differential, Rating, FXPair, FinalScore
from apps.macro.services.calculator import (
    GDP_GRID_X, GDP_GRID_Y,
    CA_GRID_X, CA_GRID_Y,
    FX_GRID_X, FX_GRID_Y,
    IR_GRID_X, IR_GRID_Y,
    CPI_GRID_X, CPI_GRID_Y,
    EQ_GRID_X, EQ_GRID_Y,
    apply_rating_rule,
    calculate_final_score,
)

def generate_intervals(grid_x, grid_y):
    sorted_pairs = sorted(zip(grid_x, grid_y), key=lambda p: p[0])
    xs = [p[0] for p in sorted_pairs]
    ys = [p[1] for p in sorted_pairs]
    n = len(xs)
    intervals = []
    for i in range(n):
        lo = None if i == 0 else round((xs[i-1] + xs[i]) / 2.0, 4)
        hi = None if i == n - 1 else round((xs[i] + xs[i+1]) / 2.0, 4)
        intervals.append((lo, hi, ys[i]))
    return intervals

class Command(BaseCommand):
    help = "Sync official rating rules from rating rule.docx, recalculate all ratings & scores, and export to frontend."

    def handle(self, *args, **options):
        self.stdout.write("=" * 80)
        self.stdout.write("SYNCING RATING RULES FROM rating rule.docx TO DJANGO DATABASE")
        self.stdout.write("=" * 80)

        specs = [
            ('gdp', "GDP Growth (Annual %)", GDP_GRID_X, GDP_GRID_Y),
            ('ca_gdp', "Current Account / GDP (%)", CA_GRID_X, CA_GRID_Y),
            ('fx_reserves', "FX Reserves Excl. Gold (USD M)", FX_GRID_X, FX_GRID_Y),
            ('interest_rate', "Interest Rate (%)", IR_GRID_X, IR_GRID_Y),
            ('cpi', "CPI Inflation (YoY %)", CPI_GRID_X, CPI_GRID_Y),
            ('equity', "Equity Index Return (%)", EQ_GRID_X, EQ_GRID_Y),
        ]

        rules_to_create = []
        with transaction.atomic():
            for slug, name, gx, gy in specs:
                indicator, _ = MacroIndicator.objects.get_or_create(
                    slug=slug,
                    defaults={"name": name, "is_active": True}
                )

                # Delete existing rules
                RatingRule.objects.filter(indicator=indicator).delete()

                latest_version = RuleVersion.objects.filter(indicator=indicator).order_by("-version_number").first()
                new_v_num = (latest_version.version_number + 1) if latest_version else 1
                version = RuleVersion.objects.create(
                    indicator=indicator,
                    version_number=new_v_num,
                    notes="Official scales from rating rule.docx",
                    created_by="system"
                )

                intervals = generate_intervals(gx, gy)
                for lo, hi, rat in intervals:
                    rules_to_create.append(
                        RatingRule(
                            indicator=indicator,
                            version=version,
                            min_diff=lo,
                            max_diff=hi,
                            rating=rat,
                            is_active=True
                        )
                    )
                self.stdout.write(f"  [OK] {slug:<15}: Prepared {len(intervals)} official RatingRule entries (v{new_v_num})")

            # Bulk create all rules to avoid firing post_save signals 134 times
            RatingRule.objects.bulk_create(rules_to_create)
            self.stdout.write(f"  [OK] Bulk inserted {len(rules_to_create)} RatingRule entries.")

        # Re-calculate all ratings for all differentials in the database
        self.stdout.write("\n--- Recalculating ratings for all Differentials across all indicators ---")
        all_diffs = list(Differential.objects.all().select_related("indicator"))
        existing_ratings = {r.differential_id: r for r in Rating.objects.all()}

        ratings_to_update = []
        ratings_to_create = []

        for diff in all_diffs:
            if diff.difference is None:
                continue
            rating_val, _ = apply_rating_rule(diff.difference, diff.indicator_id)
            if diff.pk in existing_ratings:
                r_obj = existing_ratings[diff.pk]
                r_obj.rating_value = rating_val
                ratings_to_update.append(r_obj)
            else:
                ratings_to_create.append(
                    Rating(differential=diff, rating_value=rating_val)
                )

        with transaction.atomic():
            if ratings_to_update:
                Rating.objects.bulk_update(ratings_to_update, ['rating_value'], batch_size=1000)
            if ratings_to_create:
                Rating.objects.bulk_create(ratings_to_create, batch_size=1000)

        self.stdout.write(f"  [OK] Updated {len(ratings_to_update)} existing ratings and created {len(ratings_to_create)} new ratings.")

        # Re-calculate composite FinalScore matrix
        self.stdout.write("\n--- Recalculating FinalScore composite matrix & macro bias ---")
        all_months = [f"{y}-{m:02d}-01" for y in range(2023, 2027) for m in range(1, 13)]
        active_pairs = list(FXPair.objects.filter(is_active=True))
        count_scores = 0

        with transaction.atomic():
            for p in active_pairs:
                for mo in all_months:
                    calculate_final_score(p.pk, mo)
                    count_scores += 1
        self.stdout.write(f"  [OK] Recalculated {count_scores} composite final scores and biases.")

        # Auto-export to Frontend datasets
        self.stdout.write("\n--- Exporting synchronized datasets to frontend ---")
        self.export_to_frontend()
        self.stdout.write("[SUCCESS] All rating rules synced, ratings recalculated, and datasets exported!")

    def export_to_frontend(self):
        frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..', 'frontend', 'src', 'data'))
        json_path = os.path.join(frontend_dir, 'macroDataset.json')
        ts_path = os.path.join(frontend_dir, 'macroDataset.ts')

        if os.path.exists(json_path):
            with open(json_path, 'r', encoding='utf-8') as f:
                full_data = json.load(f)
        else:
            full_data = {}

        active_pairs = list(FXPair.objects.filter(is_active=True))
        all_months = [f"{y}-{m:02d}" for y in range(2023, 2027) for m in range(1, 13)]

        # Update PairScores
        pair_scores = full_data.setdefault("PairScores", {})
        for p in active_pairs:
            sym = p.symbol
            pair_scores.setdefault(sym, {})
            for ym in all_months:
                mo_date = f"{ym}-01"
                fs = FinalScore.objects.filter(pair=p, month=mo_date).first()
                if fs and fs.final_score is not None:
                    pair_scores[sym][ym] = {
                        "total_score": round(fs.final_score, 2),
                        "bias": fs.bias
                    }

        # Update ComparativeMatrix
        comp_matrix = full_data.setdefault("ComparativeMatrix", {})
        for p in active_pairs:
            sym = p.symbol
            p_dict = comp_matrix.setdefault(sym, {})
            for ym in all_months:
                mo_date = f"{ym}-01"
                mo_dict = p_dict.setdefault(ym, {})
                diffs = Differential.objects.filter(pair=p, month=mo_date).select_related("indicator", "rating")
                for d in diffs:
                    if hasattr(d, 'rating') and d.rating and d.rating.rating_value is not None:
                        mo_dict[d.indicator.slug] = d.rating.rating_value

        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(full_data, f, indent=2)
        self.stdout.write(f"  -> Successfully updated {json_path}")

        if os.path.exists(ts_path):
            with open(ts_path, 'r', encoding='utf-8') as f:
                ts_content = f.read()

            match = re.search(r'export const MACRO_DATASET: MacroDataset = ({[\s\S]*});', ts_content)
            if match:
                new_ts_content = ts_content[:match.start(1)] + json.dumps(full_data, indent=2) + ts_content[match.end(1):]
                with open(ts_path, 'w', encoding='utf-8') as f:
                    f.write(new_ts_content)
                self.stdout.write(f"  -> Successfully updated {ts_path}")
