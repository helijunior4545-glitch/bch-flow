from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [("app_merchant_catalog", "0002_product_image"), ("app_bch_flow", "0011_bchidentity_is_demo")]
    operations = [migrations.CreateModel(
        name="ReceiptProductSnapshot",
        fields=[
            ("request", models.OneToOneField(primary_key=True, serialize=False, on_delete=django.db.models.deletion.PROTECT, related_name="catalog_snapshot", to="app_bch_flow.flowrequest")),
            ("product", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="receipt_snapshots", to="app_merchant_catalog.merchantproduct")),
            ("name", models.CharField(max_length=160)),
            ("sku", models.CharField(max_length=64, blank=True)),
            ("description", models.TextField(max_length=2000, blank=True)),
            ("currency", models.CharField(max_length=3)),
            ("price", models.DecimalField(max_digits=22, decimal_places=8)),
            ("created_at", models.DateTimeField(auto_now_add=True)),
        ], options={"db_table":"bchflow_receipt_product_snapshot"}
    )]
