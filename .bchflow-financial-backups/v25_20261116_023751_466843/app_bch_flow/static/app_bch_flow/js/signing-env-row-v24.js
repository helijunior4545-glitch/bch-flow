
/* V24: move the existing status element, never clone it or alter wallet handlers. */
(function(){
 'use strict';
 if(window.__bfrSigningEnvV24)return;window.__bfrSigningEnvV24=true;
 var busy=false;
 function layout(){
  var root=document.querySelector('.bfr-dashboard');
  if(!root)return;
  var dock=root.querySelector('[data-bfr-environment-dock]');
  if(!dock)return;
  var status=root.querySelector('.bfr-wizard-standby');
  if(!status)return;
  dock.classList.add('bfr-env-sign-row');
  if(status.parentElement!==dock||dock.firstElementChild!==status){
    dock.insertBefore(status,dock.firstElementChild);
  }
 }
 function schedule(){
  if(busy)return;busy=true;
  queueMicrotask(function(){busy=false;layout()});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
 else schedule();
 // The existing V16 script may recreate the strip on asset changes.
 new MutationObserver(function(records){
  for(var i=0;i<records.length;i++){
   var r=records[i];
   if(r.type!=='childList')continue;
   for(var j=0;j<r.addedNodes.length;j++){
    var n=r.addedNodes[j];
    if(n.nodeType!==1)continue;
    if(n.matches?.('.bfr-wizard-standby,[data-bfr-environment-dock],.bfr-dashboard') ||
       n.querySelector?.('.bfr-wizard-standby,[data-bfr-environment-dock]')){
       schedule();return;
    }
   }
  }
 }).observe(document.body,{childList:true,subtree:true});
})();
