import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from rest_framework.test import APIRequestFactory
from apps.macro.models import SystemSetting, AuditLog
from apps.macro.views.settings import (
    DEFAULT_SETTINGS,
    settings_config,
    trigger_scraper_pipeline,
    scraper_audit_logs,
)
from apps.macro.services.calculator import recalculate_full_matrix

factory = APIRequestFactory()

print("=" * 80)
print("COMPREHENSIVE SETTINGS TEST SUITE — BACKEND & ENGINE AUDIT")
print("=" * 80)

# Test 1: GET /settings (Default State & Retrieval)
print("\n[TEST 1: GET /api/settings — Config Retrieval]")
request = factory.get("/api/settings")
response = settings_config(request)
assert response.status_code == 200, f"Expected 200, got {response.status_code}"
res_data = response.data
assert res_data.get("success") is True, "success must be True"
settings_dict = res_data.get("settings", {})
print(f"  Retrieved {len(settings_dict)} settings keys.")
expected_keys = [
    "cronPreset", "customCron", "timezone", "cronActive", "rangePreset",
    "startDate", "endDate", "scraperLang", "systemUIRefLang", "concurrency",
    "timeoutSec", "proxyRotation", "retryAttempts", "notifyOnSuccess",
    "notifyOnError", "webhookUrl", "lastScrapeTime"
]
missing_keys = [k for k in expected_keys if k not in settings_dict]
assert len(missing_keys) == 0, f"Missing expected keys: {missing_keys}"
print(f"  All {len(expected_keys)} configuration keys present.")
print("  => TEST 1 PASSED: GET /api/settings verified.")

# Test 2: POST /settings — Valid Update & Persistence
print("\n[TEST 2: POST /api/settings — Valid Update & DB Persistence]")
update_payload = {
    "cronPreset": "hourly",
    "customCron": "0 * * * *",
    "timezone": "Europe/London",
    "cronActive": True,
    "concurrency": 4,
    "timeoutSec": 45,
    "retryAttempts": 5,
    "webhookUrl": "https://discord.com/api/webhooks/test-macro"
}
request = factory.post("/api/settings", data=update_payload, format="json")
response = settings_config(request)
assert response.status_code == 200, f"Expected 200, got {response.status_code}"
updated_settings = response.data.get("settings", {})
assert updated_settings.get("cronPreset") == "hourly", "cronPreset not updated"
assert updated_settings.get("timezone") == "Europe/London", "timezone not updated"
assert updated_settings.get("concurrency") == 4, "concurrency not updated"
assert updated_settings.get("timeoutSec") == 45, "timeoutSec not updated"
assert updated_settings.get("retryAttempts") == 5, "retryAttempts not updated"

# Verify DB state directly
db_obj = SystemSetting.objects.filter(key="scraper_settings").first()
assert db_obj is not None, "SystemSetting record must exist in DB!"
assert db_obj.value.get("timezone") == "Europe/London", "DB value not persisted!"
print(f"  DB record successfully verified (ID: {db_obj.id}, Updated: {db_obj.updated_at})")

# Verify AuditLog created
latest_audit = AuditLog.objects.filter(entity_type="SystemSetting", entity_id="scraper_settings").order_by("-created_at").first()
assert latest_audit is not None, "AuditLog must be recorded!"
assert latest_audit.action in ["created", "updated"], f"Unexpected action: {latest_audit.action}"
print(f"  AuditLog successfully verified (ID: {latest_audit.id}, Action: {latest_audit.action}, Notes: {latest_audit.notes})")
print("  => TEST 2 PASSED: Settings persistence and audit logging verified.")

# Test 3: POST /settings — Bounds & Error Validation
print("\n[TEST 3: POST /api/settings — Bounds Clamping & Error Validation]")
# Case 3a: Concurrency clamping (e.g. value 99 should clamp to 8, value 0 should clamp to 1)
clamp_payload = {"concurrency": 20, "timeoutSec": 300, "retryAttempts": 50}
request = factory.post("/api/settings", data=clamp_payload, format="json")
response = settings_config(request)
assert response.status_code == 200
clamped = response.data.get("settings", {})
assert clamped.get("concurrency") == 8, f"Expected concurrency 8, got {clamped.get('concurrency')}"
assert clamped.get("timeoutSec") == 120, f"Expected timeoutSec 120, got {clamped.get('timeoutSec')}"
assert clamped.get("retryAttempts") == 10, f"Expected retryAttempts 10, got {clamped.get('retryAttempts')}"
print(f"  Upper bounds clamped successfully: concurrency={clamped.get('concurrency')} (max 8), timeout={clamped.get('timeoutSec')}s (max 120s), retries={clamped.get('retryAttempts')} (max 10).")

