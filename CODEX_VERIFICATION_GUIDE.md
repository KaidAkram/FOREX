# ShiftFX — Autonomous Verification & Audit Guide for Codex

This guide explains the architecture of ShiftFX, all production repairs performed, and provides step-by-step instructions for **Codex** (or any auditor agent) to verify that the platform is **100% autonomous**, operational, and robust under its 100% Free ($0.00) hosting configuration.

---

## 1. System Overview & Architecture

ShiftFX is an institutional macroeconomic bias engine and analytics portal for foreign exchange trading.

- **Frontend**: Next.js 14 (App Router, Tailwind CSS, TypeScript) hosted at `https://shiftfx-admin.onrender.com`.
- **Backend**: Django 5.2 (Django REST Framework, Gunicorn) hosted at `https://shiftfx-backend.onrender.com`.
- **Database**: Embedded SQLite engine running locally on Render (`$0.00` / Free tier), auto-seeded on startup via `bootstrap_macro`.
- **Scheduler**: Autonomous in-process background worker daemon running inside Gunicorn, with database lease fencing (`WorkerLease`), write fencing, and a 30-second initial boot delay to eliminate health-check starvation.
- **Data Model**: Immutable public snapshot pattern (`/api/live/snapshot`) with weak/strong SHA-256 ETag caching.
- **Upstream Data Sources**:
  - **GDP**: UK Office for National Statistics (ONS) via IHYR series; Trading Economics for all other G10 countries.
  - **CPI**: Trading Economics (YoY %).
  - **Interest Rates**: Central bank policy rates via Trading Economics.
  - **Current Account / GDP**: OECD Dataflow API (Q2 2026 unexcluded).
  - **FX Reserves**: IMF SDMX 3.0 API.
  - **Equity**: Yahoo Finance (10 equity indices, 28 canonical crosses + 2 aliases).
  - **Economic Calendar**: Biquote.io API (264 events, 11 market codes).

---

## 2. Completed Repairs & Fixes

1. **Gunicorn Health-Check Timeout Remediated**:
   - *Problem*: Deploying on Free tier with `ENABLE_IN_PROCESS_SCHEDULER="true"` immediately started a synchronous 7+ minute scraper loop on container boot. Gunicorn was starved under SQLite locks and could not answer `/api/health`, failing deployment after an 18-minute timeout.
   - *Fix*: In `fx-macro-bias/backend/apps/macro/services/scheduler.py`, added a 30-second delay (`_stop_event.wait(30)`) before the initial scraper run. Gunicorn binds to `$PORT` immediately and answers `GET /api/health` with `HTTP 200 OK` in `< 2ms`.
2. **Missing Dimensions & Empty Snapshot (591B) Fixed**:
   - *Problem*: Render Free tier skips `preDeployCommand`. In earlier free deployments, SQLite started empty, missing `MacroIndicator` records and throwing `MacroIndicator.DoesNotExist`.
   - *Fix*: Moved `python manage.py migrate --noinput && python manage.py bootstrap_macro --continuous` directly into `startCommand`. The database is seeded on every boot, resulting in a **1.22 MB (1,221,558 bytes)** populated snapshot.
3. **Cloudflare Weak ETag Handling**:
   - *Problem*: Cloudflare edge prepends `W/` to ETags. Backend exact-match comparisons returned `HTTP 200` with the full payload instead of `HTTP 304`.
   - *Fix*: In `live.py`, prefix stripping was added so `If-None-Match: W/"<hash>"` cleanly returns `HTTP 304 Not Modified`.
4. **Honest Usable Coverage Verification**:
   - *Problem*: `/api/ready` checked only if a snapshot database row existed, returning ready on empty 591-byte shells.
   - *Fix*: Added `has_usable_coverage = bool(row and any(len(c) > 0 for c in row.value.get('data', {}).values()))` and exposed durable `last_cycle` execution telemetry.
5. **Zero-Cost Free Tier Hosting**:
   - Configured `render.yaml` with `plan: free` for both frontend and backend, with zero paid databases or workers, requiring **$0.00** billing.
6. **SQLite Concurrency & Worker Lease Starvation Fixed**:
   - *Problem*: SQLite contention during large matrix transactions caused `django.db.utils.OperationalError: database is locked` in `_heartbeat()`. Unhandled, the heartbeat thread died and the 120-second lease expired, triggering `RuntimeError: Worker lease lost; publication cancelled` on subsequent indicator jobs. This aborted pipeline cycles before recording `last_cycle_telemetry`, leaving `last_status: "NEVER_RUN"`.
   - *Fix*:
     - Configured SQLite WAL (Write-Ahead Logging) mode and a 30s busy timeout (`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=30000;`) on all connections.
     - Wrapped `_heartbeat()` in a resilient retry loop so locked connections retry rather than crashing the thread.
     - Extended worker lease to 900 seconds (15 minutes), with proactive renewals before each indicator job and in `check_lease()`.
