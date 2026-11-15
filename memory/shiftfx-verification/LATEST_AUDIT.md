# ShiftFX latest independent production audit

Audit generated: 2026-11-14T17:58:54.785316+00:00. Repository HEAD: e6f6c70beb4f2fc23d65419770a00393aac0d6a6.

## Verdict

**Not a full production pass.** Several repairs work, and a populated data snapshot was verified while the service was awake. However, controlled local checks reproduce data-regression, ownership-check, and public-refresh defects; Free/ephemeral hosting does not provide uninterrupted scheduling or durable user data. Latest availability and completed-cycle evidence are reported separately below. No production refresh, mutation, restart, deployment, or billing change was performed.

## Deployment and initial availability

Authenticated Render Events confirms backend **e6f6c70 Live on Free**, deployed approximately 15:08 UTC. Existing backend service ID is srv-dbh659flk1mc73fc8trg. Browser automation subsequently stopped because its safety check could not confidently identify the current browser URL. No further browser automation or alternate browser-control route was attempted. Frontend deployment SHA and visual application behavior were not independently verified in this run.

The report claims cycle cae5f4096c1d finished at 15:05:03 UTC, before the current report commit deployed at approximately 15:08 UTC. That historical cycle does not establish uninterrupted operation of the current deployment.

Initial probes began at 16:55:37 UTC. Backend health returned HTTP 200 after **55.958 seconds**; frontend health returned HTTP 200 after another **43.639 seconds**. Initial readiness had no usable snapshot and no completed-cycle record. An initial 1,077,857-byte snapshot contained GDP only, with null equity calculations. This is a cold-start rebuilding state, not immediate restoration of the earlier complete dataset.

## Verified populated snapshot before the final probe

At 17:07:44 UTC, the proxied snapshot was HTTP 200, 2,052,958 bytes, published at 2026-11-14T17:07:44.218527+00:00. It contained the following observations:

```json
{
  "GDP": {
    "countries": 10,
    "points": 432
  },
  "CPI": {
    "countries": 10,
    "points": 396
  },
  "Interest Rate": {
    "countries": 10,
    "points": 462
  },
  "Current Account": {
    "countries": 10,
    "points": 420
  },
  "FX Reserves": {
    "countries": 10,
    "points": 568
  },
  "Equity": {
    "countries": 0,
    "points": 0
  }
}
```

That snapshot had 1,410 complete equity calculations, zero sign mismatches, November 13 as-of dates for current-month equity, and the requested UK/Euro Area OECD current-account values. Only FX reserve freshness was PARTIAL, with Euro Area latest month January 2026. This validates populated data recovery while awake, independently of whether a full cycle was recorded.

## Final live coverage after the observation window

After the observer stopped at approximately 17:18:45 UTC, the final probe began at 17:56:05 UTC. Both snapshot routes returned HTTP 503 with Initial data refresh is pending. Final readiness again had no usable snapshot, NEVER_RUN, and null last_cycle. The previously verified populated dataset was no longer available after this idle interval. No restart or redeploy was initiated by this audit; this behavior is consistent with documented Free-tier dormancy and ephemeral storage.

| Indicator | Economies with data | Observation count |
|---|---:|---:|
| Snapshot unavailable at final probe | 0 | 0 |

Equity is pair-level; its country map is expected to be empty.
Equity pair keys: 0; complete calculations: 0; null calculations: 0; sign mismatches: 0; future-month records: 0.
November equity as-of dates: []. November rows equal to the older bundled cache: 0 of 0.
Matching historical cache values alone is not proof of a fallback; unchanged historical prices are expected. The earlier populated snapshot used newer November 13 values, while the failure simulation below used the November 10 fallback.

Representative official observations:
```json
{
  "uk_gdp_2026_09": null,
  "uk_ca_2026_06": null,
  "ea_ca_2026_06": null
}
```

Source freshness issues:
```json
{}
```

## Completed automatic cycles

Observed new completed cycle IDs: **0**. Readiness polls: 28.
Observation window: 2026-11-14T16:58:07.682246+00:00 through 2026-11-14T17:18:45.024012+00:00.
Only ordinary health/readiness/snapshot GETs were used; no refresh/force query, refresh button, or ingestion POST was used. Polling keeps the Free backend awake, so this proves neither operation during inactivity nor uninterrupted uptime.

```json
[]
```

Final readiness:
```json
{
  "status": "degraded",
  "worker_alive": true,
  "is_currently_running": true,
  "has_snapshot": false,
  "has_usable_coverage": false,
  "last_status": "NEVER_RUN",
  "last_cycle": null
}
```

