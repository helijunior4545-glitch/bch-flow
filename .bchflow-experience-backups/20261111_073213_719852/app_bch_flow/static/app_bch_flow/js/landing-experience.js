/* BCH Flow V4: fixed centered modal, single player, no external JS dependencies */
(()=>{'use strict';const root=document.querySelector('.bch-v4');if(!root)return;
const player=document.getElementById('bch-player'),slot=document.getElementById('bch-player-slot'),video=document.getElementById('bch-video'),display=document.getElementById('bch-player-display'),close=document.getElementById('bch-close'),status=document.getElementById('bch-video-status');
if(!player||!slot||!video||!display||!close)return;
const backdrop=document.createElement('div');backdrop.className='bch-modal-backdrop';backdrop.hidden=true;
const host=document.createElement('div');host.className='bch-modal-host';host.hidden=true;document.body.append(backdrop,host);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let open=false,returnFocus=null,priorOverflow='',runningAnimation=null;
const noMotion=()=>reduced.matches||window.innerWidth<=760;
function animateFrom(from,to,reverse=false){if(noMotion()||!player.animate)return;
 const x=from.left-to.left,y=from.top-to.top,sx=from.width/to.width,sy=from.height/to.height;
 runningAnimation?.cancel();runningAnimation=player.animate([{transform:`translate(${x}px,${y}px) scale(${sx},${sy})`,opacity:.94},{transform:'translate(0,0) scale(1)',opacity:1}],{duration:reverse?330:580,easing:'cubic-bezier(.2,.8,.2,1)'});runningAnimation.finished.catch(()=>{}).finally(()=>runningAnimation=null);
}
function focusTrap(e){if(!open)return;if(e.key==='Escape'){e.preventDefault();hide();return;}if(e.key==='Tab'){const targets=[close,...player.querySelectorAll('video[controls]')].filter(x=>!x.hidden);if(!targets.includes(document.activeElement)){e.preventDefault();close.focus();}}}
function show(){if(open)return;returnFocus=document.activeElement;const from=player.getBoundingClientRect();priorOverflow=document.body.style.overflow;
 backdrop.hidden=false;host.hidden=false;host.appendChild(player);document.body.style.overflow='hidden';open=true;close.hidden=false;
 const to=player.getBoundingClientRect();animateFrom(from,to);close.focus({preventScroll:true});
 const src=video.dataset.videoSrc;
 if(src&&!video.getAttribute('src'))video.src=src;
 // Play in the same click gesture; video remains the same DOM node during animation.
 video.hidden=false;display.hidden=true;const attempt=video.play();if(attempt&&attempt.then)attempt.then(()=>{status.textContent='';}).catch(()=>{video.hidden=true;display.hidden=false;status.textContent='Adicione o vídeo bch-flow-demo.mp4 para reproduzir a demonstração.';});
}
function hide(){if(!open)return;open=false;runningAnimation?.cancel();video.pause();try{video.currentTime=0}catch(_){}video.hidden=true;display.hidden=false;close.hidden=true;const from=player.getBoundingClientRect();slot.appendChild(player);const to=player.getBoundingClientRect();animateFrom(from,to,true);backdrop.hidden=true;host.hidden=true;document.body.style.overflow=priorOverflow;returnFocus?.focus?.({preventScroll:true});}
root.querySelectorAll('[data-bch-open]').forEach(el=>el.addEventListener('click',show));close.addEventListener('click',hide);backdrop.addEventListener('click',hide);document.addEventListener('keydown',focusTrap);video.addEventListener('ended',hide);video.addEventListener('error',()=>{video.hidden=true;display.hidden=false;status.textContent='Vídeo ainda não disponível. Coloque bch-flow-demo.mp4 na pasta media.';});
})();
