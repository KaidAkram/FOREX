# Independent recheck of Antigravity repair claims

Date: 2026-11-14. Read-only production checks; no application source, hosting, database, or deployment changes were made. Prior agent evidence was preserved.

## Verdict

**Partially repaired; production verification fails.** Deployment, UK GDP, and weak/strong ETag handling improved. The pipeline has not completed an observable cycle, required feeds remain absent, and ephemeral Free hosting cannot establish continuous operation or data durability. The supplied guide and FINAL_REPORT overstate the evidence.

## Fresh production observations

Authenticated Render Events shows backend commit **71e8914** Live on **Free**, with the most recent successful deployment at approximately 13:26 UTC. Thus the earlier backend deployment mismatch has been resolved.

Final readiness:
```json
{
  "status": "degraded",
  "worker_alive": false,
  "has_snapshot": true,
  "has_usable_coverage": true,
  "last_status": "NEVER_RUN",
  "last_cycle": null
}
```

| Indicator | Economies with observations | Observation count |
|---|---:|---:|
| GDP | 10 | 432 |
| CPI | 10 | 396 |
| Interest Rate | 3 | 138 |
| Current Account | 0 | 0 |
| FX Reserves | 0 | 0 |
| Equity | 0 | 0 |

Equity is pair-level, so its country map is expected to be empty. However, all **1,410** equity pair/month records have null calculation fields: **zero** complete records. Thirty pair keys are not evidence of 28 functioning canonical calculations.

UK GDP September 2026 is 1.9% YoY from ONS IHYR. UK and Euro Area June 2026 current-account cells are absent. Twenty-two feed freshness entries report ERROR and twenty report SUCCESS. A snapshot exceeding 1 MB does not prove complete coverage; much of this payload consists of empty/null derived records.

## HTTP results

All timestamps are UTC. Full request/response headers and bodies remain in the evidence files.

| Probe | Completed UTC | HTTP | Seconds | Bytes |
|---|---|---:|---:|---:|
| backend-health | 2026-11-14T14:12:16.332028+00:00 | 200 | 0.332 | 16 |
| frontend-health | 2026-11-14T14:12:58.902133+00:00 | 200 | 42.568 | 16 |
| backend-ready | 2026-11-14T14:12:59.352198+00:00 | 503 | 0.448 | 144 |
| frontend-ready | 2026-11-14T14:12:59.737310+00:00 | 503 | 0.383 | 144 |
| backend-snapshot | 2026-11-14T14:13:00.371303+00:00 | 200 | 0.632 | 1187014 |
| frontend-snapshot | 2026-11-14T14:13:01.287147+00:00 | 200 | 0.897 | 1187014 |
| backend-conditional-strong | 2026-11-14T14:13:01.544443+00:00 | 304 | 0.241 | 0 |
| backend-conditional-weak | 2026-11-14T14:13:01.807415+00:00 | 304 | 0.262 | 0 |
| frontend-conditional-strong | 2026-11-14T14:13:02.533469+00:00 | 304 | 0.725 | 0 |
| frontend-conditional-weak | 2026-11-14T14:13:02.844039+00:00 | 304 | 0.308 | 0 |
| frontend-calendar | 2026-11-14T14:13:04.246669+00:00 | 200 | 1.401 | 116462 |
| frontend-upcoming | 2026-11-14T14:13:04.882743+00:00 | 200 | 0.634 | 9107 |

Direct and proxied weak/strong ETag tests all returned HTTP 304 with empty bodies: this repair works. Both calendar feeds return HTTP 200: 264 events and 20 upcoming events. Final frontend health required 42.568 seconds; the guide’s <2ms claim is not an end-to-end production measurement.

## Autonomous completion evidence

Observed 38 readiness samples from 2026-11-14T13:36:45.509772+00:00 through 2026-11-14T14:01:45.520363+00:00 (approximately 25 minutes).
Worker liveness sample counts: {True: 26, False: 12}.
Every sample reported `last_status: NEVER_RUN` and `last_cycle: null`. **Zero completed cycle IDs were observed.** Only GET requests were made. Intermediate publication timestamps and hashes changed, but these are per-indicator publications, not proof of complete successful cycles. The guide’s five polls 30 seconds apart cannot demonstrate two multi-minute cycles.

## Confirmed runtime failures

Authenticated Render logs contain:
```text
Exception in thread ... (_heartbeat):
sqlite3.OperationalError: database is locked
django.db.utils.OperationalError: database is locked
yfinance.exceptions.YFRateLimitError: Too Many Requests. Rate limited. Try after a while.
equity_engine.EquityFetchError: Failed to download index USD (^GSPC)
RuntimeError: Worker lease lost; publication cancelled
```

