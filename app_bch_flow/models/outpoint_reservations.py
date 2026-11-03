"""V4.3: immutable claim to an unverified output; NEVER a settlement."""
import uuid
from django.db import models
from django.db.models import Q

class BCHOutpointReservation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey('app_bch_flow.BCHOrganization', on_delete=models.PROTECT)
    invoice = models.ForeignKey('app_bch_flow.BCHInvoice', on_delete=models.PROTECT)
    evidence_event = models.ForeignKey('app_bch_flow.BCHFinancialEvent', on_delete=models.PROTECT)
    network = models.CharField(max_length=16)
    txid = models.CharField(max_length=64)
    output_index = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'bchflow_outpoint_reservation'
        constraints = [
            models.UniqueConstraint(fields=['network','txid','output_index'], name='bch_reservation_unique_outpoint'),
            models.CheckConstraint(condition=Q(network__in=['mainnet','chipnet']),name='bch_reservation_network'),
        ]
