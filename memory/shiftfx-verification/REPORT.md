# ShiftFX production verification — 2026-11-14

## Verdict

**Production verification FAILED.** Local ingestion and the requested tests pass, but the live platform serves an empty macroeconomic snapshot. Successful unattended ingestion, live data integrity, and normal weak-ETag polling are not operational. No production mutations, manual refresh requests, restarts, or deployments were performed during this audit.

## Deployed versions and hosting

Authenticated Render dashboard inspection found:
- Frontend: `e33da1d`, Live, **Free**.
- Backend: `67fd4e8`, Live, **Free**. The `e33da1d` deployment **failed**, timing out waiting for `/api/health` on port 10000. The user-provided latest-deployed-backend assumption is incorrect.
- Dashboard warns that inactivity spins down both services and can delay requests by 50 seconds or more.
- Backend effective start command includes migrations, `bootstrap_macro --continuous`, then Gunicorn. Nevertheless, running backend logs show missing macro indicator definitions. Execution against the correct runtime database must be established; configured commands alone are insufficient evidence.
- Repository Blueprint provisions no PostgreSQL or dedicated worker. Production settings permit an ephemeral SQLite fallback. This audit did not inspect database credentials or prove the exact live database engine. Persistent storage, backup recovery, and restart durability are unverified.

Evidence: `render-backend-events.txt`, `render-frontend-events.txt`, `render-backend-settings.txt`, and `render-backend-logs.txt` in the evidence directory.

## Timestamped HTTP results

Request timestamps below are UTC client timestamps. Full server response headers are retained in matching JSON evidence files. Initial failures are retained alongside warm results.

| Probe | Completed UTC | HTTP | Seconds |
|---|---|---:|---:|
| backend-health | 2026-11-14T11:35:33.128096+00:00 | 500 | 71.897 |
| frontend-health | 2026-11-14T11:35:14.752261+00:00 | 500 | 53.519 |
| frontend-snapshot-000 | 2026-11-14T11:35:35.934194+00:00 | 503 | 0.338 |
| backend-health-warm | 2026-11-14T11:49:40.707292+00:00 | 200 | 0.268 |
| frontend-health-warm | 2026-11-14T11:49:41.015873+00:00 | 200 | 0.307 |
| backend-ready-final | 2026-11-14T11:55:15.931802+00:00 | 503 | 0.283 |
| frontend-recheck | 2026-11-14T11:49:40.116451+00:00 | 200 | 0.757 |
| backend-snapshot-warm | 2026-11-14T11:55:14.637948+00:00 | 200 | 0.78 |
| frontend-conditional | 2026-11-14T11:49:40.434688+00:00 | 200 | 0.315 |
| backend-conditional-weak | 2026-11-14T11:55:14.928500+00:00 | 200 | 0.289 |
| backend-conditional-strong | 2026-11-14T11:55:15.229907+00:00 | 304 | 0.299 |
| frontend-conditional-strong | 2026-11-14T11:55:15.647814+00:00 | 304 | 0.415 |
| frontend-calendar | 2026-11-14T11:35:34.563153+00:00 | 200 | 1.432 |
| frontend-upcoming | 2026-11-14T11:35:35.591610+00:00 | 200 | 1.023 |

Warm backend health body: `{"status":"ok"}`. Readiness body: `{"status":"degraded","worker_alive":true,"has_snapshot":true,"last_status":"PARTIAL"}`. HTTP 503 is honest degraded readiness. However, the reason is broader than the expected stale IMF series: macro definitions are missing and the published data is empty.

## Snapshot coverage and data integrity

Both direct backend and proxied frontend snapshot GETs return HTTP 200 with a **591-byte empty payload**:
- Six indicator labels exist, but all country-level observation maps are empty.
- `equity`, `differentials`, and `scores` are empty.
- FX reserve and equity freshness statuses are `ERROR`, with null successful timestamps.
- UK GDP 1.9% YoY, UK current account -2.532022%, Euro Area current account 1.901553%, and 28 canonical equity crosses are **absent in production**.
- `has_snapshot` checks whether a database row exists, not whether required economic coverage exists. An empty published snapshot satisfies it.

## Autonomous cycle observation

