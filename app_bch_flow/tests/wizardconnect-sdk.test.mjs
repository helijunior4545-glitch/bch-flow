import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WebSocketServer} from 'ws';
import {initiateDappRelay} from '@wizardconnect/core';
import {DappConnectionManager} from '@wizardconnect/dapp';
import {WalletConnectionManager} from '@wizardconnect/wallet';
import {binToHex,decodeHdPublicKey,deriveHdPath} from '@bitauth/libauth';
import {walletSigningRequest,validateSignedResponse} from '../frontend/src/wizard-protocol.js';

const fixture=JSON.parse(readFileSync(process.env.FLOW_WIZARD_FIXTURE_PATH,'utf8'));
function matches(event,filter){return (!filter.kinds||filter.kinds.includes(event.kind))&&(!filter['#p']||event.tags.some(tag=>tag[0]==='p'&&filter['#p'].includes(tag[1])));}

test('official dapp and wallet SDKs pair and exchange an encrypted BCH signing request',{timeout:25000},async()=>{
 const server=new WebSocketServer({host:'127.0.0.1',port:0});await new Promise(r=>server.once('listening',r));
 const subscriptions=new Map(),events=[];
 server.on('connection',socket=>{subscriptions.set(socket,new Map());socket.on('message',raw=>{const [type,id,...data]=JSON.parse(raw.toString());if(type==='REQ'){subscriptions.get(socket).set(id,data);for(const event of events)if(data.some(f=>matches(event,f)))socket.send(JSON.stringify(['EVENT',id,event]));socket.send(JSON.stringify(['EOSE',id]));}else if(type==='EVENT'){const event=id;events.push(event);socket.send(JSON.stringify(['OK',event.id,true,'']));for(const [peer,subs] of subscriptions)for(const [subscription,filters] of subs)if(peer.readyState===1&&filters.some(f=>matches(event,f)))peer.send(JSON.stringify(['EVENT',subscription,event]));}else if(type==='CLOSE')subscriptions.get(socket).delete(id);});socket.on('close',()=>subscriptions.delete(socket));});
 let relay,closing=false;const dapp=new DappConnectionManager('BCH Flow SDK test',undefined,{session:false});
 const wallet=new WalletConnectionManager({walletName:'Fixture wallet (test keys only)',walletIcon:'',getRelayPrivateKey:()=>new Uint8Array(32).fill(5),getXpub:path=>fixture.paths[path],getPublicKey:(path,index)=>{const decoded=decodeHdPublicKey(fixture.paths[path]);return deriveHdPath(decoded.node,'M/'+index).publicKey;},signTransaction:async()=>({signedTransaction:fixture.signed})});
 try{
  const ready=new Promise(resolve=>dapp.once('walletready',resolve));
  relay=initiateDappRelay(({client,status})=>{if(!closing)dapp.updateConnection(client,status);},{explicitRelayUrls:['ws://127.0.0.1:'+server.address().port],maxReconnectAttempts:1});
  wallet.connect(relay.uri);await ready;assert.equal(dapp.isWalletDiscovered(),true);
  assert.equal(binToHex(dapp.getPubkey(0,0n)),fixture.plan.publicKeys[0]);
  let received=false;
  wallet.on('pendingSignRequest',async({connectionId,request})=>{received=true;assert.equal(request.transaction.broadcast,false);assert.deepEqual(request.inputPaths,fixture.plan.inputPaths);await wallet.sendSignResponse(connectionId,request.sequence,fixture.signed);});
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
  const response=await dapp.signTransaction(walletSigningRequest(fixture.plan,dapp),{signal:controller.signal});clearTimeout(timer);
  assert(received);assert.equal(validateSignedResponse(fixture.plan.transaction,response.signedTransaction),fixture.signed);
  assert(events.length>0);assert(events.every(e=>e.kind===1059));assert(events.every(e=>!e.content.includes(fixture.plan.transaction)));
 }finally{try{await dapp.sendDisconnect('test complete');await new Promise(r=>setTimeout(r,50));}catch{}closing=true;wallet.disconnectAll();relay?.cleanup();dapp.destroy();dapp.removeAllListeners();for(const client of server.clients)client.terminate();await new Promise(r=>server.close(r));}
});

test('wrong wallet, broadcast requests and modified signed outputs are refused',()=>{
 const wrong={getPubkey:()=>new Uint8Array(33)};
 assert.throws(()=>walletSigningRequest(fixture.plan,wrong),/wrong_wallet/);
 assert.throws(()=>walletSigningRequest({...fixture.plan,broadcast:true},wrong),/invalid_plan/);
 const tampered=fixture.signed.slice(0,-10)+'ff'+fixture.signed.slice(-8);
 assert.throws(()=>validateSignedResponse(fixture.plan.transaction,tampered));
});
