import os,sys,sqlite3,pathlib,json,time
root=pathlib.Path(__file__).resolve().parents[1]
backend=root/'fx-macro-bias'/'backend'
target=root/'scratch'/'autonomous-verification.sqlite3'
source=sqlite3.connect('file:'+str(backend/'db.sqlite3')+'?mode=ro',uri=True)
dest=sqlite3.connect(target)
source.backup(dest);dest.close();source.close()
os.environ['DJANGO_SETTINGS_MODULE']='config.settings.development'
os.environ['FOREX_DB_PATH']=str(target)
sys.path.insert(0,str(backend));sys.path.insert(0,str(root))
import django
django.setup()
from django.core.management import call_command
call_command('migrate',interactive=False,verbosity=0)
from apps.macro.services.scraper_orchestrator import ScraperOrchestrator
from apps.macro.models import MacroDataPoint,SystemSetting
start=time.monotonic()
result=ScraperOrchestrator.run_full_pipeline('verification')
print('PIPELINE',result['status'],'seconds',round(time.monotonic()-start,2),flush=True)
for slug,status in result['indicators'].items():print(slug,status.get('status'),status.get('errors',[]),flush=True)
for iso,slug in [('GBP','gdp'),('GBP','ca_gdp'),('EUR','ca_gdp'),('NOK','cpi'),('AUD','fx_reserves'),('JPY','fx_reserves'),('NOK','fx_reserves')]:
 p=MacroDataPoint.objects.filter(country__iso_code=iso,indicator__slug=slug,is_active_value=True).order_by('-month').first()
 print('LATEST',iso,slug,str(p.month),p.value,p.source,flush=True)
snapshot=SystemSetting.objects.get(key='public_macro_snapshot').value
print('SNAPSHOT',snapshot['version'],len(json.dumps(snapshot)),'bytes',flush=True)
from django.test import Client,override_settings
with override_settings(ALLOWED_HOSTS=['testserver']):
 client=Client();start=time.monotonic();response=client.get('/api/live/snapshot');elapsed=time.monotonic()-start
 print('HTTP',response.status_code,'seconds',round(elapsed,3),'ETAG',client.get('/api/live/snapshot',HTTP_IF_NONE_MATCH=response['ETag']).status_code,flush=True)
assert snapshot['data']['GDP']['United Kingdom'].get('2026-09')==1.9
assert '2026-06' in snapshot['data']['Current Account']['Euro Area']
