from datetime import date, datetime, timezone, timedelta
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.macro.models import Country, MacroIndicator, MacroDataPoint, SystemSetting, WorkerLease, AuditLog
from apps.macro.services.ingestion import normalize, sync_indicator, fetch_oecd
from apps.macro.services.scraper_orchestrator import compute_next_cron_run
from apps.macro.services.scheduler import acquire_lease, release_lease, queue_refresh
from apps.macro.services.snapshot import publish_snapshot
from apps.macro.signals import disable_macro_signals

class AutonomousPipelineTests(TestCase):
    def setUp(self):
        self.uk = Country.objects.create(name='United Kingdom', iso_code='GBP', trading_economics_slug='united-kingdom', oecd_country_code='GBR')
        self.gdp = MacroIndicator.objects.create(name='GDP', slug='gdp', default_source='TE')
        self.ca = MacroIndicator.objects.create(name='Current Account', slug='ca_gdp', default_source='OECD')

    def test_quarter_expansion_and_future_year(self):
        values = normalize({'2027-03-01': 1.9}, quarterly=True, today=date(2027,5,1))
        self.assertEqual(list(values), [date(2027,1,1), date(2027,2,1), date(2027,3,1)])
        self.assertEqual(set(values.values()), {1.9})

    def test_invalid_source_cannot_publish(self):
        for points in ({}, {'2026-09-01': float('nan')}, {'2026-07-01': 1.9}):
            with self.assertRaises(ValueError): normalize(points, quarterly=True)

    @patch('apps.macro.services.ingestion.fetch_ons_gdp')
    def test_new_uk_gdp_reaches_snapshot_without_rebuild(self, fetch):
        fetch.return_value = ({'2026-09-01': 1.9}, 'ONS')
        result = sync_indicator('gdp')
        self.assertEqual(result['points'], 3)
        self.assertEqual(MacroDataPoint.objects.filter(indicator=self.gdp).count(), 3)
        payload = publish_snapshot()
        self.assertEqual(payload['cells']['GDP']['United Kingdom']['2026-09']['value'], 1.9)
        self.assertEqual(sync_indicator('gdp')['points'], 0)

    @patch('apps.macro.services.ingestion.fetch_ons_gdp', side_effect=OSError('offline'))
    @patch('apps.macro.services.ingestion.fetch_te', side_effect=OSError('offline'))
    def test_failure_preserves_data_and_reports_country(self, te, ons):
        with disable_macro_signals():
            MacroDataPoint.objects.create(country=self.uk, indicator=self.gdp, month=date(2026,6,1), value=1.4)
        result = sync_indicator('gdp')
        self.assertEqual(result['status'], 'PARTIAL')
        self.assertTrue(result['errors'])
        self.assertEqual(MacroDataPoint.objects.get().value, 1.4)
        self.assertEqual(SystemSetting.objects.get(key='feed:gdp:GBP').value['status'], 'ERROR')

    @patch('apps.macro.services.ingestion.fetch_oecd')
    def test_uk_q2_current_account_is_no_longer_excluded(self, fetch):
        fetch.return_value = ({'2026-06-01': -2.532022}, 'OECD')
        sync_indicator('ca_gdp')
        self.assertEqual(MacroDataPoint.objects.filter(indicator=self.ca).count(), 3)
        self.assertEqual(MacroDataPoint.objects.get(month=date(2026,6,1)).value, -2.532022)

    @patch('apps.macro.services.ingestion.fetch_ons_gdp')
    def test_revision_is_audited_and_short_response_does_not_delete(self, fetch):
        fetch.return_value = ({'2026-06-01': 1.4, '2026-09-01': 1.9}, 'ONS')
        sync_indicator('gdp')
        fetch.return_value = ({'2026-06-01': 1.5}, 'ONS')
        sync_indicator('gdp')
        self.assertEqual(MacroDataPoint.objects.get(month=date(2026,9,1)).value, 1.9)
        self.assertEqual(MacroDataPoint.objects.get(month=date(2026,6,1)).status, 'revised')
        self.assertTrue(AuditLog.objects.filter(action='revised').exists())

    def test_custom_cron_and_timezone(self):
        now = datetime(2026,11,13,13,1,tzinfo=timezone.utc)
        self.assertEqual(compute_next_cron_run('custom','*/5 * * * *',now).minute,5)
        self.assertEqual(compute_next_cron_run('daily','',now,'Asia/Tokyo').hour,15)
        with self.assertRaises(ValueError): compute_next_cron_run('custom','bad',now)

    def test_worker_exclusion_and_crash_recovery(self):
        self.assertTrue(acquire_lease('a'))
        self.assertFalse(acquire_lease('b'))
        release_lease('b')
        self.assertEqual(WorkerLease.objects.get().owner,'a')
        WorkerLease.objects.update(expires_at=datetime.now(timezone.utc)-timedelta(seconds=1))
        self.assertTrue(acquire_lease('b'))

    def test_public_snapshot_omits_manual_values_and_settings(self):
        with disable_macro_signals():
            MacroDataPoint.objects.create(country=self.uk, indicator=self.gdp, month=date(2026,9,1), value=999, status='manual')
        SystemSetting.objects.create(key='scraper_settings',value={'webhookUrl':'secret'})
        payload=publish_snapshot()
        self.assertEqual(payload['data']['GDP'],{})
        self.assertNotIn('secret',str(payload))
        response=self.client.get('/api/live/snapshot')
        self.assertEqual(response.status_code,200)
        self.assertEqual(self.client.get('/api/live/snapshot',HTTP_IF_NONE_MATCH=response['ETag']).status_code,304)

    @override_settings(DEBUG=False, DEV_MOCK_ADMIN=False)
    @patch('apps.macro.services.scraper_orchestrator.ScraperOrchestrator.run_full_pipeline')
    def test_refresh_is_queued_without_fetching_on_request(self, run):
        client=APIClient()
        client.force_authenticate(get_user_model().objects.create_user('admin-test',is_staff=True))
        response=client.post('/api/admin/settings/run-scraper')
        self.assertEqual(response.status_code,202)
        self.assertEqual(response.data['status'],'QUEUED')
        self.assertTrue(SystemSetting.objects.filter(key='refresh_request').exists())
        run.assert_not_called()

    def test_expired_worker_cannot_publish(self):
        from apps.macro.services.fencing import worker_owner, check_lease
        from django.db import transaction
        acquire_lease('old')
        WorkerLease.objects.update(owner='new')
        token = worker_owner.set('old')
        try:
            with transaction.atomic(), self.assertRaises(RuntimeError):
                check_lease()
        finally:
            worker_owner.reset(token)

    @override_settings(DEBUG=False, DEV_MOCK_ADMIN=False)
    def test_manual_entry_cannot_replace_official_revision(self):
        with disable_macro_signals():
            MacroDataPoint.objects.create(country=self.uk, indicator=self.gdp, month=date(2026,9,1), value=1.9, status='revised')
        client=APIClient()
        client.force_authenticate(get_user_model().objects.create_user('revision-admin',is_staff=True))
        response=client.post('/api/admin/macro-data/manual-entry',{'country_iso':'GBP','indicator_slug':'gdp','month':'2026-09','value':99})
        self.assertEqual(response.status_code,409)
        self.assertEqual(MacroDataPoint.objects.get().value,1.9)
