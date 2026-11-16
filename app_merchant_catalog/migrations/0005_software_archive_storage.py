from django.db import migrations, models
import app_merchant_catalog.software_storage


class Migration(migrations.Migration):
    dependencies = [
        ('app_merchant_catalog', '0004_softwareoffer_softwareorder_softwaredownload_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='softwarerelease', name='archive',
            field=models.FileField(
                upload_to='software/releases/%Y/%m/',
                storage=app_merchant_catalog.software_storage.software_archive_storage,
            ),
        ),
    ]
