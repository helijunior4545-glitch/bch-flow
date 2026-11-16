
/* BCH Flow V34: only mobile menu behavior and accessibility. Financial controllers
   remain the responsibility of financial-rebuild-v11.js and payment scripts. */
(function(){
 'use strict';
 if(window.__bfrEuropeanV34)return;
 window.__bfrEuropeanV34=true;
 var body=document.body;
 var query=function(s){return document.querySelector(s)};
 var media=window.matchMedia('(max-width:800px)');
 function root(){return query('#main.bfr-dashboard')}
 function sidebar(){var r=root();return r&&r.querySelector('.premium-sidebar')}
 function syncState(open){
  var s=sidebar(),b=query('.bfr-eu-menu-button');
  if(!s||!b)return;
  if(!media.matches)open=false;
  body.classList.toggle('bfr-eu-open',!!open);
  b.setAttribute('aria-expanded',String(!!open));
  if(media.matches)s.setAttribute('aria-hidden',String(!open));
  else s.removeAttribute('aria-hidden');
 }
 function close(restore){
  syncState(false);
  if(restore){var b=query('.bfr-eu-menu-button');if(b)b.focus({preventScroll:true})}
 }
 function init(){
  var s=sidebar();if(!s)return;
  s.id='bfr-eu-sidebar';
  if(!s.querySelector('.bfr-eu-close')){
   var b=document.createElement('button');
   b.type='button';b.className='bfr-eu-close';
   b.setAttribute('aria-label','Close navigation');
   b.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
   s.insertBefore(b,s.firstChild);
  }
  syncState(false);
 }
 document.addEventListener('click',function(e){
  var t=e.target instanceof Element?e.target:e.target&&e.target.parentElement;
  if(!t||!root())return;
  if(t.closest('.bfr-eu-menu-button')){
   var opening=!body.classList.contains('bfr-eu-open');
   syncState(opening);
   if(opening){var x=sidebar().querySelector('.bfr-eu-close');if(x)x.focus({preventScroll:true})}
   return;
  }
  if(t.closest('.bfr-eu-close,.bfr-eu-backdrop')){close(true);return}
  if(t.closest('.premium-sidebar .premium-menu a')){close(false)}
 });
 document.addEventListener('keydown',function(e){
  if(!body.classList.contains('bfr-eu-open'))return;
  if(e.key==='Escape'){e.preventDefault();close(true);return}
  if(e.key!=='Tab')return;
  var s=sidebar();if(!s)return;
  var nodes=Array.prototype.slice.call(s.querySelectorAll('a,button,[tabindex="0"]')).filter(function(el){return !el.disabled&&el.getClientRects().length>0});
  if(!nodes.length)return;
  var first=nodes[0],last=nodes[nodes.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 });
 if(media.addEventListener)media.addEventListener('change',function(){close(false);syncState(false)});
 else media.addListener(function(){close(false);syncState(false)});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