Monitoring window: **2026-11-14T11:35:35.595796+00:00 through 2026-11-14T11:56:39.495536+00:00**, 32 proxied snapshot probes.
HTTP-200 snapshots: 30. Distinct returned versions: 1. Distinct returned publication timestamps: 1.
Returned versions: `0b0feb465c6b994b302dc553fba535861285a5bd9417ea7fcdbecaa2447da6e9`.
Returned publication timestamps: `2026-11-14T11:36:20.242329+00:00`.
No successful equity completion timestamp appeared. Two successful automatic cycles were **not demonstrated**. Render logs show scheduler-initiated jobs failing with `MacroIndicator.DoesNotExist: MacroIndicator matching query does not exist.` Worker liveness proves a running loop, not useful ingestion.
Two consecutive unattended failed cycles were directly observed in authenticated application logs: macro/reserve errors at approximately **11:50:08 UTC**, equity error at **11:51:15 UTC**; next macro/reserve errors at approximately **11:55:00–11:55:01 UTC**, equity error at **11:56:07 UTC**. Evidence: `render-backend-logs.txt` and `render-backend-logs-later.txt`. Dashboard timestamps display Africa/Algiers local time (UTC+1).
Only GET requests were used. Polling keeps Free services awake, so this observation cannot prove ingestion continues during inactivity. No production lease takeover, process crash, restart, or recovery experiment was performed.
Source caveat: snapshot versions exclude `published_at`, while the response body cache keys only by version. Unchanged inputs can therefore retain an earlier response timestamp even if another database publication occurs. Returned timestamps alone cannot prove complete cycle execution. Separate durable cycle IDs/results are needed.

## ETag verification

Returned tag: `W/"0b0feb465c6b994b302dc553fba535861285a5bd9417ea7fcdbecaa2447da6e9"`.
- Echoing the actual weak tag through the frontend: **HTTP 200**, failed expected conditional polling.
- Echoing the actual weak tag directly to backend: **HTTP 200**.
- Sending the corresponding strong quoted tag directly and through frontend: **HTTP 304**, empty body.
This matches backend `67fd4e8`, which compares If-None-Match exactly. Local `e33da1d` contains the weak-tag repair, but its backend deployment failed. Do not treat the strong-tag workaround as the requested end-to-end weak-tag success.

## Economic calendar

Frontend `/api/calendar`: HTTP 200, source `biquote.io`, 264 events, 11 configured market codes.
Frontend `/api/calendar/upcoming`: HTTP 200, source `biquote.io`, 20 upcoming events. This subsystem works independently of the broken macro snapshot.

## Local verification

All four requested commands completed successfully in this audit:

| Command | Result |
|---|---|
| `python -B scripts/verify_autonomous.py` | Exit 0; 434.72 seconds; expected PARTIAL due only to stale IMF Euro Area reserves |
| `node --test tests/fx_and_equity_frontend.test.ts tests/biquote_calendar.test.ts` | Exit 0; 12 passed, 0 failed |
| `python -B -m unittest discover -s tests -p 'test_*.py'` | Exit 0; 12 passed |
| Backend: `python -B manage.py test apps.macro.tests.test_autonomous_pipeline apps.macro.tests.test_fx_and_equity --noinput` | Exit 0; 26 passed; no system-check issues |

Harness used its disposable copy of the local database. `ENABLE_IN_PROCESS_SCHEDULER=false` was set for that command only, preventing an incidental second worker while the harness directly runs ingestion. No application source was changed. Node emitted MODULE_TYPELESS_PACKAGE_JSON warnings; tests still passed.
Harness recovered UK GDP September 2026 **1.9% YoY** from ONS IHYR, UK June current account **-2.532022% of GDP**, and Euro Area June current account **1.901553% of GDP** from OECD. It generated a 2,809,817-byte serialized snapshot and verified local HTTP 200 / ETag 304.
Additional read-only inspection of that disposable snapshot found 10-country coverage for each of the five country-level indicators, 30 equity pair keys (28 canonical and two aliases), 1,410 complete equity month records with **zero synthetic-minus-index sign mismatches**, 360 incomplete historical records with null values, and zero future equity months. This does not establish production coverage.
Local tests exercise lease exclusion, expired-owner rejection, queueing, source failure retention, revision handling, and snapshot filtering. They do not prove real concurrent PostgreSQL fencing or production crash recovery. SQLite does not provide PostgreSQL-style row locks for `select_for_update`.

