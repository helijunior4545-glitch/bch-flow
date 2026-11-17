
/* V21 — user-triggered notification; does not block navigation or payment forms. */
(function(){
 'use strict';
 var toastId='bfr-wallet-notice-v21', timeoutId=null;
 var pendingKey='bfr-wallet-notice-navigation-v21';
 function state(){
   return document.querySelector('[data-bfr-wallet-unconnected-v21]');
 }
 function toast(){
   var node=document.getElementById(toastId);
   if(node)return node;
   node=document.createElement('aside');
   node.id=toastId;node.hidden=true;
   node.setAttribute('role','status');node.setAttribute('aria-live','polite');
   node.innerHTML='<div class="bfr-notice-copy"><p class="bfr-notice-title">Wallet not connected</p><p class="bfr-notice-text">Your workspace is ready. Connect a wallet or Pix provider when you are ready to use payment services.</p></div><a class="bfr-notice-action" data-bfr-notice-connect href="#">Connect wallet <span aria-hidden="true">↗</span></a><button class="bfr-notice-dismiss" data-bfr-notice-close type="button" aria-label="Close notification">×</button>';
   node.querySelector('[data-bfr-notice-close]').addEventListener('click',hide);
   document.body.appendChild(node);
   return node;
 }
 function hide(){
   var node=document.getElementById(toastId);if(node)node.hidden=true;
   clearTimeout(timeoutId);timeoutId=null;
 }
 function show(){
   var marker=state();if(!marker)return;
   var node=toast();
   node.querySelector('[data-bfr-notice-connect]').href=marker.getAttribute('data-integrations-url');
   node.hidden=false;clearTimeout(timeoutId);timeoutId=setTimeout(hide,8500);
 }
 function remember(){try{sessionStorage.setItem(pendingKey,'1')}catch(e){}}
 function restore(){
   var wasPending=false;
   try{wasPending=sessionStorage.getItem(pendingKey)==='1';sessionStorage.removeItem(pendingKey)}catch(e){}
   if(wasPending)show();
 }
 function relevant(element){
   return !!element.closest('.premium-assets,.premium-wallet-switcher,[data-financial-navigation],.premium-wallet-tabs,[data-wizard-connect]') ||
      !!element.closest('.premium-receive,.premium-send,.bfr-receive,.bfr-send') ||
      !!element.matches('[data-wizard-connect],[data-review-transfer],[data-request-payment]');
 }
 document.addEventListener('click',function(event){
   if(!state())return;
   var target=event.target.closest('a,button');if(!target||target.closest('#'+toastId)||!relevant(target))return;
   show();
   var href=target.getAttribute('href');
   if(href&&href.charAt(0)!=='#')remember();
 },true);
 document.addEventListener('submit',function(event){
   if(!state())return;
   if(event.target.matches('form[data-financial-environment]')||
      event.target.closest('.premium-send,.premium-receive,.bfr-send,.bfr-receive')){
     show();remember();
   }
 },true);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restore,{once:true});
 else restore();
})();
