from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [('macro', '0002_systemsetting')]
    operations = [migrations.CreateModel(name='WorkerLease', fields=[
        ('name', models.CharField(max_length=50, primary_key=True, serialize=False)),
        ('owner', models.CharField(max_length=64, blank=True)),
        ('expires_at', models.DateTimeField()),
        ('heartbeat_at', models.DateTimeField()),
    ])]
