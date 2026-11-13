# Render deployment and operations

This change is prepared locally. Applying render.yaml creates paid web, worker, and PostgreSQL services. Review existing service names and database before applying it. Never replace a live database without a backup and a verified import.

## Existing database

1. Take a Render PostgreSQL backup, or export the current SQLite database from its running service before a redeploy. SQLite on an ephemeral service can disappear on restart.
2. Retain the existing persistent DATABASE_URL when one already exists. Point both web backend and ingestion worker at that same database. If migrating from SQLite, import its data into PostgreSQL and verify row counts and administrative accounts before cutover.
3. Run backend migrations and bootstrap_macro --continuous. Bootstrap adds missing country, indicator and pair definitions; it does not import bundled observations.
4. Start the dedicated ingestion worker. Remove any old scheduled ingestion jobs to avoid duplicate direct command runs.
5. Deploy backend and frontend, then wait for the first public snapshot before directing clients to the new frontend.

## Required environment

Backend: DJANGO_SETTINGS_MODULE=config.settings.production, persistent DATABASE_URL, strong SECRET_KEY, and ALLOWED_HOSTS including the public domain and actual Render internal backend hostname. The Blueprint supplies INTERNAL_SERVICE_HOST automatically. Frontend: NEXT_PUBLIC_API_URL=/api and BACKEND_INTERNAL_URL from the backend hostport. Worker: same DATABASE_URL and settings module; set ALERT_WEBHOOK_URL to the operator's approved webhook if alerts are wanted.

Production admin login now uses a real Django staff account. Create one with python manage.py createsuperuser in the backend Render shell if none exists. Browser demo credentials cannot authorize production API changes.

## Verification

Run python -B scripts/verify_autonomous.py locally for a disposable database copy and live feeds. It never writes the Render database or sends alerts. Run Django pipeline tests, the Node frontend tests, Python source tests, and npm run build before release.

GET /api/health checks web/database liveness. Monitor GET /api/ready separately: it reports unhealthy when the worker is absent, the snapshot is over 20 minutes old, or feeds are degraded. Do not use readiness as the web process restart health check: publisher outages should not restart the web application.

GET /api/live/snapshot returns an immutable public-data snapshot and ETag. Clients poll every 15 seconds, retain the last valid version on errors, and display delayed-source warnings. Initial checks are every five minutes; actual update delay also includes feed publication lag and job duration. The observed full-history live verification takes several minutes. This is not a zero-latency release guarantee.

The configured IMF Euro Area reserve series was stale during verification. It remains explicitly degraded; do not replace it with a different definition or label it current without validating an equivalent official series.

## Rollback

Keep the database backup and previous Render deploy. Roll back application code if needed; do not delete newly ingested official observations. New migrations only add the worker lease and synchronize status choices. Restore a database backup only after checking whether doing so would discard newer data.
