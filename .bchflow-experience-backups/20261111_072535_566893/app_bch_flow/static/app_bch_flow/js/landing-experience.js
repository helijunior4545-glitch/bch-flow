/* BCH Flow Experience V3 - isolated landing interaction, no dependencies */
(()=>{'use strict';const root=document.querySelector('.bch-x3');if(!root)return;
const player=document.getElementById('bch-player'),shell=document.getElementById('bch-player-shell'),backdrop=document.getElementById('bch-video-backdrop'),video=document.getElementById('bch-video'),art=document.getElementById('bch-video-art'),close=document.getElementById('bch-player-close'),mascot=root.querySelector('.bch-mascot');
if(!player||!shell||!backdrop||!video||!art||!close)return;
const reduce=matchMedia('(prefers-reduced-motion: reduce)'),opens=root.querySelectorAll('[data-bch-open]');let opened=false,returnFocus=null,transitioning=false,firstOpen=true;
const motion=()=>!reduce.matches&&innerWidth>760;
function showModal(){player.classList.add('bch-modal');close.hidden=false;backdrop.hidden=false;document.body.style.overflow='hidden';close.focus({preventScroll:true});}
function openModal(){if(opened||transitioning)return;transitioning=true;returnFocus=document.activeElement;const from=player.getBoundingClientRect();const useMotion=motion();if(useMotion){player.style.transition='none';player.style.transform='none';}
showModal();opened=true;
const to=player.getBoundingClientRect();if(useMotion&&player.animate){const dx=from.left-to.left,dy=from.top-to.top,sx=from.width/to.width,sy=from.height/to.height;player.animate([{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(${sx},${sy})`,opacity:.85},{transform:'translate(-50%,-50%) scale(1)',opacity:1}],{duration:firstOpen?680:460,easing:'cubic-bezier(.2,.75,.2,1)'}).finished.catch(()=>{}).finally(()=>transitioning=false);}else transitioning=false;
firstOpen=false;mascot?.classList.add('bch-engaged');
const src=video.dataset.videoSrc;if(src&&!video.getAttribute('src'))video.setAttribute('src',src);
// User gesture: start immediately; do not defer play until the animation completes.
art.hidden=true;video.hidden=false;video.play().catch(()=>{art.hidden=false;video.hidden=true;});
}
function closeModal(){if(!opened)return;opened=false;video.pause();video.currentTime=0;video.hidden=true;art.hidden=false;close.hidden=true;backdrop.hidden=true;player.classList.remove('bch-modal');document.body.style.overflow='';mascot?.classList.remove('bch-engaged');if(returnFocus?.focus)returnFocus.focus({preventScroll:true});}
opens.forEach(b=>b.addEventListener('click',openModal));close.addEventListener('click',closeModal);backdrop.addEventListener('click',closeModal);video.addEventListener('ended',closeModal);document.addEventListener('keydown',e=>{if(!opened)return;if(e.key==='Escape'){e.preventDefault();closeModal()}else if(e.key==='Tab'){e.preventDefault();close.focus()}});
video.addEventListener('error',()=>{video.hidden=true;art.hidden=false;art.querySelector('.bch-video-caption').textContent='Demo video unavailable · Add bch-flow-demo.mp4';});
})();
