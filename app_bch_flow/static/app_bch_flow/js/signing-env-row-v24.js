/* V25: one stable location for signing controls, including AJAX asset swaps. */
(function(){'use strict';
 if(window.__bfrSigningEnvV25)return;window.__bfrSigningEnvV25=true;
 let queued=false;
 function arrange(){
  const root=document.querySelector('.bfr-dashboard');if(!root)return;
  const dock=root.querySelector('[data-bfr-environment-dock]');if(!dock)return;
  dock.classList.add('bfr-env-sign-row');
  const widget=root.querySelector('.wizard-card[data-wizardconnect]');
  const standby=root.querySelector('.bfr-wizard-standby');
  // Move existing elements, not clones: retain QR dialog and event listeners.
  // When both exist, prefer the actual signing component and hide duplicate standby.
  if(widget){
   if(widget.parentElement!==dock) dock.insertBefore(widget,dock.firstChild);
   if(standby){standby.hidden=true;standby.setAttribute('aria-hidden','true')}
  }else if(standby){
   standby.hidden=false;standby.removeAttribute('aria-hidden');
   if(standby.parentElement!==dock)dock.insertBefore(standby,dock.firstChild);
  }
 }
 function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;arrange()})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
 new MutationObserver(records=>{
  if(records.some(r=>Array.from(r.addedNodes).some(n=>n.nodeType===1 &&
    (n.matches?.('.wizard-card,.bfr-wizard-standby,[data-bfr-environment-dock],.bfr-dashboard') ||
     n.querySelector?.('.wizard-card,.bfr-wizard-standby,[data-bfr-environment-dock]')))))schedule();
 }).observe(document.body,{childList:true,subtree:true});
})();
