from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.macro.services.ingestion import sync_indicator
from apps.macro.services.calculator import recalculate_full_matrix
from apps.macro.services.snapshot import publish_snapshot

class Command(BaseCommand):
    help = 'Refresh gdp with validated, non-destructive ingestion'
    def handle(self, *args, **options):
        result = sync_indicator('gdp')
        with transaction.atomic():
            recalculate_full_matrix()
            publish_snapshot()
        if result['errors']:
            raise CommandError('; '.join(result['errors']))
        self.stdout.write(self.style.SUCCESS(str(result['points']) + ' observations changed'))
