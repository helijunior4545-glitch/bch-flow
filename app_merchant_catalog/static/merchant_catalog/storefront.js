(() => {
  'use strict';
  const root = document.querySelector('[data-showcase]');
  if (!root) return;
  const viewport = root.querySelector('[data-software-carousel]');
  const track = root.querySelector('[data-software-track]');
  const cards = Array.from(root.querySelectorAll('[data-software-card]'));
  if (!cards.length) return;
  const search = root.querySelector('[data-software-search]');
  const controls = root.querySelector('[data-carousel-controls]');
  const dots = root.querySelector('[data-page-dots]');
  const play = root.querySelector('[data-carousel-play]');
  const position = root.querySelector('[data-carousel-position]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 1000px)');
  const tablet = window.matchMedia('(min-width: 620px)');
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const searchable = new Map(cards.map(card => [card, normalize(card.dataset.softwareSearchText || card.textContent)]));
  let page = 0, pages = [], selected = 'all', paused = reduced.matches, hovered = false, timer, scrollFrame;
  let size = desktop.matches ? 6 : tablet.matches ? 4 : 2;
  root.querySelectorAll('[data-enhanced]').forEach(element => { element.hidden = false; });
  viewport.classList.add('is-enhanced');
  function playback() {
    paused = paused || reduced.matches;
    play.disabled = reduced.matches;
    position.setAttribute('aria-live', paused ? 'polite' : 'off');
    play.setAttribute('aria-pressed', String(!paused));
    play.setAttribute('aria-label', paused ? play.dataset.playLabel : play.dataset.pauseLabel);
    play.innerHTML = `<i data-lucide="${paused ? 'play' : 'pause'}" aria-hidden="true"></i>`;
    window.lucide?.createIcons();
    clearInterval(timer);
    if (paused || pages.length < 2 || reduced.matches) return;
    timer = setInterval(() => {
      const focused = root.contains(document.activeElement) && document.activeElement !== play;
      if (document.hidden || hovered || focused) return;
      go((page + 1) % pages.length, false);
    }, 6500);
  }
  function stop() { if (!paused) { paused = true; playback(); } }
  function update() {
    position.textContent = `${page + 1} / ${pages.length}`;
    Array.from(dots.children).forEach((dot, index) => {
      dot.setAttribute('aria-current', String(index === page));
    });
    // Off-screen cards remain swipeable, but are excluded from keyboard focus.
    pages.forEach((element, index) => { element.inert = index !== page; });
  }
  function go(index, manual = true) {
    if (!pages.length) return;
    if (manual) stop();
    page = (index + pages.length) % pages.length;
    viewport.scrollTo({left: page * viewport.clientWidth, behavior: reduced.matches ? 'instant' : 'smooth'});
    update();
  }
  function rebuild() {
    const query = normalize(search.value.trim());
    const matches = cards.filter(card => (selected === 'all' || card.dataset.methods.split(/\s+/).includes(selected)) && searchable.get(card).includes(query));
    pages = []; page = 0; track.replaceChildren(); dots.replaceChildren();
    for (let index = 0; index < matches.length; index += size) {
      const group = document.createElement('div'); group.className = 'sw-carousel-page';
      group.append(...matches.slice(index, index + size)); track.append(group); pages.push(group);
      const dot = document.createElement('button'); dot.type = 'button';
      dot.setAttribute('aria-label', `${Math.floor(index / size) + 1} / ${Math.ceil(matches.length / size)}`);
      dot.addEventListener('click', () => go(Math.floor(index / size))); dots.append(dot);
    }
    root.querySelector('[data-result-count]').textContent = matches.length;
    root.querySelector('[data-result-status]').textContent = `${matches.length} ${root.querySelector('.sw-result-count').textContent.replace(/^\s*\d+\s*/, '').trim()}`;
    root.querySelector('[data-no-results]').hidden = matches.length !== 0;
    viewport.hidden = !matches.length; viewport.tabIndex = pages.length > 1 ? 0 : -1;
    controls.hidden = pages.length < 2;
    viewport.scrollTo({left:0, behavior:'instant'}); update(); playback();
  }
  search.addEventListener('input', () => { stop(); rebuild(); });
  root.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    selected = button.dataset.filter; stop();
    root.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    rebuild();
  }));
  root.querySelector('[data-carousel-prev]').addEventListener('click', () => go(page - 1));
  root.querySelector('[data-carousel-next]').addEventListener('click', () => go(page + 1));
  play.addEventListener('click', () => { paused = !paused; playback(); });
  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport) return;
    const right = getComputedStyle(viewport).direction === 'rtl' ? -1 : 1;
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    go(event.key === 'Home' ? 0 : event.key === 'End' ? pages.length - 1 : page + (event.key === 'ArrowRight' ? right : -right));
  });
  viewport.addEventListener('scroll', () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      if (!viewport.clientWidth || !pages.length) return;
      const current = Math.min(pages.length - 1, Math.max(0, Math.round(Math.abs(viewport.scrollLeft) / viewport.clientWidth)));
      if (page !== current) { page = current; update(); }
    });
  }, {passive:true});
  let drag = null, dragged = false;
  viewport.addEventListener('pointerdown', event => {
    stop();
    if (event.pointerType !== 'mouse' || event.button !== 0 || pages.length < 2) return;
    drag = {id:event.pointerId, x:event.clientX, left:viewport.scrollLeft};
    dragged = false;
  });
  viewport.addEventListener('dragstart', event => event.preventDefault());
  viewport.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const distance = event.clientX - drag.x;
    if (!dragged && Math.abs(distance) < 8) return;
    dragged = true;
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-dragging');
    viewport.scrollTo({left:drag.left - distance, behavior:'instant'});
    event.preventDefault();
  });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const moved = dragged;
    drag = null;
    viewport.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    if (moved) go(Math.round(Math.abs(viewport.scrollLeft) / viewport.clientWidth));
    setTimeout(() => { dragged = false; }, 0);
  }
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('click', event => {
    if (dragged) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  viewport.addEventListener('wheel', stop, {passive:true});
  root.addEventListener('mouseenter', () => { hovered = true; });
  root.addEventListener('mouseleave', () => { hovered = false; });
  reduced.addEventListener('change', () => { paused = reduced.matches || paused; playback(); });
  const resize = () => { const next = desktop.matches ? 6 : tablet.matches ? 4 : 2; if (next !== size) { size = next; rebuild(); } else viewport.scrollTo({left:page * viewport.clientWidth,behavior:'instant'}); };
  let resizeFrame;
  window.addEventListener('resize', () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(resize); });
  // A broken seller image should degrade to the branded fallback rather than a broken icon.
  cards.forEach(card => {
    const image = card.querySelector('.sw-product-visual img');
    if (!image) return;
    const fallback = () => { image.hidden = true; card.querySelector('.sw-image-placeholder').hidden = false; };
    image.addEventListener('error', fallback);
    if (image.complete && !image.naturalWidth) fallback();
  });
  window.addEventListener('pagehide', () => clearInterval(timer));
  window.addEventListener('pageshow', playback);
  rebuild();
})();
