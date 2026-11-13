from django.db import migrations, models
class Migration(migrations.Migration):
    dependencies = [('macro', '0003_workerlease')]
    operations = [migrations.AlterField(model_name='macrodatapoint', name='status', field=models.CharField(max_length=20, default='published', choices=[('published','Published'),('forecast','Forecast / Estimate'),('manual','Manual Override'),('revised','Revised'),('missing','Missing')]))]
