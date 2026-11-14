/* BCH Flow Landing V6: microinteractions, native dialog, reveal, tilt and pointer light. */
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
 // No scroll reveal: keep sections fully visible from the first paint.
 root.querySelectorAll('[data-glow-card]').forEach(card=>card.addEventListener('pointermove',e=>{if(reduce.matches)return;const r=card.getBoundingClientRect();card.style.setProperty('--bf-glow-x',`${e.clientX-r.left}px`);card.style.setProperty('--bf-glow-y',`${e.clientY-r.top}px`);},{passive:true}));
 // Smooth anchor navigation only for same-page destinations; honor reduced motion.
 root.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',e=>{const target=root.querySelector(link.getAttribute('href'));if(!target)return;e.preventDefault();target.scrollIntoView({behavior:reduce.matches?'instant':'smooth',block:'start'});history.replaceState(null,'',link.getAttribute('href'));}));
})();