## Performance and remaining work

Warm proxied snapshot median: 0.400 seconds, measured on the empty 591-byte production payload. This is not representative latency for a populated multi-megabyte snapshot.
Initial health requests failed with HTTP 500 after approximately 54 seconds through frontend and 72 seconds directly. They later recovered to HTTP 200. No literal zero-latency or zero-failure claim is supported.
The 434.72-second local full ingestion run exceeds five minutes; a five-minute cron setting does not guarantee five-minute release visibility.
Required repair sequence: protect current production data; verify persistent database configuration and migration; establish reference definitions in the runtime database; investigate backend deployment health-check failure; successfully deploy the weak-ETag fix; run ingestion outside sleeping Free web services; reject or flag empty/degraded coverage explicitly; verify two successful automatic cycles and restart durability afterward. Preserve existing valid data and real users during any cutover.
No frontend production build or application UI regression suite was requested or run in this audit. Browser verification covered authenticated Render service state and logs.

## Response headers

### backend-health

```json
{
  "label": "backend-health",
  "url": "https://shiftfx-backend.onrender.com/api/health",
  "started_at": "2026-11-14T11:34:21.230914+00:00",
  "completed_at": "2026-11-14T11:35:33.128096+00:00",
  "seconds": 71.897,
  "status": 500,
  "headers": {
    "Date": "Sat, 14 Nov 2026 11:35:34 GMT",
    "Content-Type": "text/html",
    "Transfer-Encoding": "chunked",
    "Connection": "close",
    "cf-cache-status": "DYNAMIC",
    "rndr-id": "8187a4ce-7893-4f0e",
    "Server": "cloudflare",
    "vary": "Accept-Encoding",
    "x-render-origin-server": "Render",
    "CF-RAY": "a5a5b4e90ed4a0e6-ORN",
    "alt-svc": "h3=\":443\"; ma=86400"
  }
}
```

### frontend-health

```json
{
  "label": "frontend-health",
  "url": "https://shiftfx-admin.onrender.com/api/health",
  "started_at": "2026-11-14T11:34:21.232819+00:00",
  "completed_at": "2026-11-14T11:35:14.752261+00:00",
  "seconds": 53.519,
  "status": 500,
  "headers": {
    "Date": "Sat, 14 Nov 2026 11:35:16 GMT",
    "Transfer-Encoding": "chunked",
    "Connection": "close",
    "rndr-id": "314b1e8b-8d00-4fdb",
    "Server": "cloudflare",
    "x-render-origin-server": "Render",
    "cf-cache-status": "DYNAMIC",
    "CF-RAY": "a5a5b4e93efea0e6-ORN",
    "alt-svc": "h3=\":443\"; ma=86400"
  }
}
```

### frontend-snapshot-000

```json
{
  "label": "frontend-snapshot-000",
  "url": "https://shiftfx-admin.onrender.com/api/live/snapshot",
  "started_at": "2026-11-14T11:35:35.595796+00:00",
  "completed_at": "2026-11-14T11:35:35.934194+00:00",
  "seconds": 0.338,
  "status": 503,
  "headers": {
    "Date": "Sat, 14 Nov 2026 11:35:37 GMT",
    "Content-Type": "application/json",
    "Transfer-Encoding": "chunked",
    "Connection": "close",
    "alt-svc": "h3=\":443\"; ma=86400",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "cf-cache-status": "DYNAMIC",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-site",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "pragma": "no-cache",
    "referrer-policy": "strict-origin-when-cross-origin",
    "rndr-id": "8fd8245e-3aab-41e9",
    "Server": "cloudflare",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "vary": "origin, Accept-Encoding",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-render-origin-server": "cloudflare",
    "CF-RAY": "a5a5b6b9190d12c0-ORN"
  }
}
```

### backend-health-warm