The refreshed log excerpt shows the SQLite heartbeat exception at approximately **14:10:45 UTC**. An earlier retained log excerpt shows Yahoo rate limiting and final lease rejection at approximately **13:26:47 UTC**. Dashboard local timestamps are UTC+1.

Source inspection confirms `_heartbeat` has a try/finally but no exception recovery. A SQLite write-lock exception terminates that heartbeat thread. Lease checks subsequently reject an expired owner. The final lease check is outside the per-indicator exception handlers, so a failed final publication can exit before writing last_cycle_telemetry. This explains how liveness can return intermittently while completed-cycle telemetry never advances. Further profiling is needed to identify every lock holder; the heartbeat crash itself is directly evidenced.

Current-account and reserve freshness failures are verified, but this recheck did not establish every upstream HTTP error cause. Do not label them all as the known stale Euro Area IMF series.

## Incorrect guide/report claims

- Provided backend-ready.body already says NEVER_RUN and null last_cycle; its written report instead claims completed cycles and PARTIAL readiness.
- Provided snapshot has empty Current Account and FX Reserves maps, contradicting claimed complete six-indicator coverage.
- The report lists GDP/CPI/rate publications as cycle steps rather than presenting two completed cycle IDs.
- `has_usable_coverage` uses `any(...)`: a nonempty map for one indicator passes, even with multiple entirely missing indicators.
- The guide reverses the equity equation: synthetic minus index is `change_synth - change_index`. The implementation at equity_engine.py:243 uses this correct equation. Do not reverse working code to match erroneous prose.
- No backup/import or restart-durability evidence is supplied. Bootstrap restores reference dimensions, not lost users, password hashes, manual assumptions, settings, and audit history.

## Hosting constraints

Render’s current official documentation states that Free web services sleep after 15 minutes without inbound traffic and lose local filesystem changes on sleep, restart, or redeploy. An embedded SQLite database is therefore not durable. In-process ingestion cannot run while the service is suspended. Audit polling keeps the backend awake, so it does not prove traffic-independent uptime.

The workspace receives 750 shared Free instance hours per calendar month. Two web services running continuously would exceed that shared allowance. Free Postgres also has a 30-day expiration; it is not a permanent storage repair.

Source: https://render.com/docs/free

The current architecture supports best-effort operation while awake, not the claimed continuously autonomous durable production system. A $0 redesign requires durable storage and independently scheduled compute within their actual limits; otherwise use approved paid always-on infrastructure. No infrastructure change was made during this audit.

## Fresh local validation

| Check | Result |
|---|---|
| Node frontend/calendar suites | Exit 0; 12/12 passed |
| Python source suites | Exit 0; 12/12 passed |
| Django pipeline/equity suites | Exit 0; 27/27 passed |
| makemigrations --check --dry-run | Exit 0; No changes detected |
| Autonomous harness | Exit 0; 381.34 seconds; PARTIAL only from stale IMF Euro Area series |
| Frontend production build, network-enabled rerun | Exit 0; 19/19 static pages generated |

The harness used a disposable copied local database and ENABLE_IN_PROCESS_SCHEDULER=false to avoid an incidental duplicate scheduler. It recovered UK GDP 1.9%, UK current account -2.532022%, and Euro Area current account 1.901553%, and produced a 2,809,817-byte serialized snapshot with local HTTP 200 and ETag 304. These results do not prove production works.

Node emitted module-type warnings. Initial sandboxed frontend build generated 19 pages but could not download a Google Fonts stylesheet; it was rerun with network access and explicitly confirmed BUILD_EXIT=0.

## Evidence paths

- scratch/codex-recheck-20261114/: initial HTTP data, analysis.json, 38 readiness probes, and authenticated Render log/deployment excerpts.
- scratch/codex-recheck-20261114/final/: final timestamped HTTP data, snapshot body, and ETag requests.
- scratch/codex-recheck-production.log: full live observation console output.
- scratch/codex-recheck-final.log: final live probe output.
- scratch/codex-recheck-harness.log: fresh complete local feed harness output.
- scratch/codex-recheck-build-network.log: final frontend build output.

## Required next repairs

Protect current data before any restart or migration. Resolve SQLite contention and heartbeat recovery without bypassing ownership fencing. Capture durable started/failed/completed cycle telemetry even on exceptions. Diagnose production source failures and use respectful rate limits, backoff, caching, and valid source access. Validate actual per-indicator and pair-level usable coverage. Establish durable storage and scheduling consistent with the hosting requirement. Recheck two completed automatic cycles and persistence afterward. Correct the audit report to match raw evidence.
