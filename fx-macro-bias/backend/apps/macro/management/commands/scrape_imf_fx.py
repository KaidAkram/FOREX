from django.core.management.base import BaseCommand, CommandError
from apps.macro.services.fx_reserves import refresh_fx_reserves


class Command(BaseCommand):
    help = "Upsert live IMF IL / RXF11FX_REVS / USD / monthly observations and recalculate."

    def add_arguments(self, parser):
        parser.add_argument("--start-year", type=int, default=2022)

    def handle(self, *args, **options):
        try:
            result = refresh_fx_reserves(start_year=options["start_year"])
        except Exception as error:
            raise CommandError("IMF refresh failed; existing records were preserved.") from error
        self.stdout.write(self.style.SUCCESS(f"Official observations upserted: {result['points_saved']}"))
        for country, month in sorted(result["latest_by_country"].items()):
            self.stdout.write(f"  {country}: {month}")
        if result["missing_countries"]:
            self.stdout.write(self.style.WARNING("No observations returned for: " + ", ".join(result["missing_countries"])))