```json
{
  "label": "backend-health-warm",
  "url": "https://shiftfx-backend.onrender.com/api/health",
  "started_at": "2026-11-14T11:49:40.439574+00:00",
  "completed_at": "2026-11-14T11:49:40.707292+00:00",
  "seconds": 0.268,
  "status": 200,
  "headers": {
    "Date": "Sat, 14 Nov 2026 11:49:42 GMT",
    "Content-Type": "application/json",
    "Transfer-Encoding": "chunked",
    "Connection": "close",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "cf-cache-status": "DYNAMIC",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-site",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "pragma": "no-cache",
    "referrer-policy": "strict-origin-when-cross-origin",
    "rndr-id": "ea23f953-9e40-4c8f",
    "Server": "cloudflare",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "vary": "Accept-Encoding",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-render-origin-server": "gunicorn",
    "CF-RAY": "a5a5cb597dabd7e9-ORN",
    "alt-svc": "h3=\":443\"; ma=86400"
  }
}
```

### frontend-health-warm

```json
{
  "label": "frontend-health-warm",
  "url": "https://shiftfx-admin.onrender.com/api/health",
  "started_at": "2026-11-14T11:49:40.709006+00:00",
  "completed_at": "2026-11-14T11:49:41.015873+00:00",
  "seconds": 0.307,
  "status": 200,
  "headers": {
    "Date": "Sat, 14 Nov 2026 11:49:42 GMT",
    "Content-Type": "application/json",
    "Transfer-Encoding": "chunked",
    "Connection": "close",
    "alt-svc": "h3=\":443\"; ma=86400",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "cf-cache-status": "DYNAMIC",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-site",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "pragma": "no-cache",
    "referrer-policy": "strict-origin-when-cross-origin",
    "rndr-id": "1b056931-d60e-422f",
    "Server": "cloudflare",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "vary": "origin, Accept-Encoding",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-render-origin-server": "cloudflare",
    "CF-RAY": "a5a5cb5afe59a4a9-ORN"
  }
}
```

### backend-ready-final

```json
{
  "label": "backend-ready-final",
  "url": "https://shiftfx-backend.onrender.com/api/ready",
  "started_at": "2026-11-14T11:55:15.649187+00:00",
  "completed_at": "2026-11-14T11:55:15.931802+00:00",
  "seconds": 0.283,
  "status": 503,
  "headers": {
    "Date": "Sat, 14 Nov 2026 11:55:17 GMT",
    "Content-Type": "application/json",
    "Transfer-Encoding": "chunked",
    "Connection": "close",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "cf-cache-status": "DYNAMIC",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-site",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "pragma": "no-cache",
    "referrer-policy": "strict-origin-when-cross-origin",
    "rndr-id": "7f6d25e4-3435-49e2",
    "Server": "cloudflare",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "vary": "Accept-Encoding",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-render-origin-server": "gunicorn",
    "CF-RAY": "a5a5d3886bd112c0-ORN",
    "alt-svc": "h3=\":443\"; ma=86400"
  }
}
```

### frontend-recheck

```json
{
  "label": "frontend-recheck",
  "url": "https://shiftfx-admin.onrender.com/api/live/snapshot",
  "started_at": "2026-11-14T11:49:39.359365+00:00",
  "completed_at": "2026-11-14T11:49:40.116451+00:00",
  "seconds": 0.757,
  "status": 200,
  "headers": {
    "Date": "Sat, 14 Nov 2026 11:49:41 GMT",
    "Content-Type": "application/json",
    "Transfer-Encoding": "chunked",
    "Connection": "close",
    "alt-svc": "h3=\":443\"; ma=86400",
    "Cache-Control": "public, max-age=0, must-revalidate",
    "cf-cache-status": "DYNAMIC",
    "etag": "W/\"0b0feb465c6b994b302dc553fba535861285a5bd9417ea7fcdbecaa2447da6e9\"",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-site",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "rndr-id": "46755d21-623a-4c7f",
    "Server": "cloudflare",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "vary": "origin, Accept-Encoding",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-render-origin-server": "cloudflare",
    "CF-RAY": "a5a5cb52cf7c6d96-ORN"
  }
}
```

### backend-snapshot-warm

