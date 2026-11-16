
/* V22: handles native navigation and AJAX swaps without blocking actions. */
(function(){
 'use strict';
 if(window.__bfrWalletToastV22)return;
 window.__bfrWalletToastV22=true;
 var ID='bfr-wallet-notice-v21';
 var KEY='bfr-wallet-toast-pending-v22';
 var hideTimer=null;
 var integrationsUrl=null;
 function marker(){
   return document.querySelector('[data-bfr-wallet-unconnected-v21]');
 }
 function currentUrl(){
   var m=marker();
   if(m)integrationsUrl=m.getAttribute('data-integrations-url');
   return integrationsUrl;
 }
 function getToast(){
   var el=document.getElementById(ID);
   if(el)return el;
   el=document.createElement('aside');
   el.id=ID;el.hidden=true;
   el.setAttribute('role','status');
   el.setAttribute('aria-live','polite');
   el.innerHTML='<div class="bfr-notice-copy"><p class="bfr-notice-title">Wallet not connected</p><p class="bfr-notice-text">Your workspace is ready. Connect a wallet or Pix provider to use payment services.</p></div><a class="bfr-notice-action" data-bfr-notice-connect href="#">Connect wallet <span aria-hidden="true">↗</span></a><button class="bfr-notice-dismiss" data-bfr-notice-close type="button" aria-label="Close notification">×</button>';
   el.querySelector('[data-bfr-notice-close]').addEventListener('click',function(){
     el.hidden=true;clearTimeout(hideTimer);
     try{sessionStorage.removeItem(KEY)}catch(e){}
   });
   document.body.appendChild(el);
   return el;
 }
 function show(){
   var url=currentUrl();
   if(!marker()||!url)return;
   var el=getToast();
   el.querySelector('[data-bfr-notice-connect]').href=url;
   el.hidden=false;
   clearTimeout(hideTimer);
   hideTimer=setTimeout(function(){el.hidden=true},8000);
 }
 function store(){
   try{sessionStorage.setItem(KEY,'1')}catch(e){}
 }
 function restore(){
   var pending=false;
   try{pending=sessionStorage.getItem(KEY)==='1'}catch(e){}
   if(!pending)return;
   if(marker()){
     show();
     try{sessionStorage.removeItem(KEY)}catch(e){}
   }else if(document.querySelector('.pay-app,.bfr-dashboard')){
     // Wallet exists for the destination; no warning needed.
     try{sessionStorage.removeItem(KEY)}catch(e){}
     var el=document.getElementById(ID);if(el)el.hidden=true;
   }
 }
 function isWalletAction(el){
   return !!el.closest('.premium-assets,.premium-wallet-switcher,[data-financial-navigation],.premium-wallet-tabs') ||
     !!el.closest('.premium-receive,.premium-send,.bfr-receive,.bfr-send') ||
     !!el.matches('[data-wizard-connect],[data-review-transfer],[data-request-payment]');
 }
 document.addEventListener('pointerdown',function(e){
   var target=e.target.closest('a,button');
   if(!target||target.closest('#'+ID)||!isWalletAction(target))return;
   if(!marker())return;
   // Show before navigation or client-side replacement. Don't prevent default.
   show();
   var href=target.getAttribute('href');
   if(href&&href.charAt(0)!=='#')store();
 },true);
 // Keyboard activation and browsers without pointer events.
 document.addEventListener('click',function(e){
   if(e.detail!==0)return;
   var target=e.target.closest('a,button');
   if(!target||target.closest('#'+ID)||!isWalletAction(target)||!marker())return;
   show();if(target.getAttribute('href'))store();
 },true);
 document.addEventListener('submit',function(e){
   if(!marker())return;
   if(e.target.matches('form.premium-env,form[data-financial-environment]')||
      e.target.closest('.premium-send,.premium-receive,.bfr-send,.bfr-receive')){
     show();store();
   }
 },true);
 function onReady(){
   currentUrl();
   restore();
   // The content may be swapped without a full reload.
   var pending=false;
   new MutationObserver(function(records){
     if(!records.some(function(r){
       return Array.prototype.some.call(r.addedNodes,function(n){
         return n.nodeType===1 && (n.matches?.('.pay-app,.bfr-dashboard,[data-bfr-wallet-unconnected-v21]') ||
           n.querySelector?.('.pay-app,.bfr-dashboard,[data-bfr-wallet-unconnected-v21]'));
       });
     }))return;
     currentUrl();restore();
   }).observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',onReady,{once:true});
 else onReady();
})();
