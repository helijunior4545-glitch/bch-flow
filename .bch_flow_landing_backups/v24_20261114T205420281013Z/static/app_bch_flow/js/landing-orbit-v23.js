/* BCH Flow V23 — only progressive microinteractions; logos are external SVG assets. */
(()=>{'use strict';const orbit=document.querySelector('[data-bf-orbit]');if(!orbit)return;
const win=orbit.querySelector('.bf-orbit-window'),track=orbit.querySelector('.bf-orbit-track');if(!win||!track)return;
// The duplicated set is already present in HTML, avoiding layout shifts on load.
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
if('IntersectionObserver' in window){const io=new IntersectionObserver(entries=>{track.style.animationPlayState=entries[0].isIntersecting?'':'paused'},{threshold:0});io.observe(orbit)}
win.addEventListener('pointerdown',()=>{if(matchMedia('(pointer:coarse)').matches)win.classList.toggle('bf-orbit-paused')});
win.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();win.classList.toggle('bf-orbit-paused')}});
orbit.querySelectorAll('.bf-orbit-logo img').forEach(img=>{img.addEventListener('error',()=>img.closest('.bf-orbit-logo')?.classList.add('bf-icon-unavailable'),{once:true})});
})();
