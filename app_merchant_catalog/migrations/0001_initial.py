import uuid
from django.db import migrations, models
import django.db.models.deletion
from django.db.models import Q

class Migration(migrations.Migration):
    initial = True
    dependencies = [("app_bch_flow", "0011_bchidentity_is_demo")]
    operations = [
        migrations.CreateModel(name="MerchantProduct", fields=[
            ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
            ("name", models.CharField(max_length=160)),
            ("sku", models.CharField(blank=True, max_length=64)),
            ("description", models.TextField(blank=True, max_length=2000)),
            ("price", models.DecimalField(decimal_places=8, max_digits=22)),
            ("currency", models.CharField(choices=[("BCH", "BCH"), ("BTC", "BTC"), ("BRL", "BRL")], default="BCH", max_length=3)),
            ("is_pinned", models.BooleanField(default=False)),
            ("position", models.PositiveIntegerField(default=0)),
            ("archived_at", models.DateTimeField(blank=True, null=True)),
            ("created_at", models.DateTimeField(auto_now_add=True)),
            ("updated_at", models.DateTimeField(auto_now=True)),
            ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="catalog_products", to="app_bch_flow.bchorganization")),
        ], options={"db_table": "bchflow_merchant_product", "ordering": ("-is_pinned", "position", "-created_at")}),
        migrations.AddConstraint(model_name="merchantproduct", constraint=models.UniqueConstraint(fields=("organization", "sku"), condition=~Q(sku=""), name="bch_cat_org_sku_unique")),
        migrations.AddConstraint(model_name="merchantproduct", constraint=models.CheckConstraint(condition=Q(price__gte=0), name="bch_cat_price_nonnegative")),
        migrations.AddIndex(model_name="merchantproduct", index=models.Index(fields=("organization", "archived_at", "is_pinned", "position"), name="bch_cat_org_sort_idx")),
    ]
