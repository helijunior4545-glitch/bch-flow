/* BCH FLOW 106: unobtrusive, keyboard-friendly microinteractions */
(()=>{'use strict';if(window.__bchR106)return;window.__bchR106=true;
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function init(){document.documentElement.classList.add('bch-r106-ready');
 document.querySelectorAll('button,.btn,[role="button"]').forEach(el=>{
  if(el.dataset.bchR106Bound)return;el.dataset.bchR106Bound='1';
  el.addEventListener('click',()=>{if(reduce||el.disabled)return;el.classList.remove('bch-r106-pulse');void el.offsetWidth;el.classList.add('bch-r106-pulse');},{passive:true});
  el.addEventListener('animationend',()=>el.classList.remove('bch-r106-pulse'));
 });
 document.querySelectorAll('input,textarea,select').forEach(el=>{
  if(el.dataset.bchR106Field)return;el.dataset.bchR106Field='1';
  el.addEventListener('invalid',()=>el.setAttribute('aria-invalid','true'));
  el.addEventListener('input',()=>{if(el.validity.valid)el.removeAttribute('aria-invalid')});
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();