from django.core.management.base import BaseCommand, CommandError
from apps.macro.services.equity import refresh_equity


class Command(BaseCommand):
    help = "Calculates pair-level Equity Indicator according to Equity Indicator2.pdf methodology."

    def add_arguments(self, parser):
        parser.add_argument("--start-year", type=int, default=2023)

    def handle(self, *args, **options):
        try:
            result = refresh_equity(start_year=options["start_year"])
        except Exception as error:
            raise CommandError("Live Equity refresh failed; existing records were preserved.") from error
        self.stdout.write(
            self.style.SUCCESS(
                f"Equity pair observations upserted: {result['points_saved']} (latest: {result.get('latest_month')})"
            )
        )
        if result["missing_pairs"]:
            self.stdout.write(
                self.style.WARNING("No Equity observations for pairs: " + ", ".join(result["missing_pairs"]))
            )
