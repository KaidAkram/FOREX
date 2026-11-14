# ShiftFX operational verification

User requested read-only production health, snapshot, calendar, unattended cycle evidence, and local test runs.
No bounty submission or security exploitation is part of this task.
Production evidence is stored in scratch/production-audit-20261114; monitor only sends GET requests.
Local main is e33da1d. Node 12/12, Python 12/12, Django 26/26 passed in this run.
Live data snapshot is empty despite HTTP 200 and worker_alive true. Root cause requires production logs/database access.
Local network harness runs against a disposable copied database with ENABLE_IN_PROCESS_SCHEDULER=false to avoid a second concurrent scheduler.

Final verification: local harness exit 0, 434.72 seconds, PARTIAL only from stale IMF Euro Area reserves. Production frontend e33da1d is Live; backend e33da1d deploy failed and active backend remains 67fd4e8. Both services are Free (authenticated Render inspection).
Observed two unattended failed cycles at 11:50–11:51 and 11:55–11:56 UTC; logs report MacroIndicator.DoesNotExist. Monitor stopped after 32 GET probes spanning 11:35:35–11:56:39 UTC; no successful cycle or nonempty snapshot. Weak conditional ETags return 200; strong form returns 304 on both routes.
Final report: memory/shiftfx-verification/REPORT.md. No production or application source changes made.
