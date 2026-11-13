"""Chipnet-only P2PKH transaction CLI. Run prepare/broadcast online; sign OFFLINE.
No private keys enter Django, no mainnet support, no automatic spending.
"""
import argparse
import getpass
import hashlib
import json
import os
import sys
from pathlib import Path
import socket
import ssl
ALPHABET='qpzry9x8gf2tvdw0s3jn54khce6mua7l'
def _hash160_from_cashaddr(address):
    payload=address.split(':',1)[1][:-8]
    acc=bits=0; result=bytearray()
    for c in payload:
        acc=(acc<<5)|ALPHABET.index(c); bits+=5
        while bits>=8:
            bits-=8; result.append((acc>>bits)&255)
    if len(result)!=21 or result[0]!=0: raise ValueError('Invalid address payload')
    return bytes(result[1:])
def _rpc(method,params):
    req=json.dumps({'jsonrpc':'2.0','id':1,'method':method,'params':params})+'\n'
    with socket.create_connection(('chipnet.imaginary.cash',50002),timeout=5) as sock:
        with ssl.create_default_context().wrap_socket(sock,server_hostname='chipnet.imaginary.cash') as conn:
            conn.settimeout(8); conn.sendall(req.encode()); data=bytearray()
            while b'\n' not in data:
                part=conn.recv(8192)
                if not part or len(data)+len(part)>524288: raise ValueError('Invalid provider response')
                data.extend(part)
    response=json.loads(bytes(data).split(b'\n',1)[0])
    if not isinstance(response,dict) or response.get('id')!=1 or response.get('error') is not None: raise ValueError('Provider rejected request: '+str(response.get('error')))
    return response.get('result')
from app_bch_flow.wallet.v53b_cashaddr import validate_cashaddr_checksum, compressed_pubkey_to_cashaddr
from app_bch_flow.wallet.selfcustody.offline_bch_signer import (
    TxInput, TxOutput, Transaction, varint, parse_tx, h256,
    pubkey_for_private_key, sign_unsigned_p2pkh, SigningError,
)

DUST=546
MAX_FEE=100000

def address_script(address):
    if not validate_cashaddr_checksum(address, network='chipnet'):
        raise ValueError('Only valid Chipnet P2PKH CashAddr accepted')
    return '76a914'+_hash160_from_cashaddr(address).hex()+'88ac'

def script_hash(script_hex):
    return hashlib.sha256(bytes.fromhex(script_hex)).digest()[::-1].hex()

def checked_utxos(address):
    script=address_script(address)
    sh=script_hash(script)
    tip=_rpc('blockchain.headers.subscribe', [])
    rows=_rpc('blockchain.scripthash.listunspent',[sh])
    if not isinstance(tip,dict) or type(tip.get('height')) is not int or not isinstance(rows,list):
        raise ValueError('Invalid provider response')
    found=[]; seen=set()
    for r in rows:
        txid=r.get('tx_hash'); n=r.get('tx_pos'); amount=r.get('value'); height=r.get('height')
        if not isinstance(txid,str) or len(txid)!=64 or any(c not in '0123456789abcdefABCDEF' for c in txid): raise ValueError('Invalid txid')
        if type(n)!=int or not 0<=n<100000 or type(amount)!=int or not 0<amount<=2100000000000000: raise ValueError('Invalid UTXO')
        if type(height)!=int or not 0<=height<=tip['height']: raise ValueError('Invalid height')
        if (txid,n) in seen: raise ValueError('Duplicate UTXO')
        seen.add((txid,n))
        found.append(dict(txid=txid.lower(),vout=n,amount_sats=amount,pubkey_hash=script[6:46],confirmations=(tip['height']-height+1 if height else 0)))
    return found

def prepare(source,destination,change,amount,fee,minimum_confirmations):
    if len({source,destination,change})!=3: raise ValueError('Source, destination, change must be distinct')
    for addr in (source,destination,change): address_script(addr)
    if not (DUST<=amount<=2100000000000000 and 0<fee<=MAX_FEE): raise ValueError('Invalid amount or fee')
    utxos=sorted((u for u in checked_utxos(source) if u['confirmations']>=minimum_confirmations),key=lambda u:(u['amount_sats'],u['txid'],u['vout']))
    chosen=[]; total=0
    for u in utxos:
        chosen.append(u); total+=u['amount_sats']
        if total>=amount+fee+DUST: break
    if total<amount+fee+DUST: raise ValueError('Insufficient confirmed UTXOs including dedicated change dust')
    if len(chosen)>50: raise ValueError('Too many inputs')
    outputs=[{'amount_sats':amount,'script_pubkey':address_script(destination)}, {'amount_sats':total-amount-fee,'script_pubkey':address_script(change)}]
    tx=Transaction(2,tuple(TxInput(bytes.fromhex(u['txid'])[::-1],u['vout'],b'',0xffffffff) for u in chosen),tuple(TxOutput(o['amount_sats'],bytes.fromhex(o['script_pubkey'])) for o in outputs),0)
    return {'schema':'bchflow-chipnet-p2pkh-v4','network':'chipnet','source':source,'destination':destination,'change':change,'amount_sats':amount,'fee_sats':fee,'unsigned_hex':tx.serialize().hex(),'prevouts':chosen,'expected_outputs':outputs,'provider_evidence':'single_electrum_unverified','warning':'Signer must independently verify UTXOs, source ownership, destination and change ownership. Never trust package alone.'}