# Case 3b: Lower bounds clamping
clamp_payload_low = {"concurrency": -5, "timeoutSec": 1, "retryAttempts": -2}
request = factory.post("/api/settings", data=clamp_payload_low, format="json")
response = settings_config(request)
assert response.status_code == 200
clamped_low = response.data.get("settings", {})
assert clamped_low.get("concurrency") == 1, f"Expected concurrency 1, got {clamped_low.get('concurrency')}"
assert clamped_low.get("timeoutSec") == 5, f"Expected timeoutSec 5, got {clamped_low.get('timeoutSec')}"
assert clamped_low.get("retryAttempts") == 0, f"Expected retryAttempts 0, got {clamped_low.get('retryAttempts')}"
print(f"  Lower bounds clamped successfully: concurrency={clamped_low.get('concurrency')} (min 1), timeout={clamped_low.get('timeoutSec')}s (min 5s), retries={clamped_low.get('retryAttempts')} (min 0).")

# Case 3c: Invalid string inputs
invalid_payload = {"concurrency": "not_a_number"}
request = factory.post("/api/settings", data=invalid_payload, format="json")
response = settings_config(request)
assert response.status_code == 400, f"Expected 400 Bad Request, got {response.status_code}"
assert "error" in response.data, "Must contain error message"
print(f"  Invalid parameter correctly rejected with HTTP 400: {response.data.get('error')}")
print("  => TEST 3 PASSED: Bounds clamping and input validation verified.")

# Test 4: POST /settings/run-scraper — Live Pipeline Execution
print("\n[TEST 4: POST /api/settings/run-scraper — On-Demand Pipeline Trigger]")
request = factory.post("/api/settings/run-scraper")
response = trigger_scraper_pipeline(request)
assert response.status_code == 200, f"Expected 200, got {response.status_code}"
res_scrape = response.data
assert res_scrape.get("success") is True
records_count = res_scrape.get("records_updated")
last_time = res_scrape.get("last_scrape_time")
print(f"  Pipeline execution returned: records_updated={records_count}, last_scrape_time={last_time}")
assert records_count is not None and records_count > 0, "Records count must be positive"

# Check DB lastScrapeTime updated
db_obj_after = SystemSetting.objects.filter(key="scraper_settings").first()
assert db_obj_after.value.get("lastScrapeTime") == last_time, "lastScrapeTime must be updated in DB!"

# Check Execution AuditLog created
scrape_audit = AuditLog.objects.filter(entity_type="ScraperExecution", action="executed").order_by("-created_at").first()
assert scrape_audit is not None, "Scraper execution audit log must exist!"
print(f"  Scraper Execution AuditLog created: ID={scrape_audit.id}, Notes={scrape_audit.notes}")
print("  => TEST 4 PASSED: Live pipeline trigger and audit telemetry verified.")

# Test 5: GET /settings/audit-logs — Telemetry & Feed Registry
print("\n[TEST 5: GET /api/settings/audit-logs — Verification Telemetry]")
request = factory.get("/api/settings/audit-logs")
response = scraper_audit_logs(request)
assert response.status_code == 200, f"Expected 200, got {response.status_code}"
res_audit = response.data
assert res_audit.get("success") is True
runs = res_audit.get("runs", [])
indicator_feeds = res_audit.get("indicator_feeds", [])
math_specs = res_audit.get("math_formula_specs", {})
print(f"  Returned {len(runs)} execution runs, {len(indicator_feeds)} indicator feeds, and {len(math_specs)} math specs.")
assert len(runs) > 0, "Runs list cannot be empty!"
assert len(indicator_feeds) == 6, f"Expected 6 indicator feeds, got {len(indicator_feeds)}"
expected_codes = ["CPI", "GDP", "Interest Rate", "Current Account", "FX Reserves", "Equity"]
for feed in indicator_feeds:
    assert feed["code"] in expected_codes, f"Unknown indicator feed code: {feed['code']}"
    assert "Healthy" in feed["status"], f"Feed status unhealthy: {feed['status']}"
print(f"  All 6 indicator feeds verified healthy: {[f['code'] for f in indicator_feeds]}")

assert "step_1_differential" in math_specs
assert "step_2_rating_rule" in math_specs
assert "step_3_final_composite_score" in math_specs
assert "step_4_regime_classification" in math_specs
print("  All 4 math proof steps verified.")
print("  => TEST 5 PASSED: Audit logs telemetry verified.")

print("\n" + "=" * 80)
print("ALL BACKEND SETTINGS TESTS PASSED (100% SUCCESS)!")
print("=" * 80)