```json
{
  "label": "backend-snapshot-warm",
  "url": "https://shiftfx-backend.onrender.com/api/live/snapshot",
  "started_at": "2026-11-14T11:55:13.857509+00:00",
  "completed_at": "2026-11-14T11:55:14.637948+00:00",
  "seconds": 0.78,
  "status": 200,
  "headers": {
    "Date": "Sat, 14 Nov 2026 11:55:16 GMT",
    "Content-Type": "application/json",
    "Transfer-Encoding": "chunked",
    "Connection": "close",
    "Cache-Control": "public, max-age=0, must-revalidate",
    "etag": "W/\"0b0feb465c6b994b302dc553fba535861285a5bd9417ea7fcdbecaa2447da6e9\"",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-site",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "rndr-id": "60eb2e98-4842-45e3",
    "Server": "cloudflare",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "vary": "Accept-Encoding",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-render-origin-server": "gunicorn",
    "cf-cache-status": "DYNAMIC",
    "CF-RAY": "a5a5d37d88c757fb-ORN",
    "alt-svc": "h3=\":443\"; ma=86400"
  }
}
```

### frontend-conditional

```json
{
  "label": "frontend-conditional",
  "url": "https://shiftfx-admin.onrender.com/api/live/snapshot",
  "started_at": "2026-11-14T11:49:40.120149+00:00",
  "completed_at": "2026-11-14T11:49:40.434688+00:00",
  "seconds": 0.315,
  "status": 200,
  "headers": {
    "Date": "Sat, 14 Nov 2026 11:49:41 GMT",
    "Content-Type": "application/json",
    "Transfer-Encoding": "chunked",
    "Connection": "close",
    "alt-svc": "h3=\":443\"; ma=86400",
    "Cache-Control": "public, max-age=0, must-revalidate",
    "cf-cache-status": "DYNAMIC",
    "etag": "W/\"0b0feb465c6b994b302dc553fba535861285a5bd9417ea7fcdbecaa2447da6e9\"",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-site",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "rndr-id": "4bc7640b-dbb9-4322",
    "Server": "cloudflare",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "vary": "origin, Accept-Encoding",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-render-origin-server": "cloudflare",
    "CF-RAY": "a5a5cb574d4612c0-ORN"
  }
}
```

### backend-conditional-weak

```json
{
  "label": "backend-conditional-weak",
  "url": "https://shiftfx-backend.onrender.com/api/live/snapshot",
  "started_at": "2026-11-14T11:55:14.639727+00:00",
  "completed_at": "2026-11-14T11:55:14.928500+00:00",
  "seconds": 0.289,
  "status": 200,
  "headers": {
    "Date": "Sat, 14 Nov 2026 11:55:16 GMT",
    "Content-Type": "application/json",
    "Transfer-Encoding": "chunked",
    "Connection": "close",
    "Cache-Control": "public, max-age=0, must-revalidate",
    "etag": "W/\"0b0feb465c6b994b302dc553fba535861285a5bd9417ea7fcdbecaa2447da6e9\"",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-site",
    "cf-cache-status": "DYNAMIC",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "rndr-id": "9fdc1db2-6511-4c29",
    "Server": "cloudflare",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "vary": "Accept-Encoding",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-render-origin-server": "gunicorn",
    "CF-RAY": "a5a5d381febb09ad-ORN",
    "alt-svc": "h3=\":443\"; ma=86400"
  }
}
```

### backend-conditional-strong

```json
{
  "label": "backend-conditional-strong",
  "url": "https://shiftfx-backend.onrender.com/api/live/snapshot",
  "started_at": "2026-11-14T11:55:14.931011+00:00",
  "completed_at": "2026-11-14T11:55:15.229907+00:00",
  "seconds": 0.299,
  "status": 304,
  "headers": {
    "Date": "Sat, 14 Nov 2026 11:55:16 GMT",
    "Connection": "close",
    "Cache-Control": "public, max-age=0, must-revalidate",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-site",
    "etag": "\"0b0feb465c6b994b302dc553fba535861285a5bd9417ea7fcdbecaa2447da6e9\"",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "rndr-id": "389cd5e2-7b3c-40d8",
    "Server": "cloudflare",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "vary": "origin",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-render-origin-server": "gunicorn",
    "cf-cache-status": "DYNAMIC",
    "CF-RAY": "a5a5d383ee563447-ORN",
    "alt-svc": "h3=\":443\"; ma=86400"
  }
}
```

### frontend-conditional-strong

