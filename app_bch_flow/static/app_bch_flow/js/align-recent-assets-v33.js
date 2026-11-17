(function(){
'use strict';if(window.__bfrV33)return;window.__bfrV33=true;
function find(root,word){
var heads=root.querySelectorAll('h1,h2,h3,h4,h5,h6');
for(var i=0;i<heads.length;i++){
if((heads[i].textContent||'').replace(/\s+/g,' ').trim().toLowerCase()!==word)continue;
var node=heads[i];
for(var d=0;d<5&&node;d++,node=node.parentElement){
if(node.matches&&node.matches('section,article,[class*="card"],[class*="panel"],.premium-history'))return node;
}
}return null;
}
function align(){
var root=document.querySelector('.pay-app.pay-premium');if(!root)return;
var left=root.querySelector('section.premium-history#requests')||find(root,'recent operations');
var right=find(root,'my assets');
if(!left||!right||left===right||left.parentElement!==right.parentElement)return;
var parent=left.parentElement;
var style=getComputedStyle(parent);
if(style.display!=='grid'&&style.display!=='flex')return;
if(style.display==='flex'&&style.flexDirection==='column')return;
parent.classList.add('bfr-v33-row');left.classList.add('bfr-v33-recent');right.classList.add('bfr-v33-assets');
}
var queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;align()})}
function start(){align();new MutationObserver(function(changes){
for(var i=0;i<changes.length;i++){if(changes[i].addedNodes.length){schedule();break}}
}).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();