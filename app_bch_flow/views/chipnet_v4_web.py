"""Chipnet web transaction handoff. No keys, seeds or signing in the web app."""
import json
from django.conf import settings
from django.core import signing
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods
from django.views.decorators.cache import never_cache
from app_bch_flow.models import BCHMembership
from app_bch_flow.views.authentication import current_identity
from app_bch_flow.wallet.chipnet_v4_cli import prepare, broadcast, address_script
from app_bch_flow.wallet.selfcustody.offline_bch_signer import Reader, TxInput, TxOutput, Transaction, h256
from django.utils.html import escape

SALT='bchflow-chipnet-web-v4'

def _member(request, org_id):
    identity=current_identity(request)
    if not identity: return None
    return BCHMembership.objects.filter(identity=identity,organization_id=org_id,is_active=True,organization__is_active=True,role__in=('owner','admin')).first()

def _decode_signed(raw):
    if not isinstance(raw,str) or len(raw)>200000 or len(raw)%2: raise ValueError('Invalid signed transaction')
    r=Reader(bytes.fromhex(raw)); version=r.number(4); count=r.vi()
    if version not in (1,2) or not 1<=count<=50: raise ValueError('Invalid transaction structure')
    ins=[]
    for _ in range(count):
        h=r.take(32); idx=r.number(4); size=r.vi()
        if not 0<size<=250: raise ValueError('Invalid signature script size')
        script=r.take(size)
        if b'\x41' not in script: raise ValueError('Missing BCH forkid marker')
        ins.append(TxInput(h,idx,script,r.number(4)))
    n=r.vi()
    if n!=2: raise ValueError('Exactly two outputs required')
    outs=[]
    for _ in range(n):
        value=r.number(8); size=r.vi()
        if size!=25: raise ValueError('Only P2PKH outputs accepted')
        outs.append(TxOutput(value,r.take(size)))
    locktime=r.number(4)
    if r.pos!=len(r.data): raise ValueError('Trailing bytes')
    if len({(i.prev_hash,i.index) for i in ins})!=len(ins): raise ValueError('Duplicate inputs')
    return Transaction(version,tuple(ins),tuple(outs),locktime)

def _match_package(raw,pkg):
    signed=_decode_signed(raw)
    unsigned=Transaction(signed.version,tuple(TxInput(i.prev_hash,i.index,b'',i.sequence) for i in signed.inputs),signed.outputs,signed.locktime)
    if unsigned.serialize().hex()!=pkg['unsigned_hex']: raise ValueError('Signed transaction does not match authorized proposal')
    if [dict(amount_sats=o.value,script_pubkey=o.script.hex()) for o in signed.outputs]!=pkg['expected_outputs']:
        raise ValueError('Transaction outputs differ from proposal')
    return h256(bytes.fromhex(raw))[::-1].hex()

@never_cache
@require_http_methods(['GET','POST'])
def workspace(request,org_id):
    member=_member(request,org_id)
    if not member:
        if not current_identity(request): return redirect('bch_flow:login')
        raise Http404
    ctx={'member':member,'error':'','package':None,'token':None,'txid':None,'network':'chipnet'}
    if request.method=='POST':
        action=request.POST.get('action')
        try:
            if action=='prepare':
                source=request.POST.get('source','').strip(); destination=request.POST.get('destination','').strip(); change=request.POST.get('change','').strip()
                amount=int(request.POST.get('amount_sats','')); fee=int(request.POST.get('fee_sats',''))
                pkg=prepare(source,destination,change,amount,fee,1)
                ctx['package']=json.dumps(pkg,indent=2)
                ctx['token']=signing.dumps({'org':str(org_id),'actor':str(member.identity_id),'package':pkg},salt=SALT,compress=True)
            elif action=='broadcast':
                token=request.POST.get('token',''); raw=request.POST.get('signed_hex','').strip()
                if len(token)>25000: raise ValueError('Invalid authorization token')
                data=signing.loads(token,salt=SALT,max_age=600)
                if data.get('org')!=str(org_id) or data.get('actor')!=str(member.identity_id): raise ValueError('Wrong organization or signer')
                pkg=data['package']; expected=_match_package(raw,pkg)
                if request.POST.get('confirmation')!='BROADCAST CHIPNET': raise ValueError('Explicit confirmation required')
                txid=broadcast(raw)
                if txid!=expected: raise ValueError('TXID mismatch')
                ctx['txid']=txid
            else: raise ValueError('Invalid action')
        except (ValueError,TypeError,KeyError,signing.BadSignature,OverflowError,OSError) as exc:
            ctx['error']=str(exc)[:300]
    response=render(request,'app_bch_flow/wallet_v41/chipnet_v4.html',ctx,status=400 if ctx['error'] else 200)
    response['Cache-Control']='no-store'; response['Referrer-Policy']='no-referrer'
    return response
