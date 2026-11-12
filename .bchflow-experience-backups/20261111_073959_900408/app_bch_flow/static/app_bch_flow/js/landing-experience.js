/* BCH Flow Experience V6 — isolated, dependency-free interaction controller */
(() => {
  'use strict';
  const root = document.querySelector('.bch-v6');
  if (!root || root.dataset.experienceReady === '1') return;
  root.dataset.experienceReady = '1';
  const player = document.getElementById('bch-player');
  const slot = document.getElementById('bch-player-slot');
  const video = document.getElementById('bch-video');
  const display = document.getElementById('bch-player-display');
  const close = document.getElementById('bch-close');
  const status = document.getElementById('bch-video-status');
  if (![player,slot,video,display,close,status].every(Boolean)) return;

  const actor = root.querySelector('.bch-mascot-actor');
  const actorVideo = actor?.querySelector('video');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 650px)');
  const backdrop = document.createElement('div');
  backdrop.className = 'bch-modal-backdrop';
  backdrop.hidden = true;
  const host = document.createElement('div');
  host.className = 'bch-modal-host';
  host.hidden = true;
  host.setAttribute('role','dialog');
  host.setAttribute('aria-modal','true');
  host.setAttribute('aria-label','BCH Flow demonstration video');
  document.body.append(backdrop, host);

  let opened = false, transitioning = false, previousFocus = null, previousOverflow = '';
  let activeTween = null, actorTimer = null, observer = null, actorVisible = false;
  const lightMotion = () => reduced.matches || matchMedia('(max-width: 760px)').matches;
  const hasDemo = () => Boolean(video.dataset.videoSrc || video.getAttribute('src') || video.querySelector('source[src]'));

  function actorGesture(kind) {
    if (!actor || reduced.matches) return;
    clearTimeout(actorTimer);
    actor.classList.remove('is-inviting','is-confirming');
    void actor.offsetWidth;
    actor.classList.add(kind === 'confirm' ? 'is-confirming' : 'is-inviting');
    actorTimer = setTimeout(() => actor.classList.remove('is-inviting','is-confirming'), 950);
  }
  function actorPlayback() {
    if (!actorVideo) return;
    const shouldPlay = !document.hidden && actorVisible && !reduced.matches && !small.matches && !opened;
    if (!shouldPlay) {
      actorVideo.pause();
      actor?.classList.remove('is-playing');
      return;
    }
    const attempt = actorVideo.play();
    if (attempt?.then) attempt.then(() => actor?.classList.add('is-playing'))
      .catch(() => actor?.classList.remove('is-playing'));
  }
  if (actor && actorVideo) {
    actorVideo.addEventListener('error', () => { actorVideo.pause(); actor.classList.remove('is-playing'); });
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        actorVisible = !!entries[0]?.isIntersecting;
        actorPlayback();
      }, {threshold: 0.12});
      observer.observe(actor);
    } else { actorVisible = true; actorPlayback(); }
    document.addEventListener('visibilitychange',actorPlayback);
    reduced.addEventListener?.('change',actorPlayback);
    small.addEventListener?.('change',actorPlayback);
    // A single invitation, not a constant distracting loop.
    actorTimer = setTimeout(() => { if (!opened && actorVisible) actorGesture('invite'); }, 1600);
  }

  function tweenBetween(from, to, duration) {
    if (activeTween) { activeTween.cancel(); activeTween = null; }
    if (lightMotion() || !player.animate || !from.width || !to.width) return Promise.resolve();
    const dx = from.left - to.left, dy = from.top - to.top;
    const sx = from.width / to.width, sy = from.height / to.height;
    player.classList.add('is-transitioning');
    activeTween = player.animate(
      [{ transform:`translate3d(${dx}px,${dy}px,0) scale(${sx},${sy})`, opacity:0.93 },
       { transform:'translate3d(0,0,0) scale(1,1)', opacity:1 }],
      { duration, easing:'cubic-bezier(.22,1,.36,1)', fill:'both' }
    );
    const current = activeTween;
    return current.finished.catch(() => {}).then(() => {
      if (activeTween === current) { activeTween = null; player.classList.remove('is-transitioning'); }
      current.cancel();
    });
  }
  function setVideoStatus(message) {
    status.textContent = message;
    video.hidden = true;
    display.hidden = false;
  }
  function startDemo() {
    if (!hasDemo()) {
      setVideoStatus('A demonstração estará disponível quando bch-flow-demo.mp4 for adicionado.');
      return;
    }
    if (video.dataset.videoSrc && !video.getAttribute('src')) video.src = video.dataset.videoSrc;
    display.hidden = true;
    video.hidden = false;
    video.controls = true;
    const attempt = video.play();
    if (attempt?.catch) attempt.catch(() => {
      setVideoStatus('Toque em reproduzir ou verifique o arquivo de demonstração.');
    });
  }
  function openModal() {
    if (opened || transitioning) return;
    previousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    const from = player.getBoundingClientRect();
    opened = true; transitioning = true;
    actorGesture('confirm');
    actorPlayback();
    backdrop.hidden = false;
    host.hidden = false;
    host.appendChild(player);
    document.body.style.overflow = 'hidden';
    close.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add('is-visible'));
    host.classList.add('is-visible');
    // Playback remains inside the click handler, before any awaited transition.
    startDemo();
    close.focus({preventScroll:true});
    const to = player.getBoundingClientRect();
    tweenBetween(from,to,lightMotion()?0:560).finally(() => { transitioning = false; });
  }
  function closeModal() {
    if (!opened) return;
    opened = false;
    transitioning = true;
    activeTween?.cancel();
    activeTween = null;
    video.pause();
    try { video.currentTime = 0; } catch (_) {}
    video.hidden = true;
    display.hidden = false;
    close.hidden = true;
    const from = player.getBoundingClientRect();
    slot.appendChild(player);
    const to = player.getBoundingClientRect();
    backdrop.classList.remove('is-visible');
    const finish = () => {
      host.classList.remove('is-visible');
      host.hidden = true;
      backdrop.hidden = true;
      document.body.style.overflow = previousOverflow;
      transitioning = false;
      actorPlayback();
      previousFocus?.focus?.({preventScroll:true});
    };
    tweenBetween(from,to,lightMotion()?0:430).finally(finish);
  }
  root.querySelectorAll('[data-bch-open]').forEach(control =>
    control.addEventListener('click', e => { e.preventDefault(); openModal(); }));
  close.addEventListener('click',closeModal);
  backdrop.addEventListener('click',closeModal);
  document.addEventListener('keydown', e => {
    if (!opened) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    if (e.key === 'Tab') {
      const focusable = [...player.querySelectorAll('button:not([hidden]),video[controls],a[href]')]
        .filter(el => !el.hidden && el.getClientRects().length);
      if (!focusable.length) { e.preventDefault(); close.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!host.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  });
  video.addEventListener('ended',closeModal);
  video.addEventListener('error',() => setVideoStatus('Não foi possível carregar o vídeo de demonstração.'));
  window.addEventListener('pagehide',() => { actorVideo?.pause(); observer?.disconnect(); clearTimeout(actorTimer); },{once:true});
})();
