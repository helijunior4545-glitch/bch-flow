from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [("app_merchant_catalog", "0001_initial")]
    operations = [migrations.AddField(model_name="merchantproduct", name="image", field=models.FileField(blank=True, upload_to="merchant_catalog/products/"))]