Per-indicator snapshot publication does not demonstrate a completed full cycle. The older report mixes multiple historical versions and lists only one claimed completed cycle. Its committed backend-ready.body still contains NEVER_RUN and null last_cycle. Those stale artifacts are not evidence of the newer written success claim.

## HTTP evidence

Full URLs, UTC timestamps, request headers, response headers, durations, and bodies are retained under scratch/shiftfx-latest-audit-20261114/final/.

| Probe | Completed UTC | HTTP | Seconds | Bytes |
|---|---|---:|---:|---:|
| anonymous-backend-staff-matrix | 2026-11-14T17:57:28.481609+00:00 | 401 | 0.27 | 58 |
| anonymous-backend-staff-status | 2026-11-14T17:57:28.207227+00:00 | 401 | 0.246 | 58 |
| anonymous-frontend-staff-matrix | 2026-11-14T17:57:29.203835+00:00 | 401 | 0.304 | 58 |
| anonymous-frontend-staff-status | 2026-11-14T17:57:28.897467+00:00 | 401 | 0.413 | 58 |
| backend-health | 2026-11-14T17:57:01.700184+00:00 | 200 | 55.89 | 16 |
| backend-ready | 2026-11-14T17:57:24.699088+00:00 | 503 | 0.282 | 175 |
| backend-snapshot | 2026-11-14T17:57:25.403617+00:00 | 503 | 0.298 | 45 |
| frontend-calendar | 2026-11-14T17:57:27.251268+00:00 | 200 | 1.438 | 116021 |
| frontend-health | 2026-11-14T17:57:24.404025+00:00 | 200 | 22.7 | 16 |
| frontend-ready | 2026-11-14T17:57:25.101316+00:00 | 503 | 0.398 | 175 |
| frontend-snapshot | 2026-11-14T17:57:25.800216+00:00 | 503 | 0.394 | 45 |
| frontend-upcoming | 2026-11-14T17:57:27.947501+00:00 | 200 | 0.69 | 9107 |

Conditional request results must be interpreted against their actual request and response ETags: a changed representation correctly returns 200 with a new validator. An unchanged matching weak or strong validator should return 304 with an empty body. Calendar event counts are time-dependent; this run records actual returned counts rather than requiring a permanent fixed count.

## Reproduced defects and remaining gaps

### 1. Yahoo failure regresses newer equity data and reports false freshness

A real refresh_equity call ran against a disposable local database seeded with the newer EUR/USD November value read from production. Only the provider download was mocked to fail. The code selected the committed cache and overwrote the newer record:
```json
{
  "before_as_of": "2026-11-13",
  "after_as_of": "2026-11-10",
  "before_difference": -0.042240759761379185,
  "after_difference": -0.0321278946678525,
  "reported_status": "SUCCESS",
  "reported_last_success_at": "2026-11-14T17:09:11.079671+00:00",
  "newer_value_preserved": false,
  "note": "Real ingestion code, provider download mocked; disposable local database only."
}
```

The bundled cache was fetched on 2026-11-10T22:16:57.432409+00:00. The engine omits the cache-use flag and cache-level fetched_at from its returned tuple. Per-observation as_of_date survives, but refresh metadata always writes SUCCESS and a new last_success_at after cached results. write_cache=False also means this refresh path does not update the fallback bundle with the latest successful download. Retain newer valid values, preserve true data timestamps/provenance, and expose a delayed-source status instead of treating fallback as fresh ingestion.

### 2. Public readiness can synchronously trigger ingestion

Local anonymous routing with DEBUG=False and DEV_MOCK_ADMIN=False reached run_once(force=True) through GET /api/ready?refresh=1. Ingestion was mocked, so no network work or production trigger occurred:
```json
{
  "anonymous_local_readiness_status": 503,
  "anonymous_get_reached_forced_ingestion": true,
  "call_kwargs": {
    "force": true
  },
  "note": "Local routing test; ingestion mocked; no production refresh or network work."
}
```

The plain Django readiness view has no staff permission check. This reintroduces long-running ingestion inside a public web request, bypassing the staff queue route. force_trigger_now also discards its trigger_source argument; run_once can record this manually invoked path as worker. Therefore trigger_source=worker alone is insufficient evidence of an unattended run. Remove refresh side effects from readiness and retain authenticated queued POST refreshes with accurate attribution.

### 3. Lease ownership renewal result is unchecked

