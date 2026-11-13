/* Native dialog keeps keyboard focus inside the player and supports Escape. */
(() => {
  'use strict';
  const preview = document.querySelector('.film-preview');
  const dialog = document.querySelector('.film-dialog');
  if (!preview || !dialog) return;
  const player = dialog.querySelector('.film-player');
  const trigger = document.querySelector('.film-open');
  const toggle = document.querySelector('.film-toggle');
  let resumePreview = true;
  const play = video => { const promise = video.play(); if (promise) promise.catch(() => {}); };
  // Set the property too: Safari requires muted playback for inline autoplay.
  preview.muted = true;
  trigger.addEventListener('click', () => {
    resumePreview = !preview.paused;
    preview.pause();
    if (!player.getAttribute('src')) player.src = player.dataset.src;
    dialog.showModal();
    document.body.classList.add('film-is-open');
    play(player);
  });
  dialog.querySelector('.film-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    player.pause();
    document.body.classList.remove('film-is-open');
    if (resumePreview) play(preview);
    trigger.focus({preventScroll: true});
  });
  toggle.addEventListener('click', () => {
    if (preview.paused) play(preview); else preview.pause();
  });
  // Reflect autoplay restrictions and user actions in the translated control.
  preview.addEventListener('play', () => { toggle.setAttribute('aria-pressed', 'false'); toggle.textContent = toggle.dataset.pause; });
  preview.addEventListener('pause', () => { toggle.setAttribute('aria-pressed', 'true'); toggle.textContent = toggle.dataset.resume; });
})();