```json
{
  "label": "frontend-conditional-strong",
  "url": "https://shiftfx-admin.onrender.com/api/live/snapshot",
  "started_at": "2026-11-14T11:55:15.232532+00:00",
  "completed_at": "2026-11-14T11:55:15.647814+00:00",
  "seconds": 0.415,
  "status": 304,
  "headers": {
    "Date": "Sat, 14 Nov 2026 11:55:17 GMT",
    "Connection": "close",
    "alt-svc": "h3=\":443\"; ma=86400",
    "Cache-Control": "public, max-age=0, must-revalidate",
    "cf-cache-status": "DYNAMIC",
    "x-render-origin-server": "cloudflare",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-site",
    "etag": "\"0b0feb465c6b994b302dc553fba535861285a5bd9417ea7fcdbecaa2447da6e9\"",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "rndr-id": "e4f75b58-5b7a-4f3b",
    "Server": "cloudflare",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "vary": "origin",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "CF-RAY": "a5a5d385dd2ad07f-ORN"
  }
}
```

### frontend-calendar

```json
{
  "label": "frontend-calendar",
  "url": "https://shiftfx-admin.onrender.com/api/calendar",
  "started_at": "2026-11-14T11:35:33.131365+00:00",
  "completed_at": "2026-11-14T11:35:34.563153+00:00",
  "seconds": 1.432,
  "status": 200,
  "headers": {
    "Date": "Sat, 14 Nov 2026 11:35:35 GMT",
    "Content-Type": "application/json",
    "Transfer-Encoding": "chunked",
    "Connection": "close",
    "cf-cache-status": "DYNAMIC",
    "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.fontshare.com; style-src 'self' 'unsafe-inline' https://api.fontshare.com https://fonts.googleapis.com; font-src 'self' https://cdn.fontshare.com https://fonts.gstatic.com data:; img-src 'self' data: blob: https://hatscripts.github.io; connect-src 'self' http://localhost:8001 http://127.0.0.1:8001 http://localhost:3000 http://localhost:3001 http://localhost:3002 https://*.onrender.com https://api.imf.org https://stats.oecd.org https://api.worldbank.org; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "rndr-id": "17a78ff5-27a5-4ba3",
    "Server": "cloudflare",
    "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
    "vary": "Accept-Encoding",
    "x-content-type-options": "nosniff",
    "x-dns-prefetch-control": "on",
    "x-frame-options": "DENY",
    "x-render-origin-server": "Render",
    "x-xss-protection": "1; mode=block",
    "CF-RAY": "a5a5b6a9cc6d9370-ORN",
    "alt-svc": "h3=\":443\"; ma=86400"
  }
}
```

### frontend-upcoming

```json
{
  "label": "frontend-upcoming",
  "url": "https://shiftfx-admin.onrender.com/api/calendar/upcoming",
  "started_at": "2026-11-14T11:35:34.568393+00:00",
  "completed_at": "2026-11-14T11:35:35.591610+00:00",
  "seconds": 1.023,
  "status": 200,
  "headers": {
    "Date": "Sat, 14 Nov 2026 11:35:37 GMT",
    "Content-Type": "application/json",
    "Transfer-Encoding": "chunked",
    "Connection": "close",
    "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.fontshare.com; style-src 'self' 'unsafe-inline' https://api.fontshare.com https://fonts.googleapis.com; font-src 'self' https://cdn.fontshare.com https://fonts.gstatic.com data:; img-src 'self' data: blob: https://hatscripts.github.io; connect-src 'self' http://localhost:8001 http://127.0.0.1:8001 http://localhost:3000 http://localhost:3001 http://localhost:3002 https://*.onrender.com https://api.imf.org https://stats.oecd.org https://api.worldbank.org; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "rndr-id": "a0a949a0-79cb-43ae",
    "Server": "cloudflare",
    "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
    "vary": "Accept-Encoding",
    "x-content-type-options": "nosniff",
    "x-dns-prefetch-control": "on",
    "x-frame-options": "DENY",
    "x-render-origin-server": "Render",
    "x-xss-protection": "1; mode=block",
    "cf-cache-status": "DYNAMIC",
    "CF-RAY": "a5a5b6b2ab2909ad-ORN",
    "alt-svc": "h3=\":443\"; ma=86400"
  }
}
```