A controlled local race model returned zero affected rows from the expired-owner renewal after the initial owner read. check_lease returned without rejecting publication:
```json
{
  "at": "2026-11-14T16:58:53.152878+00:00",
  "simulated_outage_returns_bundled_cache": true,
  "cache_fetched_at": "2026-11-10T22:16:57.432409+00:00",
  "cache_provenance_returned_to_caller": false,
  "rejected_when_expired_owner_renewal_updates_zero_rows": false,
  "note": "Controlled local mocks only; no production exploit or state mutation."
}
```

The new checker has no select_for_update lock and does not inspect the conditional renewal update count. This test is a deterministic source-level counterexample, not a production concurrency exploit. Actual takeover/crash fencing remains unproven; restore an atomic ownership/expiry protocol and test real concurrency. Existing 27 tests do not cover this interleaving.

### 4. Coverage flag is permissive

has_usable_coverage checks whether any indicator country map is nonempty. A GDP-only snapshot satisfies it. This flag does not establish all-indicator coverage, source freshness, or valid pair-level calculations. Readiness remains degraded when last_status is not SUCCESS, but the report must not interpret the coverage flag as proof of completeness.

### 5. Bootstrap is not data recovery

Fresh local migration/bootstrap and repeated bootstrap were verified:
```json
{
  "fresh": {
    "countries": 10,
    "indicators": 6,
    "pairs": 30,
    "staff_accounts": 0,
    "observations": 0
  },
  "after_repeat_with_local_test_records": {
    "countries": 10,
    "indicators": 6,
    "pairs": 30,
    "staff_accounts": 1,
    "observations": 1
  },
  "manual_value_preserved": true,
  "database": "C:\\Users\\Akram KAID\\Desktop\\website_projects\\FOREX\\scratch\\shiftfx-latest-audit-20261114\\fresh-ce04fb64.sqlite3",
  "note": "Disposable audit database; no production changes."
}
```

Reference dimensions initialize correctly. Existing records in the same database survive repeated bootstrap. A new empty database has zero staff accounts and observations. No backup restoration of production users, manual settings, audit history, or permissions was demonstrated. No destructive restart experiment was performed.

### 6. Hosting cannot satisfy continuous durable operation

Render Free web services sleep after 15 minutes without inbound traffic and lose filesystem changes on sleep, restart, or redeploy. An in-process worker stops with that service, and local SQLite does not persist user state. Workspace Free hours are shared; keeping both web services running continuously exceeds the 750-hour monthly allowance. These are architectural constraints, not repaired by bootstrap. Source: [Render Free documentation](https://render.com/docs/free).

## Fresh local checks

| Check | Result |
|---|---|
| Node frontend/calendar suites | Exit 0, 12/12 passed; module-type warnings |
| Python source suites | Exit 0, 12/12 passed |
| Django autonomous/equity suites | Exit 0, 27/27 passed |
| makemigrations --check --dry-run | Exit 0; No changes detected |
| showmigrations --plan | All listed local migrations applied |
| Frontend production build | Exit 0; 19/19 static pages generated |
| Autonomous official-feed harness | Exit 0; 363.72 seconds; PARTIAL only from stale Euro Area IMF series |

The harness used its disposable copy of the local database with ENABLE_IN_PROCESS_SCHEDULER=false, avoiding a second incidental scheduler during direct pipeline verification. Local snapshot: 2,809,817 serialized bytes; HTTP 200 and conditional 304. Original suites passing does not negate the additional targeted counterexamples above.

## Verification limits

Desktop/mobile visual behavior, real staff login, staff mutations, production backup contents, restart durability, alert delivery, actual billing usage, and real process-crash/takeover recovery were not fully verified. Browser automation was stopped by its URL-confidence safety check, and no workaround was attempted. No messages or test alerts were sent.

## Evidence

- scratch/shiftfx-latest-audit-20261114/: initial HTTP probes, deployment evidence, readiness observation, targeted local counterexamples, fresh bootstrap results.
- scratch/shiftfx-latest-audit-20261114/progress/: intermediate populated snapshot and anonymous admin checks.
- scratch/shiftfx-latest-audit-20261114/final/: final HTTP records and raw payloads.
- scratch/shiftfx-latest-production.log: automatic-cycle observer output.
- scratch/shiftfx-latest-final.log: final endpoint and coverage output.
- scratch/shiftfx-latest-harness.log: official-feed harness output.
- scratch/shiftfx-latest-build.log: frontend production build output.
