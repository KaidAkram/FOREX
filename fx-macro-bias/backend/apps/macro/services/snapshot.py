"""Immutable read model: only public-source observations, never operator settings."""
import hashlib
import json
from django.utils import timezone
from django.db import transaction
from apps.macro.models import MacroDataPoint, Differential, FinalScore, SystemSetting

LABELS = {'gdp': 'GDP', 'cpi': 'CPI', 'interest_rate': 'Interest Rate', 'ca_gdp': 'Current Account', 'fx_reserves': 'FX Reserves', 'equity': 'Equity'}

@transaction.atomic
def publish_snapshot():
    data = {name: {} for name in LABELS.values()}
    cells = {name: {} for name in LABELS.values()}
    manual = set(MacroDataPoint.objects.filter(is_active_value=True).exclude(status__in=['published', 'revised']).values_list('country_id', 'indicator_id', 'month'))
    for point in MacroDataPoint.objects.filter(is_active_value=True, status__in=['published', 'revised']).select_related('country', 'indicator'):
        label = LABELS.get(point.indicator.slug)
        if not label:
            continue
        country = 'USA' if point.country.iso_code == 'USD' else point.country.name
        month = point.month.strftime('%Y-%m')
        data[label].setdefault(country, {})[month] = point.value
        cells[label].setdefault(country, {})[month] = {'value': point.value, 'status': point.status, 'source': point.source}
    differentials, equity, scores = {}, {}, {}
    details_row = SystemSetting.objects.filter(key='equity_details').first()
    details = details_row.value if details_row else {}
    private_pair_months = set()
    for d in Differential.objects.select_related('pair', 'indicator', 'rating'):
        invalid = any(country in (d.pair.base_currency_id, d.pair.quote_currency_id) and indicator == d.indicator_id
                      and (month == d.month or (d.indicator.slug == 'fx_reserves' and 0 <= (d.month.year-month.year)*12+d.month.month-month.month <= 12))
                      for country, indicator, month in manual)
        if invalid:
            private_pair_months.add((d.pair_id, d.month))
            continue
        label = LABELS.get(d.indicator.slug)
        if not label:
            continue
        month = d.month.strftime('%Y-%m')
        rating = getattr(getattr(d, 'rating', None), 'rating_value', None)
        pt = {'base_value': d.base_value, 'quote_value': d.quote_value, 'difference': d.difference,
              'rating': rating, 'is_complete': d.is_complete}
        differentials.setdefault(d.pair.symbol, {}).setdefault(label, {})[month] = pt
        if d.indicator.slug == 'equity':
            equity.setdefault(d.pair.symbol, {})[month] = {**details.get(d.pair.symbol, {}).get(month, {}), 'change_index': d.base_value, 'change_synth': d.quote_value,
                                                        'final_change': d.difference, 'rating': rating}
    for score in FinalScore.objects.select_related('pair'):
        if (score.pair_id, score.month) in private_pair_months:
            continue
        scores.setdefault(score.pair.symbol, {})[score.month.strftime('%Y-%m')] = {
            'score': score.final_score * 10 if score.final_score is not None else None,
            'is_complete': score.is_complete, 'n_complete': score.n_complete}
    freshness = {}
    for row in SystemSetting.objects.filter(key__startswith='feed:'):
        # No credential or internal exception details in the public read model.
        freshness[row.key] = {k: row.value.get(k) for k in ('status', 'last_success_at', 'last_attempt_at', 'latest_period', 'source')}
    for key in ('fx_reserves_refresh', 'equity_refresh'):
        row = SystemSetting.objects.filter(key=key).first()
        if row:
            freshness[key] = {k: row.value.get(k) for k in ('status', 'last_success_at', 'latest_by_country', 'latest_month')}
    payload = {'data': data, 'cells': cells, 'differentials': differentials, 'equity': equity, 'scores': scores, 'freshness': freshness}
    payload['version'] = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    payload['published_at'] = timezone.now().isoformat()
    SystemSetting.objects.update_or_create(key='public_macro_snapshot', defaults={'value': payload})
    SystemSetting.objects.update_or_create(key='public_macro_version', defaults={'value': {'version': payload['version']}})
    return payload