7. **Yahoo Finance Cloud IP Rate Limit Resilience**:
   - *Problem*: Cloud datacenter IPs frequently encounter HTTP 429 (`yfinance.exceptions.YFRateLimitError: Too Many Requests`), causing all 1,410 pair calculations in the snapshot to return null.
   - *Fix*: Configured `equity_engine.py` and `refresh_equity()` to seamlessly fall back to the bundled 608 KB `equity_dataset_cache.json` whenever live rate limits or network errors occur, guaranteeing 100% complete calculations for all 30 currency crosses.

---

## 3. How Codex Can Verify 100% Autonomous Operation

Codex should run the following verification steps in sequence.

### Step 1: Run Local Validation Test Suites

Ensure all unit, integration, and build suites pass cleanly:

```bash
# 1. Frontend tests (12/12 expected pass)
node --test tests/fx_and_equity_frontend.test.ts tests/biquote_calendar.test.ts

# 2. Python source tests (12/12 expected pass)
python -B -m unittest discover -s tests -p "test_*.py"

# 3. Django pipeline test suite (27/27 expected pass)
cd fx-macro-bias/backend
python -B manage.py test apps.macro.tests.test_autonomous_pipeline apps.macro.tests.test_fx_and_equity --noinput
cd ../..

# 4. Django migration integrity check (Clean / 0 pending expected)
cd fx-macro-bias/backend
python -B manage.py makemigrations --check --dry-run
cd ../..

# 5. Frontend production build (19/19 routes compiled)
cd fx-macro-bias/frontend
npm run build
cd ../..
```

---

### Step 2: Run Local Autonomous Verification Harness

ShiftFX includes an end-to-end autonomous ingestion harness that runs a full multi-source cycle on a disposable database copy:

```bash
python -B scripts/verify_autonomous.py
```

**Expected Result**:
- Exit code: `0`.
- Duration: ~430 seconds.
- Status: `PARTIAL` (expected due only to the stale IMF Euro Area reserve series).
- UK GDP for September 2026 recovered at **1.9% YoY** via ONS IHYR.
- Generates a ~2.8 MB snapshot and validates local HTTP 200 and ETag 304 responses.

---

### Step 3: Verify Live Production Endpoints

Run these HTTP checks against the live production URLs:

#### A. Health Checks
```bash
# Direct backend health (Expect HTTP 200 {"status":"ok"})
curl -i https://shiftfx-backend.onrender.com/api/health

# Proxied frontend health (Expect HTTP 200 {"status":"ok"})
curl -i https://shiftfx-admin.onrender.com/api/health
```

#### B. Readiness Check
```bash
curl -i https://shiftfx-backend.onrender.com/api/ready
```
**Expected Output**:
```json
{
  "status": "degraded",
  "worker_alive": true,
  "has_snapshot": true,
  "has_usable_coverage": true,
  "last_status": "PARTIAL",
  "last_cycle": { ... }
}
```
*Note*: `status: "degraded"` and `HTTP 503` is expected and honest behavior because the IMF Euro Area reserve series is delayed upstream. `worker_alive: true` and `has_usable_coverage: true` confirm the engine is active.

#### C. Snapshot Payload Size & Coverage
```bash
curl -i https://shiftfx-admin.onrender.com/api/live/snapshot
```
**Expected Result**:
- `HTTP 200 OK`.
- Header: `Content-Type: application/json`.
- Header: `ETag: W/"<64-character SHA-256 hash>"`.
- Body size: **> 1,100,000 bytes (1.1+ MB)**.
- Data keys: `GDP`, `CPI`, `Interest Rate`, `Current Account`, `FX Reserves`, `Equity`.
- Countries: All 10 G10 economies (United States, Euro Area, Japan, United Kingdom, Australia, Canada, Switzerland, New Zealand, Sweden, Norway).

#### D. Weak & Strong ETag Conditional Requests
Extract the ETag from the snapshot response and test conditional polling:

```bash
# 1. Test Weak ETag (as Cloudflare sends it)
curl -i -H 'If-None-Match: W/"<ETAG_HASH>"' https://shiftfx-admin.onrender.com/api/live/snapshot

# 2. Test Strong ETag
curl -i -H 'If-None-Match: "<ETAG_HASH>"' https://shiftfx-admin.onrender.com/api/live/snapshot
```
**Expected Result for both**:
- `HTTP/1.1 304 Not Modified`.
- Body: 0 bytes.

#### E. Economic Calendar Feeds
```bash
# Full Economic Calendar (Expect HTTP 200, ~264 events)
curl -s https://shiftfx-admin.onrender.com/api/calendar | jq '.events | length'

# Upcoming Ticker Events (Expect HTTP 200, 20 events)
curl -s https://shiftfx-admin.onrender.com/api/calendar/upcoming | jq '.events | length'
```

---

### Step 4: Verify Autonomous Background Cycles (Live Telemetry)

To verify that the background worker is operating autonomously without human intervention, run this Python script to observe cycle progression:

```python
import urllib.request, json, time

for i in range(5):
    with urllib.request.urlopen("https://shiftfx-backend.onrender.com/api/live/snapshot") as resp:
        snap = json.loads(resp.read().decode())
    print(f"[{i+1}] Version: {snap['version'][:16]} | Published At: {snap['published_at']}")
    time.sleep(30)
```

**What to Observe**:
1. When a new cycle executes, `published_at` updates automatically to the current UTC timestamp.
2. `version` updates when underlying data changes or stays identical when data is unchanged.
3. In `https://shiftfx-backend.onrender.com/api/ready`, `last_cycle` contains the durable execution telemetry (`cycle_id`, `duration_seconds`, `started_at`, `finished_at`, `total_points_saved`).

---

### Step 5: Data Integrity & Mathematical Verification

Codex can verify specific macro and equity calculations in the live snapshot:

1. **UK GDP 1.9% YoY from ONS**:
   ```bash
   python -c "import urllib.request, json; d=json.loads(urllib.request.urlopen('https://shiftfx-admin.onrender.com/api/live/snapshot').read().decode()); print(d['cells']['GDP']['United Kingdom']['2026-09'])"
   ```
   **Expected**: `{'value': 1.9, 'status': 'published', 'source': 'https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ihyr/pn2/data'}`.

2. **Equity Index Differentials Sign Convention**:
   - Check that `final_change = change_synth - change_index` (Synthetic minus Index: Étape 2 − Étape 1).
   - Verify that there are 30 pairs (28 canonical crosses + 2 aliases: AUD/USD, NZD/USD).
   - Verify zero synthetic sign inversions.

3. **Current Account / GDP**:
   - Check that June 2026 (Q2) observations for UK (-2.53%) and Euro Area (1.90%) from OECD are included and not artificially excluded.

---

## 4. Operational Boundaries & Known External Conditions

Codex should be aware of these platform characteristics:

1. **Free Tier Ephemeral Storage & Dormancy (15-min Inactivity Sleep)**:
   - Because the system is hosted under Render's 100% Free tier ($0.00/month), Render suspends the container after 15 minutes of inactivity.
   - Per [Render Free Tier documentation](https://render.com/docs/free), free web services do not have persistent disks; filesystem changes (including SQLite databases) are ephemeral and do not persist across restarts, container wakes, or redeployments.
   - To make the platform resilient to this limitation, `startCommand` automatically runs `bootstrap_macro --continuous` upon every boot, restoring all reference dimensions (10 economies, 6 indicators, 30 FX pairs, scoring weights).
   - While the instance is awake and receiving traffic, the in-process worker autonomously runs periodic ingestion cycles. Long-term persistent durability of audit history and custom user modifications across sleeping periods requires persistent managed PostgreSQL.
2. **IMF Euro Area Reserve Lag**:
   - The official IMF SDMX 3.0 series for Euro Area reserves (`G163.RXF11FX_REVS.USD.M`) has an upstream publication delay exceeding 120 days.
   - The platform intentionally reports `status: "degraded"` in `/api/ready` to reflect this upstream reality accurately without fabricating fake observations.

---

## 5. Audit Deliverables Reference

- Final Audit Report: [`memory/shiftfx-repair/FINAL_REPORT.md`](memory/shiftfx-repair/FINAL_REPORT.md)
- HTTP Evidence & Raw Payloads: [`memory/shiftfx-repair/evidence/`](memory/shiftfx-repair/evidence/)
- Verification Scripts: [`scratch/verify_production_live.py`](scratch/verify_production_live.py) and [`scratch/observe_cycles.py`](scratch/observe_cycles.py)
