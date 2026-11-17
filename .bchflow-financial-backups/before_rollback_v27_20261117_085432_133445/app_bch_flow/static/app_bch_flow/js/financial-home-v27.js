/* BCH-FLOW-HOME-V27 — progressive, non-financial UI enhancements. */
(function(){
 'use strict';
 if(window.__bchHomeV27)return;
 window.__bchHomeV27=true;
 function init(){
   var root=document.querySelector('main.pay-premium[data-payment-app]');
   if(!root)return;
   root.classList.add('bfr-home-v27-ready');
   // Add a clear, accessible name to the existing sidebar's mobile toggle.
   var menu=root.querySelector('.bfr-mobile-menu-button');
   if(menu&&!menu.getAttribute('aria-label'))menu.setAttribute('aria-label','Open navigation');
   // Do not modify chart, wallet, payment, network, signing, or dialog handlers.
   root.querySelectorAll('button[type="submit"]').forEach(function(button){
     if(!button.getAttribute('aria-label')&&!button.textContent.trim()){
       button.setAttribute('aria-label','Submit');
     }
   });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
