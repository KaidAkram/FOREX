"""Create reference dimensions without importing stale observations or deleting user data."""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.macro.models import Country, MacroIndicator, FXPair, SystemSetting
from apps.macro.management.commands.seed_macro_data import G10_COUNTRIES, INDICATORS

class Command(BaseCommand):
    help = 'Idempotent reference-data setup for a new production database'
    def add_arguments(self, parser):
        parser.add_argument("--continuous", action="store_true", help="Enable five-minute unattended updates")

    @transaction.atomic
    def handle(self, *args, **options):
        countries = {}
        for definition in G10_COUNTRIES:
            fields = dict(definition)
            iso = fields.pop('iso_code')
            if iso == 'EUR': fields['oecd_country_code'] = 'EA'
            countries[iso], _ = Country.objects.get_or_create(iso_code=iso, defaults=fields)
        for definition in INDICATORS:
            fields = dict(definition)
            slug = fields.pop('slug')
            MacroIndicator.objects.get_or_create(slug=slug, defaults=fields)
        # Same 28 crosses and two legacy aliases as the client.
        pairs = ['EUR/USD','EUR/GBP','EUR/JPY','EUR/CHF','EUR/CAD','EUR/AUD','EUR/NZD',
                 'GBP/USD','GBP/JPY','GBP/CHF','GBP/CAD','GBP/AUD','GBP/NZD',
                 'USD/JPY','USD/CHF','USD/CAD','USD/AUD','USD/NZD','CHF/JPY','CAD/JPY',
                 'AUD/JPY','NZD/JPY','CAD/CHF','AUD/CHF','NZD/CHF','AUD/CAD','NZD/CAD','AUD/NZD','AUD/USD','NZD/USD']
        for symbol in pairs:
            base, quote = symbol.split('/')
            FXPair.objects.get_or_create(symbol=symbol, defaults={'base_currency': countries[base], 'quote_currency': countries[quote]})
        SystemSetting.objects.get_or_create(key='scraper_settings', defaults={'value': {
            'cronPreset': '5minutes', 'cronActive': True, 'timezone': 'UTC', 'retryDelayMinutes': 5,
            'timeoutSec': 20, 'retryAttempts': 2}})
        if options.get('continuous'):
            row = SystemSetting.objects.get(key='scraper_settings')
            row.value = {**row.value, 'cronPreset': '5minutes', 'cronActive': True, 'retryDelayMinutes': 5, 'next_scheduled_run': None}
            row.save()
        self.stdout.write(self.style.SUCCESS('Reference dimensions ready; existing observations preserved.'))
