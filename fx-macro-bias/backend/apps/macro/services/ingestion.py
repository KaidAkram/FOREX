from apps.macro.services.fencing import check_lease
"""Validated source adapters. Network work never holds a database transaction."""
import base64
import gzip
import json
import math
import re
import time
import urllib.parse
import urllib.request
from datetime import date

from django.db import transaction
from django.utils import timezone
from apps.macro.models import Country, MacroIndicator, MacroDataPoint, SystemSetting, AuditLog
from apps.macro.signals import disable_macro_signals

CATEGORIES = {'gdp': 'gdp-growth-annual', 'cpi': 'inflation-cpi', 'interest_rate': 'interest-rate'}

def read_url(url, *, headers=None, timeout=20, retries=2):
    for attempt in range(retries + 1):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', **(headers or {})})
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return response.read()
        except (OSError, ValueError):
            if attempt == retries:
                raise
            time.sleep(min(2 ** attempt, 8))

def fetch_te(slug, category, **options):
    url = f'https://tradingeconomics.com/{slug}/{category}'
    html = read_url(url, **options).decode('utf-8')
    symbol = re.search(r"TESymbol\s*=\s*'([^']+)'", html)
    token = re.search(r"TEChartsToken\s*=\s*'([^']+)'", html)
    if not symbol or not token:
        raise ValueError('Trading Economics response no longer contains chart credentials')
    endpoint = 'https://d3ii0wo49og5mi.cloudfront.net/economics/' + urllib.parse.quote(symbol[1].lower()) + '?span=10y'
    raw = json.loads(read_url(endpoint, headers={'x-api-key': token[1], 'Referer': url}, **options))
    key = b'tradingeconomics-charts-core-api-key'
    decoded = bytes(b ^ key[i % len(key)] for i, b in enumerate(base64.b64decode(raw)))
    points = json.loads(gzip.decompress(decoded))[0]['series'][0]['serie']['data']
    return {p[3][:10]: p[0] for p in points}, url

def fetch_ons_gdp(**options):
    # IHYR is quarterly year-on-year real GDP, not annual-calendar-year IHYP.
    url = 'https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ihyr/pn2/data'
    payload = json.loads(read_url(url, **options))
    points = {}
    for item in payload.get('quarters', []):
        match = re.fullmatch(r'(\d{4}) Q([1-4])', item['date'])
        if match and item.get('value') not in (None, ''):
            points[f'{match[1]}-{int(match[2])*3:02d}-01'] = float(item['value'])
    if not points:
        raise ValueError('ONS returned no quarterly GDP observations')
    return points, url

def fetch_oecd(code, **options):
    # OECD aggregate EA is the configured, continuous euro-area series.
    code = 'EA' if code in ('EA20', 'EA') else code
    url = f'https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_BOP@DF_BOP,1.0/{code}..CA...Q.PT_B1GQ.Y?startPeriod=2023-Q1'
    raw = json.loads(read_url(url, headers={'Accept': 'application/vnd.sdmx.data+json;version=1.0.0-wd, application/json'}, **options))['data']
    dimensions = raw['structure']['dimensions']['observation']
    position = next(i for i, d in enumerate(dimensions) if d['id'] == 'TIME_PERIOD')
    periods = dimensions[position]['values']
    series = raw['dataSets'][0].get('series', {})
    if len(series) != 1:
        raise ValueError('Expected exactly one OECD current-account/GDP series')
    points = {}
    for item in series.values():
        for key, value in item.get('observations', {}).items():
            if value[0] is None:
                continue
            period = periods[int(key.split(':')[position])]['id']
            year, quarter = period.split('-Q')
            points[f'{year}-{int(quarter)*3:02d}-01'] = value[0]
    return points, url

def normalize(points, *, quarterly=False, today=None):
    today = today or date.today()
    result = {}
    for period, raw in points.items():
        dt = date.fromisoformat(period)
        value = float(raw)
        if not math.isfinite(value):
            raise ValueError('Non-finite source observation')
        if dt > today or dt.year < 2023:
            continue
        if quarterly and dt.month not in (3, 6, 9, 12):
            raise ValueError('Unexpected quarterly reference date')
        months = range(dt.month - 2, dt.month + 1) if quarterly else [dt.month]
        for month in months:
            result[date(dt.year, month, 1)] = value
    if not result:
        raise ValueError('Source returned no usable observations')
    return result

def sync_indicator(slug):
    indicator = MacroIndicator.objects.get(slug=slug)
    cfg = SystemSetting.objects.filter(key='scraper_settings').first()
    cfg = cfg.value if cfg else {}
    timeout_sec = int(cfg.get('timeoutSec', 35 if slug == 'ca_gdp' else 20))
    options = {'timeout': max(10, min(60, timeout_sec)),
               'retries': max(0, min(3, int(cfg.get('retryAttempts', 2))))}
    results, saved, errors = {}, 0, []
    for country in Country.objects.filter(is_active=True):
        key = f'feed:{slug}:{country.iso_code}'
        previous = SystemSetting.objects.filter(key=key).first()
        metadata = dict(previous.value) if previous else {}
        try:
            if slug == 'ca_gdp':
                points, source = fetch_oecd(country.oecd_country_code, **options)
            elif slug == 'gdp' and country.iso_code == 'GBP':
                try:
                    points, source = fetch_ons_gdp(**options)
                except Exception:
                    points, source = fetch_te(country.trading_economics_slug, CATEGORIES[slug], **options)
            else:
                points, source = fetch_te(country.trading_economics_slug, CATEGORIES[slug], **options)
            values = normalize(points, quarterly=slug in ('gdp', 'ca_gdp'))
            changed = 0
            with transaction.atomic(), disable_macro_signals():

                check_lease()
                existing = {p.month: p for p in MacroDataPoint.objects.filter(country=country, indicator=indicator, is_active_value=True)}
                for month, value in values.items():
                    old = existing.get(month)
                    if old and old.value == value and old.status in ('published', 'revised'):
                        continue
                    revised = bool(old and old.status in ('published', 'revised'))
                    MacroDataPoint.objects.update_or_create(country=country, indicator=indicator, month=month, is_active_value=True,
                        defaults={'value': value, 'status': 'revised' if revised else 'published', 'source': source})
                    AuditLog.objects.create(entity_type='Observation', entity_id=f'{slug}:{country.iso_code}:{month}',
                        action='revised' if revised else 'ingested', before_value={'value': old.value} if old else None,
                        after_value={'value': value, 'source': source}, user='worker')
                    changed += 1
            latest = max(values)
            # Conservative age guard, never a guessed official release date.
            age = (date.today() - latest).days
            limit = 200 if slug in ('gdp', 'ca_gdp') or (slug == 'cpi' and country.iso_code in ('AUD', 'NZD')) else 75
            feed_status = 'STALE' if age > limit else 'SUCCESS'
            if feed_status == 'STALE':
                errors.append(f'{country.iso_code}: source observation is {age} days old')
            metadata.update(status=feed_status, last_success_at=timezone.now().isoformat(), latest_period=latest.isoformat()[:7],
                            source=source, points_changed=changed, error=None)
            saved += changed
        except Exception as exc:
            errors.append(f'{country.iso_code}: {type(exc).__name__}: {exc}')
            metadata.update(status='ERROR', error=str(exc))
        metadata['last_attempt_at'] = timezone.now().isoformat()
        SystemSetting.objects.update_or_create(key=key, defaults={'value': metadata})
        results[country.iso_code] = metadata
    if not results:
        errors.append('No active countries configured')
    return {'status': 'PARTIAL' if errors else 'SUCCESS', 'points': saved, 'countries': results, 'errors': errors}
