/* Visual-only enhancement; no polling, payment status or financial data is changed. */
(function(){'use strict';
function init(){
 var root=document.querySelector('body.pay-checkout-body main.pay-checkout[data-payment-app]');
 if(!root||root.dataset.premiumVisualReady==='1')return;
 root.dataset.premiumVisualReady='1';
 var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!reduced){
  ['.pay-checkout-brand','.pay-eyebrow','h1','.pay-mode'].forEach(function(s){var el=root.querySelector(s);if(el)el.classList.add('checkout-entrance');});
  var card=root.querySelector('.pay-request-card');if(card)card.classList.add('checkout-entrance-delay');
 }
 var poll=root.querySelector('.pay-poll-status');
 if(poll&&!poll.querySelector('.checkout-poll-dot')){
  var dot=document.createElement('span');dot.className='checkout-poll-dot';dot.setAttribute('aria-hidden','true');poll.insertBefore(dot,poll.firstChild);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