def load_package(path):
    data=json.loads(Path(path).read_text(encoding='utf-8'))
    if data.get('schema')!='bchflow-chipnet-p2pkh-v4' or data.get('network')!='chipnet': raise ValueError('Unsupported package/network')
    return data

def sign_offline(package):
    for addr in (package['source'],package['destination'],package['change']): address_script(addr)
    if len({package['source'],package['destination'],package['change']})!=3: raise ValueError('Unsafe change address')
    if package['expected_outputs'] != [{'amount_sats':package['amount_sats'],'script_pubkey':address_script(package['destination'])},{'amount_sats':sum(x['amount_sats'] for x in package['prevouts'])-package['amount_sats']-package['fee_sats'],'script_pubkey':address_script(package['change'])}]: raise ValueError('Package output mismatch')
    if not 0<package['fee_sats']<=MAX_FEE: raise ValueError('Fee exceeds safety limit')
    print('OFFLINE SIGNING. Verify source, destination, change, amounts, and UTXOs against an independent trusted source.')
    print('Destination:',package['destination'],'Amount sats:',package['amount_sats'])
    print('Change:',package['change'],'Fee sats:',package['fee_sats'])
    print('Inputs:',[(u['txid'],u['vout'],u['amount_sats']) for u in package['prevouts']])
    if input('Type CHIPNET to authorize signing: ').strip()!='CHIPNET': raise ValueError('User rejected')
    keys=[]
    try:
        for u in package['prevouts']:
            key=bytes.fromhex(getpass.getpass('Private key HEX (32 bytes) for input '+u['txid'][:10]+': ').strip())
            _,pub=pubkey_for_private_key(key)
            if compressed_pubkey_to_cashaddr(pub,network='chipnet')!=package['source']: raise ValueError('Key does not own source address')
            keys.append(key)
        signed=sign_unsigned_p2pkh(unsigned_hex=package['unsigned_hex'],prevouts=package['prevouts'],private_keys=keys,expected_outputs=package['expected_outputs'],max_fee_sats=package['fee_sats'])
        return signed
    finally:
        # Python cannot guarantee secure memory erasure; use a dedicated offline machine.
        keys.clear()

def broadcast(signed_hex):
    if not isinstance(signed_hex,str) or len(signed_hex)>200000 or len(signed_hex)%2: raise ValueError('Invalid raw transaction')
    raw=bytes.fromhex(signed_hex)
    if not 10<len(raw)<=100000: raise ValueError('Invalid raw size')
    expected=h256(raw)[::-1].hex()
    returned=_rpc('blockchain.transaction.broadcast',[signed_hex])
    if returned!=expected: raise ValueError('Provider returned mismatched TXID')
    return expected

def main(argv=None):
    parser=argparse.ArgumentParser(description='BCH Flow V4 Chipnet-only CLI')
    sub=parser.add_subparsers(dest='command',required=True)
    a=sub.add_parser('balance'); a.add_argument('--address',required=True)
    a=sub.add_parser('prepare'); a.add_argument('--source',required=True); a.add_argument('--destination',required=True); a.add_argument('--change',required=True); a.add_argument('--amount-sats',type=int,required=True); a.add_argument('--fee-sats',type=int,required=True); a.add_argument('--min-confirmations',type=int,default=1); a.add_argument('--out',required=True)
    a=sub.add_parser('sign-offline'); a.add_argument('--package',required=True); a.add_argument('--out',required=True)
    a=sub.add_parser('broadcast'); a.add_argument('--signed',required=True); a.add_argument('--confirm-broadcast',action='store_true')
    a=sub.add_parser('status'); a.add_argument('--txid',required=True)
    args=parser.parse_args(argv)
    if args.command=='balance': print(json.dumps(checked_utxos(args.address),indent=2))
    elif args.command=='prepare':
        if args.min_confirmations<1: raise ValueError('Require confirmed UTXOs')
        data=prepare(args.source,args.destination,args.change,args.amount_sats,args.fee_sats,args.min_confirmations)
        path=Path(args.out); path.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8'); print('Unsigned signing package:',path)
    elif args.command=='sign-offline':
        signed=sign_offline(load_package(args.package))
        path=Path(args.out); path.write_text(signed+'\n',encoding='ascii'); print('Signed transaction saved:',path)
    elif args.command=='broadcast':
        if not args.confirm_broadcast: raise ValueError('Explicit --confirm-broadcast required')
        print('Broadcast TXID:',broadcast(Path(args.signed).read_text(encoding='ascii').strip()))
    elif args.command=='status':
        if len(args.txid)!=64 or any(c not in '0123456789abcdefABCDEF' for c in args.txid): raise ValueError('Invalid TXID')
        print(json.dumps(_rpc('blockchain.transaction.get',[args.txid,True]),indent=2))

if __name__=='__main__':
    try: main()
    except (ValueError,KeyError,TypeError,SigningError,OSError) as exc:
        print('ERROR:',exc,file=sys.stderr); sys.exit(1)
