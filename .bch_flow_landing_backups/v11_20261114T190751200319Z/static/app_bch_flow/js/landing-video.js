/* BCH Flow V9 — progressive enhancements only; no layout changes at load */
(()=>{'use strict';const root=document.querySelector('.bf-landing');if(!root)return;
const dialog=root.querySelector('#bf-film-dialog'),preview=root.querySelector('.bf-film-preview'),player=root.querySelector('.bf-film-player');let focusBack=null;
function openFilm(event){if(!dialog||!player||typeof dialog.showModal!=='function')return;focusBack=event.currentTarget;preview?.pause();if(!player.src)player.src=player.dataset.src;dialog.showModal();const p=player.play();if(p&&typeof p.catch==='function')p.catch(()=>{});}
root.querySelectorAll('.bf-film-open,[data-open-film]').forEach(b=>b.addEventListener('click',openFilm));
dialog?.querySelector('[data-close-film]')?.addEventListener('click',()=>dialog.close());dialog?.addEventListener('close',()=>{player?.pause();if(focusBack?.isConnected)focusBack.focus({preventScroll:true});});
dialog?.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
const language=root.querySelector('#bf-language');language?.addEventListener('change',()=>language.form?.requestSubmit());
})();
