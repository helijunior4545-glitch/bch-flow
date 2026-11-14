/* BCH Flow V11 — progressive enhancements only; no layout changes at load */
(()=>{'use strict';const root=document.querySelector('.bf-landing');if(!root)return;
const dialog=root.querySelector('#bf-film-dialog'),preview=root.querySelector('.bf-film-preview'),player=root.querySelector('.bf-film-player');let focusBack=null;
function openFilm(event){if(!dialog||!player||typeof dialog.showModal!=='function')return;focusBack=event.currentTarget;preview?.pause();if(!player.src)player.src=player.dataset.src;dialog.showModal();const p=player.play();if(p&&typeof p.catch==='function')p.catch(()=>{});}
root.querySelectorAll('.bf-film-open,[data-open-film]').forEach(b=>b.addEventListener('click',openFilm));
dialog?.querySelector('[data-close-film]')?.addEventListener('click',()=>dialog.close());dialog?.addEventListener('close',()=>{player?.pause();if(focusBack?.isConnected)focusBack.focus({preventScroll:true});});
dialog?.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
const language=root.querySelector('#bf-language');language?.addEventListener('change',()=>language.form?.requestSubmit());

// Progressive effects: no opacity reveal or layout mutations, no scroll jumps.
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const fine=window.matchMedia('(hover: hover) and (pointer: fine)');
const effects=[...root.querySelectorAll('[data-parallax]')];
let raf=0;
function frame(){raf=0;if(reduced.matches||window.innerWidth<800){effects.forEach(el=>el.style.removeProperty('transform'));return;}
const mid=window.innerHeight/2;effects.forEach(el=>{const r=el.parentElement.getBoundingClientRect();if(r.bottom<0||r.top>window.innerHeight)return;const offset=Math.max(-24,Math.min(24,(r.top+r.height/2-mid)*Number(el.dataset.parallax||0)));el.style.transform=`translate3d(0,${offset.toFixed(1)}px,0)`;});}
function schedule(){if(!raf)raf=requestAnimationFrame(frame)}
window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});reduced.addEventListener?.('change',schedule);schedule();
if(fine.matches&&!reduced.matches){root.querySelectorAll('[data-tilt-card]').forEach(card=>{card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();card.style.setProperty('--pointer-x',`${((e.clientX-r.left)/r.width*100).toFixed(1)}%`);card.style.setProperty('--pointer-y',`${((e.clientY-r.top)/r.height*100).toFixed(1)}%`);});card.addEventListener('pointerleave',()=>{card.style.removeProperty('--pointer-x');card.style.removeProperty('--pointer-y')});});}
})();

/* V21 cinematic parallax: background position, not transforms of content */
(()=>{'use strict';const hero=document.querySelector('.bf-hero');if(!hero)return;const mq=matchMedia('(prefers-reduced-motion: reduce)');let ticking=false;function update(){ticking=false;if(mq.matches||innerWidth<721){hero.style.removeProperty('--hero-shift');return;}const r=hero.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;hero.style.setProperty('--hero-shift',Math.max(-22,Math.min(22,-r.top*.07)).toFixed(1)+'px');}function schedule(){if(!ticking){ticking=true;requestAnimationFrame(update)}}addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});schedule();})();
