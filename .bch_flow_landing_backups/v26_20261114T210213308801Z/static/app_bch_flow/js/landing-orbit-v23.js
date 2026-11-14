/* BCH Flow V25 — gapless, measured infinite orbit. */
(()=>{'use strict';
const init=()=>{
 const orbit=document.querySelector('[data-bf-orbit]');if(!orbit)return;
 const win=orbit.querySelector('.bf-orbit-window'),track=orbit.querySelector('.bf-orbit-track');
 const original=track?.querySelector('.bf-orbit-set');if(!win||!track||!original)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let raf=0;
 function fill(){
   // Preserve the two original sets and rebuild only generated copies.
   track.querySelectorAll('[data-bf-orbit-copy]').forEach(el=>el.remove());
   const first=original.getBoundingClientRect().width;
   const width=win.getBoundingClientRect().width;
   if(!first||!width)return;
   // At any moment, there must be at least a viewport of logos after
   // shifting the track by one complete set.
   const required=Math.max(2,Math.ceil(width/first)+2);
   const existing=track.querySelectorAll(':scope > .bf-orbit-set').length;
   for(let i=existing;i<required;i++){
     const clone=original.cloneNode(true);
     clone.setAttribute('aria-hidden','true');clone.dataset.bfOrbitCopy='1';
     clone.querySelectorAll('[aria-label]').forEach(el=>el.removeAttribute('aria-label'));
     clone.querySelectorAll('img').forEach(img=>img.alt='');
     track.appendChild(clone);
   }
   track.style.setProperty('--bf-orbit-step',first+'px');
   // Consistent pixels/second rather than a fixed duration per logo count.
   track.style.animationDuration=Math.max(16,first/27)+'s';
   if(window.lucide?.createIcons)window.lucide.createIcons({attrs:{'stroke-width':1.7}});
 }
 const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(fill)};
 fill();
 if('ResizeObserver' in window){const observer=new ResizeObserver(schedule);observer.observe(win);observer.observe(original)}
 else window.addEventListener('resize',schedule,{passive:true});
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{track.style.animationPlayState=entries[0].isIntersecting?'':'paused'},{threshold:0});observer.observe(orbit)}
 win.addEventListener('pointerdown',()=>{if(window.matchMedia('(pointer:coarse)').matches)win.classList.toggle('bf-orbit-paused')});
 win.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();win.classList.toggle('bf-orbit-paused')}});
 orbit.addEventListener('error',e=>{if(e.target?.tagName==='IMG')e.target.closest('.bf-orbit-logo')?.classList.add('bf-icon-unavailable')},true);
 if(reduced.matches)track.style.animationPlayState='paused';
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
