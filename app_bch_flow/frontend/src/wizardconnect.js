import {initiateDappRelay} from '@wizardconnect/core';
import {DappConnectionManager, loadSession} from '@wizardconnect/dapp';
import {publicKeyToP2pkhCashAddress} from '@bitauth/libauth';
import QRCode from 'qrcode';
import {walletSigningRequest,validateSignedResponse} from './wizard-protocol.js';

const root=document.querySelector('[data-wizardconnect]');
if(root){
  const scope='bchflow.wizard.'+root.dataset.scope;
  let storage;try{storage=sessionStorage;storage.setItem(scope+'.probe','1');storage.removeItem(scope+'.probe');}catch{const memory=new Map();storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};}
  const dialog=root.querySelector('dialog'), status=root.querySelector('[data-wizard-status]');
  const address=root.querySelector('[data-wizard-address]'), uri=root.querySelector('[data-wizard-uri]');
  const connect=root.querySelector('[data-wizard-connect]'), disconnect=root.querySelector('[data-wizard-disconnect]');
  const configuredRelays=JSON.parse(root.querySelector('#wizard-relays').textContent);
  const relays=Array.isArray(configuredRelays)&&configuredRelays.length?configuredRelays:['wss://relay.riften.net:443','wss://relay.cauldron.quest:443'];
  let manager=null,relay=null,handshakeTimer=null,signController=null;
  const say=key=>{status.textContent=root.dataset[key]||root.dataset.failed;};
  function clear(){if(dialog.open)dialog.close();clearTimeout(handshakeTimer);signController?.abort();relay?.cleanup();manager?.clearStoredSession();manager?.destroy();manager?.removeAllListeners();manager=null;relay=null;storage.removeItem(scope);connect.disabled=false;disconnect.hidden=true;address.textContent='';uri.value='';root.querySelector('[data-wizard-qr]').getContext('2d').clearRect(0,0,256,256);}
  function close(){dialog.close();}
  function start(restore=false){
    clearTimeout(handshakeTimer);
    if(!isSecureContext){say('secure');return;}
    if(relay){dialog.showModal();return;}
    const saved=restore?loadSession(scope,storage):null;if(!restore)storage.removeItem(scope);
    manager=new DappConnectionManager('BCH Flow',undefined,{session:{key:scope,storage}});
    manager.on('walletready',()=>{
      if(!manager.hasPath(0)||!manager.hasPath(1)){clear();say('unsupported');return;}
      clearTimeout(handshakeTimer);
      const result=publicKeyToP2pkhCashAddress({publicKey:manager.getPubkey(0,0n),prefix:'bitcoincash'});
      address.textContent=typeof result==='string'?result:result.address;
      say('connected');disconnect.hidden=false;connect.disabled=false;close();
    });
    manager.on('disconnect',()=>{clear();say('disconnected');});
    manager.on('reconnecting',()=>say('reconnecting'));
    say('waiting');connect.disabled=true;
    try{
      relay=initiateDappRelay(payload=>{manager?.updateConnection(payload.client,payload.status);if(payload.status.status==='disconnected')say('relayError');},{explicitRelayUrls:relays,...(saved?.walletPublicKey?{existingCredentials:saved}:{})});
      manager.attachRelay(relay);
      uri.value=relay.uri;
      QRCode.toCanvas(root.querySelector('[data-wizard-qr]'),relay.qrUri,{width:256,margin:2,errorCorrectionLevel:'M'}).catch(()=>say('failed'));
      handshakeTimer=setTimeout(()=>{clear();say('timedOut');},90000);
      if(!restore)dialog.showModal();
    }catch{clear();say('failed');}
  }
  connect.addEventListener('click',()=>{if(manager?.isWalletDiscovered()){say('connected');return;}start();});
  root.querySelector('[data-wizard-close]').addEventListener('click',()=>{close();if(!manager?.isWalletDiscovered()){clear();say('disconnected');}});
  dialog.addEventListener('cancel',()=>{if(!manager?.isWalletDiscovered()){clear();say('disconnected');}});
  disconnect.addEventListener('click',async()=>{try{await manager?.sendDisconnect('Disconnected from BCH Flow');}catch{}clear();say('disconnected');});
  root.querySelector('[data-wizard-copy]').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(uri.value);}catch{uri.focus();uri.select();}});
  document.querySelectorAll('[data-wizard-sign]').forEach(button=>button.addEventListener('click',async()=>{
    if(!manager?.isWalletDiscovered()){start();return;}
    if(signController)return;
    signController=new AbortController();button.disabled=true;say('signing');
    const timer=setTimeout(()=>signController?.abort(),120000);
    try{
      const response=await fetch(button.dataset.wizardSign,{method:'POST',credentials:'same-origin',headers:{'X-CSRFToken':document.querySelector('[name=csrfmiddlewaretoken]').value,'Accept':'application/json'},signal:signController.signal});
      if(!response.ok)throw new Error('server_rejected');
      const plan=await response.json();
      const result=await manager.signTransaction(walletSigningRequest(plan,manager),{signal:signController.signal});
      if(result.error)throw new Error('wallet_rejected');
      const signed=validateSignedResponse(plan.transaction,result.signedTransaction);
      const form=button.closest('.premium-withdrawal').querySelector('form:has([name=action][value=submit])');
      if(!form)throw new Error('authorization_expired');
      form.querySelector('[name=raw_transaction]').value=signed;
      form.querySelector('[name=raw_transaction]').dispatchEvent(new Event('input',{bubbles:true}));
      form.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'center'});
      say('signed'); // Never submit or broadcast automatically.
    }catch(error){say(error.message==='wrong_wallet'?'wrongWallet':error.name==='AbortError'?'cancelled':'failed');}
    finally{clearTimeout(timer);signController=null;button.disabled=false;}
  }));
  document.querySelectorAll('form[action$="/logout/"]').forEach(form=>form.addEventListener('submit',()=>{clear();}));
  addEventListener('pagehide',()=>{clearTimeout(handshakeTimer);signController?.abort();manager?.destroy();relay?.cleanup();});
  if(loadSession(scope,storage)?.walletPublicKey)start(true);
}
