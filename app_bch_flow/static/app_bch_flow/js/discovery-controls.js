(() => {
  'use strict';
  document.querySelectorAll('[data-language-menu]').forEach(menu => {
    const summary = menu.querySelector('summary');
    const buttons = Array.from(menu.querySelectorAll('button[name="language"]'));
    menu.addEventListener('keydown', event => {
      if (event.key === 'Escape') { menu.open = false; summary.focus(); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); menu.open = true;
      const index = buttons.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : index < 0 ? (event.key === 'ArrowDown' ? 0 : buttons.length - 1) : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    });
    document.addEventListener('pointerdown', event => { if (!menu.contains(event.target)) menu.open = false; }, {passive:true});
    menu.addEventListener('focusout', () => { requestAnimationFrame(() => { if (!menu.contains(document.activeElement)) menu.open = false; }); });
    menu.querySelector('form').addEventListener('submit', event => { if (event.submitter) event.submitter.setAttribute('aria-busy', 'true'); });
    window.addEventListener('pageshow', () => { menu.open = false; buttons.forEach(button => button.removeAttribute('aria-busy')); });
  });
  document.querySelectorAll('[data-announcements]').forEach(root => {
    const items = Array.from(root.querySelectorAll('[data-announcement-item]'));
    const control = root.querySelector('[data-announcement-toggle]');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = motion.matches, current = 0, timer;
    control.hidden = false;
    function schedule() {
      clearInterval(timer);
      control.setAttribute('aria-pressed', String(!paused && !motion.matches));
      control.setAttribute('aria-label', paused ? control.dataset.playLabel : control.dataset.pauseLabel);
      control.querySelector('[data-announcement-state]').setAttribute('d', paused ? 'm9 5 10 7-10 7Z' : 'M9 5v14M15 5v14');
      if (paused || motion.matches) return;
      timer = setInterval(() => {
        if (document.hidden || (root.contains(document.activeElement) && document.activeElement !== control) || (matchMedia('(hover:hover)').matches && root.matches(':hover'))) return;
        items[current].hidden = true;
        current = (current + 1) % items.length;
        items[current].hidden = false;
      }, 7500);
    }
    control.addEventListener('click', () => { paused = !paused; schedule(); });
    root.addEventListener('pointerdown', event => {
      if (!event.target.closest('[data-announcement-toggle]')) { paused = true; schedule(); }
    }, {passive:true});
    motion.addEventListener('change', () => { if (motion.matches) paused = true; schedule(); });
    window.addEventListener('pagehide', () => clearInterval(timer));
    window.addEventListener('pageshow', schedule);
    schedule();
  });
  document.querySelectorAll('[data-technologies]').forEach(root => {
    const track = root.querySelector('[data-tech-track]');
    const group = root.querySelector('[data-tech-group]');
    const control = root.querySelector('[data-tech-play]');
    const caption = root.querySelector('[data-tech-caption]');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const clone = group.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('button').forEach(button => { button.tabIndex = -1; });
    track.append(clone); root.dataset.ready = ''; control.hidden = false;
    let paused = motion.matches, visible = false;
    function update() {
      root.toggleAttribute('data-paused', paused || motion.matches);
      root.toggleAttribute('data-away', document.hidden || !visible);
      control.setAttribute('aria-pressed', String(!paused && !motion.matches));
      control.setAttribute('aria-label', paused ? control.dataset.playLabel : control.dataset.pauseLabel);
      control.querySelector('[data-tech-state]').setAttribute('d', paused ? 'm9 5 10 7-10 7Z' : 'M9 5v14M15 5v14');
      control.disabled = motion.matches;
    }
    root.querySelectorAll('[data-technology]').forEach(button => button.addEventListener('click', () => {
      paused = true;
      root.querySelectorAll('[data-technology]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.technology === button.dataset.technology)));
      caption.textContent = button.dataset.technology; update();
    }));
    control.addEventListener('click', () => { paused = !paused; root.removeAttribute('data-keyboard'); update(); });
    root.addEventListener('pointerdown', event => {
      if (event.target.closest('[data-tech-group][aria-hidden]')) event.preventDefault();
      if (!event.target.closest('[data-tech-play]')) { paused = true; update(); }
    });
    root.addEventListener('focusin', event => {
      if (event.target.matches(':focus-visible') && event.target.closest('[data-tech-group]:not([aria-hidden])')) root.dataset.keyboard = '';
    });
    root.addEventListener('focusout', () => requestAnimationFrame(() => {
      if (!root.contains(document.activeElement)) root.removeAttribute('data-keyboard');
    }));
    document.addEventListener('visibilitychange', update);
    motion.addEventListener('change', () => { if (motion.matches) paused = true; update(); });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); });
      observer.observe(root);
    } else visible = true;
    update();
  });
})();
