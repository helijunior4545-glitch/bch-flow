/* First-party previews: defer network and decoding until actually visible. */
(() => {
  'use strict';
  const root = document.querySelector('[data-showcase]');
  if (!root) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const previews = [...root.querySelectorAll('[data-preview-video]')].map(video => ({video, button:video.parentElement.querySelector('[data-preview-toggle]'), visible:false, paused:false, manual:false}));
  const lookup = new Map(previews.map(item => [item.video,item]));
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const item = lookup.get(entry.target);
      item.visible = entry.isIntersecting && entry.intersectionRatio >= .5;
      sync(item);
    }
  }, {threshold:[0,.5]});
  function sync(item) {
    const allowed = item.visible && !document.hidden && !item.video.closest('[inert]') && !item.paused && (item.manual || (!motion.matches && !connection?.saveData));
    if (!allowed) {item.video.pause(); return;}
    if (!item.video.getAttribute('src')) {item.video.src = item.video.dataset.src; item.video.load();}
    item.video.muted = true;
    item.video.play().catch(() => {item.button.hidden=false;});
  }
  for (const item of previews) {
    item.video.hidden = false;
    item.button.hidden = false;
    item.button.addEventListener('click', () => {
      item.paused = !item.video.paused;
      item.manual = !item.paused;
      sync(item);
    });
    item.video.addEventListener('playing',()=>{item.video.dataset.ready='';item.button.textContent=item.button.dataset.pauseLabel;item.button.setAttribute('aria-pressed','true');item.button.setAttribute('aria-label',`${item.button.dataset.pauseLabel}: ${item.video.getAttribute('aria-label')}`);});
    item.video.addEventListener('pause',()=>{item.button.textContent=item.button.dataset.playLabel;item.button.setAttribute('aria-pressed','false');item.button.setAttribute('aria-label',`${item.button.dataset.playLabel}: ${item.video.getAttribute('aria-label')}`);});
    item.video.addEventListener('error',()=>{item.video.hidden=true;item.button.hidden=true;});
    observer.observe(item.video);
  }
  document.addEventListener('visibilitychange',()=>previews.forEach(sync));
  motion.addEventListener('change',()=>previews.forEach(sync));
  connection?.addEventListener('change',()=>previews.forEach(sync));
  addEventListener('pagehide',()=>previews.forEach(item=>item.video.pause()));
  addEventListener('pageshow',()=>previews.forEach(sync));
})();
