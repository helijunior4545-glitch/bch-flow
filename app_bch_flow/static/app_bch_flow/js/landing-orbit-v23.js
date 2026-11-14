/* BCH Flow V26 — mobile-conscious, gapless payment orbit. */
(()=>{'use strict';
const init=()=>{
 const orbit=document.querySelector('[data-bf-orbit]');if(!orbit)return;
 const win=orbit.querySelector('.bf-orbit-window');
 const track=orbit.querySelector('.bf-orbit-track');
 const original=track?.querySelector('.bf-orbit-set');
 if(!win||!track||!original)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let raf=0,visible=true,userPaused=false,lastWidth=0,lastStep=0;
 const coarse=window.matchMedia('(pointer: coarse)');
 const sync=()=>{
  track.style.animationPlayState=(reduced.matches||!visible||userPaused)?'paused':'';
  win.classList.toggle('bf-orbit-paused',userPaused);
  win.setAttribute('aria-pressed',String(userPaused));
 };
 function fill(){
  raf=0;
  const step=original.getBoundingClientRect().width;
  const width=win.getBoundingClientRect().width;
  if(!step||!width)return;
  if(Math.abs(width-lastWidth)<1&&Math.abs(step-lastStep)<1)return;
  lastWidth=width;lastStep=step;
  const desired=reduced.matches?2:Math.max(2,Math.ceil(width/step)+2);
  const copies=[...track.querySelectorAll(':scope > .bf-orbit-set[data-bf-orbit-copy]')];
  const requiredCopies=desired-2;
  for(let i=copies.length;i<requiredCopies;i++){
   const clone=original.cloneNode(true);clone.dataset.bfOrbitCopy='1';
   clone.setAttribute('aria-hidden','true');
   clone.querySelectorAll('[aria-label]').forEach(el=>el.removeAttribute('aria-label'));
   clone.querySelectorAll('img').forEach(img=>img.alt='');
   track.appendChild(clone);
  }
  for(let i=requiredCopies;i<copies.length;i++)copies[i].remove();
  track.style.setProperty('--bf-orbit-step',step+'px');
  track.style.animationDuration=Math.max(16,step/27)+'s';
  sync();
 }
 const schedule=()=>{if(!raf)raf=requestAnimationFrame(fill)};
 if(window.lucide?.createIcons)window.lucide.createIcons();
 fill();
 if('ResizeObserver' in window){const ro=new ResizeObserver(schedule);ro.observe(win);ro.observe(original)}
 else window.addEventListener('resize',schedule,{passive:true});
 if('IntersectionObserver' in window){const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{threshold:0});io.observe(orbit)}
 if(reduced.addEventListener)reduced.addEventListener('change',()=>{lastWidth=0;sync();schedule()});
 win.addEventListener('click',()=>{if(coarse.matches){userPaused=!userPaused;sync()}});
 win.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();userPaused=!userPaused;sync()}});
 orbit.addEventListener('error',e=>{if(e.target?.tagName==='IMG')e.target.closest('.bf-orbit-logo')?.classList.add('bf-icon-unavailable')},true);
 sync();
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
