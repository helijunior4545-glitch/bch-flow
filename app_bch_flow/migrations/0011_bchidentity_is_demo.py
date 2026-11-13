from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('app_bch_flow', '0010_multiple_wallets')]
    operations = [migrations.AddField(
        model_name='bchidentity', name='is_demo',
        field=models.BooleanField(default=False, editable=False),
    )]
