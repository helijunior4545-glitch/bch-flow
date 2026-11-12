/* BCH_FLOW_EXPERIENCE_V2 */
(() => {
  'use strict';
  const stage = document.querySelector('[data-fx-stage]');
  const overlay = document.querySelector('[data-fx-overlay]');
  if (!stage || !overlay) return;
  const trigger = stage.querySelector('[data-fx-open]');
  const closeButton = overlay.querySelector('[data-fx-close]');
  const dialog = overlay.querySelector('[data-fx-dialog]');
  const frame = overlay.querySelector('[data-fx-frame]');
  const empty = overlay.querySelector('[data-fx-empty]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const videoUrl = stage.getAttribute('data-fx-video-url');
  let video = null;
  let lastFocus = null;
  let opened = false;
  let introDone = false;
  let closeTimer = null;
  const animDuration = () => reduced.matches ? 0 : (window.matchMedia('(max-width: 650px)').matches ? 220 : 420);
  function ensureVideo() {
    if (video || !videoUrl) return;
    video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('preload', 'metadata');
    video.setAttribute('controls', '');
    video.src = videoUrl;
    video.addEventListener('ended', close);
    video.addEventListener('error', () => {
      if (video) { video.remove(); video = null; }
      empty.hidden = false;
    });
    empty.hidden = true;
    frame.appendChild(video);
  }
  function open() {
    if (opened) return;
    clearTimeout(closeTimer);
    opened = true;
    lastFocus = document.activeElement;
    if (!introDone && !reduced.matches) {
      stage.classList.add('fx-greeting');
      setTimeout(() => stage.classList.remove('fx-greeting'), 1500);
    }
    introDone = true;
    overlay.hidden = false;
    document.body.classList.add('fx-modal-open');
    ensureVideo();
    // Playback is started synchronously from the user's click, not after animation.
    if (video) {
      video.currentTime = 0;
      const playback = video.play();
      if (playback && typeof playback.catch === 'function') playback.catch(() => {});
    }
    requestAnimationFrame(() => overlay.classList.add('fx-visible'));
    closeButton.focus({preventScroll:true});
  }
  function close() {
    if (!opened) return;
    opened = false;
    overlay.classList.remove('fx-visible');
    if (video) video.pause();
    document.body.classList.remove('fx-modal-open');
    closeTimer = setTimeout(() => { overlay.hidden = true; }, animDuration());
    if (lastFocus && lastFocus.isConnected) lastFocus.focus({preventScroll:true});
  }
  trigger.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  document.addEventListener('keydown', event => {
    if (!opened) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key === 'Tab') {
      const targets = [...dialog.querySelectorAll('button:not([disabled]),video[controls],a[href]')].filter(el => el.getClientRects().length);
      if (!targets.length) { event.preventDefault(); closeButton.focus(); return; }
      const first = targets[0], last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
})();
