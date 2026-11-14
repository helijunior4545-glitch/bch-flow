/* BCH FLOW V17 — refined scroll depth and micro-interactions, no icon drawing. */
(()=>{'use strict';
const root=document.querySelector('.bf-landing');if(!root)return;
const dialog=root.querySelector('#bf-film-dialog');
const preview=root.querySelector('.bf-film-preview');
const player=root.querySelector('.bf-film-player');
let previousFocus=null;
function openFilm(event){
 if(!dialog||!player||typeof dialog.showModal!=='function')return;
 previousFocus=event.currentTarget;
 preview?.pause();
 if(!player.getAttribute('src')&&player.dataset.src)player.src=player.dataset.src;
 dialog.showModal();
 const playback=player.play();if(playback?.catch)playback.catch(()=>{});
}
root.querySelectorAll('.bf-film-open,[data-open-film]').forEach(button=>button.addEventListener('click',openFilm));
dialog?.querySelector('[data-close-film]')?.addEventListener('click',()=>dialog.close());
dialog?.addEventListener('close',()=>{player?.pause();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});});
dialog?.addEventListener('click',event=>{
 if(event.target!==dialog)return;
 const rect=dialog.getBoundingClientRect();
 if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
});
const language=root.querySelector('#bf-language');
language?.addEventListener('change',()=>{
 const form=language.form;if(!form)return;
 if(typeof form.requestSubmit==='function')form.requestSubmit();else form.submit();
});
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const fine=window.matchMedia('(hover: hover) and (pointer: fine)');
const sections=[...root.querySelectorAll('.bf-parallax-section')];
const hero=root.querySelector('.bf-hero');
const eventStrip=root.querySelector('.bf-event');
const jury=root.querySelector('.bf-jury');
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
let frameId=0;
function clearDepth(){
 hero?.style.removeProperty('--bf-hero-y');
 eventStrip?.style.removeProperty('--bf-strip-x');
 jury?.style.removeProperty('--bf-jury-x');
 sections.forEach(section=>{
  section.style.removeProperty('--bf-depth-y');
  section.querySelectorAll('[data-parallax]').forEach(el=>el.style.removeProperty('--bf-layer-y'));
 });
}
function renderDepth(){
 frameId=0;
 if(reduced.matches||window.innerWidth<820){clearDepth();return;}
 const viewport=window.innerHeight;
 if(hero){
  const rect=hero.getBoundingClientRect();
  if(rect.bottom>0&&rect.top<viewport){
   const delta=clamp((rect.top+rect.height/2-viewport/2)*-.085,-23,23);
   hero.style.setProperty('--bf-hero-y',`${delta.toFixed(1)}px`);
  }
 }
 if(eventStrip){const r=eventStrip.getBoundingClientRect();if(r.bottom>0&&r.top<viewport)eventStrip.style.setProperty('--bf-strip-x',`${clamp((viewport/2-r.top)*.09,-35,35).toFixed(1)}px`);}
 sections.forEach(section=>{
  const rect=section.getBoundingClientRect();if(rect.bottom<0||rect.top>viewport)return;
  const distance=rect.top+rect.height/2-viewport/2;
  section.style.setProperty('--bf-depth-y',`${clamp(distance*.075,-38,38).toFixed(1)}px`);
  section.querySelectorAll('[data-parallax]').forEach(layer=>{
   const speed=clamp(Number(layer.dataset.parallax)||.06,-.2,.2);
   layer.style.setProperty('--bf-layer-y',`${clamp(distance*speed,-42,42).toFixed(1)}px`);
  });
 });
 if(jury){const r=jury.getBoundingClientRect();if(r.bottom>0&&r.top<viewport)jury.style.setProperty('--bf-jury-x',`${clamp((viewport/2-r.top)*.07,-35,35).toFixed(1)}px`);}
}
function scheduleDepth(){if(!frameId)frameId=requestAnimationFrame(renderDepth);}
window.addEventListener('scroll',scheduleDepth,{passive:true});
window.addEventListener('resize',scheduleDepth,{passive:true});
reduced.addEventListener?.('change',scheduleDepth);
scheduleDepth();
if(fine.matches&&!reduced.matches){
 root.querySelectorAll('[data-tilt-card]').forEach(card=>{
  card.addEventListener('pointermove',event=>{
   const rect=card.getBoundingClientRect();
   card.style.setProperty('--bf-pointer-x',`${((event.clientX-rect.left)/rect.width*100).toFixed(1)}%`);
   card.style.setProperty('--bf-pointer-y',`${((event.clientY-rect.top)/rect.height*100).toFixed(1)}%`);
  },{passive:true});
  card.addEventListener('pointerleave',()=>{
   card.style.removeProperty('--bf-pointer-x');card.style.removeProperty('--bf-pointer-y');
  });
 });
}
})();
