# V4.3 - schema-only; never settles a payment.
import uuid
import django.db.models.deletion
from django.db import migrations,models
from django.db.models import Q

class Migration(migrations.Migration):
    dependencies=[('app_bch_flow','0001_initial')]
    operations=[migrations.CreateModel(
        name='BCHOutpointReservation',
        fields=[
            ('id',models.UUIDField(default=uuid.uuid4,editable=False,primary_key=True,serialize=False)),
            ('network',models.CharField(max_length=16)),
            ('txid',models.CharField(max_length=64)),
            ('output_index',models.PositiveIntegerField()),
            ('created_at',models.DateTimeField(auto_now_add=True)),
            ('organization',models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to='app_bch_flow.bchorganization')),
            ('invoice',models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to='app_bch_flow.bchinvoice')),
            ('evidence_event',models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to='app_bch_flow.bchfinancialevent')),
        ],
        options={'db_table':'bchflow_outpoint_reservation','constraints':[
            models.UniqueConstraint(fields=('network','txid','output_index'),name='bch_reservation_unique_outpoint'),
            models.CheckConstraint(condition=Q(network__in=['mainnet','chipnet']),name='bch_reservation_network'),
        ]},
    )]
