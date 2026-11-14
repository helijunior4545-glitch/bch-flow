/* BCH Flow Landing V4: microinteractions, native dialog, reveal, tilt and pointer light. */
(() => {
 'use strict';
 const root=document.querySelector('.bf-landing'); if(!root)return;
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 const dialog=root.querySelector('#bf-film-dialog');
 const preview=root.querySelector('.bf-film-preview');
 const player=root.querySelector('.bf-film-player');
 const openers=root.querySelectorAll('.bf-film-open,[data-open-film]');
 const close=dialog?.querySelector('[data-close-film]');
 let focusBack=null,wasPlaying=false;
 const play=v=>{if(!v)return;const result=v.play();if(result?.catch)result.catch(()=>{});};
 if(dialog&&preview&&player&&close){
  const open=e=>{
   if(typeof dialog.showModal!=='function')return;
   focusBack=e.currentTarget;wasPlaying=!preview.paused;preview.pause();
   if(!player.getAttribute('src'))player.src=player.dataset.src;
   dialog.showModal();document.body.classList.add('bf-film-opened');play(player);
  };
  openers.forEach(button=>button.addEventListener('click',open));
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{player.pause();document.body.classList.remove('bf-film-opened');if(wasPlaying)play(preview);if(focusBack?.isConnected)focusBack.focus({preventScroll:true});});
 }
 // Progressive enhancement: never hide content unless an observer is available.
 if(!reduce.matches&&'IntersectionObserver' in window){
  const sections=[...root.querySelectorAll('[data-reveal-section]')];
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.remove('bf-is-pending');entry.target.classList.add('bf-is-visible');observer.unobserve(entry.target);}}},{threshold:.07,rootMargin:'0px 0px -20px 0px'});
  sections.forEach(section=>{if(section.getBoundingClientRect().top>window.innerHeight*.9)section.classList.add('bf-is-pending');observer.observe(section);});
 }
 const card=root.querySelector('[data-tilt-card]');
 if(card&&!reduce.matches&&window.matchMedia('(hover:hover) and (pointer:fine)').matches){
  let raf=0;
  card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{card.style.transform=`perspective(1200px) rotateY(${-7+x*3}deg) rotateX(${1-y*2}deg) rotateZ(-2.6deg)`;});},{passive:true});
  card.addEventListener('pointerleave',()=>{cancelAnimationFrame(raf);card.style.removeProperty('transform');});
 }
 root.querySelectorAll('[data-glow-card]').forEach(card=>card.addEventListener('pointermove',e=>{if(reduce.matches)return;const r=card.getBoundingClientRect();card.style.setProperty('--bf-glow-x',`${e.clientX-r.left}px`);card.style.setProperty('--bf-glow-y',`${e.clientY-r.top}px`);},{passive:true}));
 // Smooth anchor navigation only for same-page destinations; honor reduced motion.
 root.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',e=>{const target=root.querySelector(link.getAttribute('href'));if(!target)return;e.preventDefault();target.scrollIntoView({behavior:reduce.matches?'instant':'smooth',block:'start'});history.replaceState(null,'',link.getAttribute('href'));}));
})();
