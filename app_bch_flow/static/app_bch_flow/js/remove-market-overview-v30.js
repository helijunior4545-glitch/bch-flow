
/* V30 — the Market overview panel may be rendered by older runtime scripts.
   Remove its closest panel only when its heading matches exactly. */
(function(){
  'use strict';
  if(window.__bfrMarketOverviewV30)return;
  window.__bfrMarketOverviewV30=true;
  var scheduled=false;
  function matchesHeading(el){
    if(!el||el.nodeType!==1)return false;
    var tag=el.tagName.toLowerCase();
    if(!/^(h[1-6]|strong|b|span|p|div)$/.test(tag))return false;
    if(el.children.length>2)return false;
    var t=(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    return t==='market overview';
  }
  function isPanel(el){
    if(!el||el.nodeType!==1)return false;
    if(el.matches('main,.premium-main,.premium-sidebar,.premium-cards,.premium-balance,body,html'))return false;
    var c=(typeof el.className==='string'?el.className:'').toLowerCase();
    return /(?:^|[\s_-])(card|panel|overview|market|widget|tile|surface)(?:$|[\s_-])/.test(c)
      || /^(article|aside|section)$/.test(el.tagName.toLowerCase());
  }
  function findPanel(heading){
    var node=heading.parentElement;
    for(var depth=0;node&&depth<6;node=node.parentElement,depth++){
      if(isPanel(node)&&node.querySelectorAll('h1,h2,h3,h4,h5,h6').length<=2)return node;
    }
    return null;
  }
  function removePanel(){
    var root=document.querySelector('.pay-app.pay-premium');
    if(!root)return;
    var all=root.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,b,span,p,div');
    for(var i=0;i<all.length;i++){
      if(!matchesHeading(all[i]))continue;
      var panel=findPanel(all[i]);
      if(!panel)continue;
      // Safety: do not remove any panel that contains primary balance or transaction actions.
      if(panel.querySelector('.premium-balance,[data-balance-toggle],form[data-review-transfer],.premium-receive,.premium-send'))continue;
      panel.setAttribute('data-bfr-market-overview-removed-v30','');
      panel.remove();
    }
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(function(){scheduled=false;removePanel()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
  // Handle cards injected after asset or wallet changes, without observing style changes.
  var observer=new MutationObserver(function(changes){
    for(var i=0;i<changes.length;i++){
      if(changes[i].addedNodes.length){schedule();break}
    }
  });
  function start(){if(document.body)observer.observe(document.body,{subtree:true,childList:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
