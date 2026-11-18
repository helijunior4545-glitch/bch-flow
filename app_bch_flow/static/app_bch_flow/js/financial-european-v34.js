/* One responsive drawer lifecycle, including server-rendered AJAX replacements. */
(() => {
  'use strict';
  if (window.__bfrEuropeanV34) return;
  window.__bfrEuropeanV34 = true;
  const media = matchMedia('(max-width:800px)');
  const root = () => document.querySelector('#main.bfr-dashboard');
  let mounted = null, lockedMain = null, previousInert = false, savedY = 0;
  function unlock() {
    const wasLocked = document.body.classList.contains('bfr-eu-open');
    document.body.classList.remove('bfr-eu-open');
    document.documentElement.classList.remove('bfr-drawer-scroll-lock');
    if (lockedMain) lockedMain.inert = previousInert;
    lockedMain = null;
    if (wasLocked) window.scrollTo({top:savedY,behavior:'instant'});
  }
  function setOpen(open, restore = false) {
    const page = root(), sidebar = page?.querySelector('.premium-sidebar');
    const button = page?.querySelector('.bfr-eu-menu-button');
    const backdrop = page?.querySelector('.bfr-eu-backdrop');
    if (!sidebar || !button) { unlock(); return; }
    open = Boolean(open && media.matches);
    if (open && !document.body.classList.contains('bfr-eu-open')) {
      savedY = window.scrollY;
      lockedMain = page.querySelector('.premium-main');
      previousInert = lockedMain?.inert || false;
      if (lockedMain) lockedMain.inert = true;
      document.documentElement.classList.add('bfr-drawer-scroll-lock');
      document.body.classList.add('bfr-eu-open');
    } else if (!open) unlock();
    button.setAttribute('aria-expanded',String(open));
    sidebar.inert = media.matches && !open;
    if (media.matches) sidebar.setAttribute('aria-hidden',String(!open));
    else sidebar.removeAttribute('aria-hidden');
    if (open) { sidebar.setAttribute('role','dialog'); sidebar.setAttribute('aria-modal','true'); }
    else { sidebar.removeAttribute('role'); sidebar.removeAttribute('aria-modal'); }
    if (backdrop) backdrop.hidden = !open;
    if (open) sidebar.querySelector('.bfr-eu-close')?.focus({preventScroll:true});
    else if (restore) button.focus({preventScroll:true});
  }
  function init() {
    const page = root();
    if (page === mounted) return;
    unlock(); mounted = page;
    if (page) setOpen(false);
  }
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target || !root()) return;
    if (target.closest('.bfr-eu-menu-button')) {
      setOpen(!document.body.classList.contains('bfr-eu-open')); return;
    }
    if (target.closest('.bfr-eu-close,.bfr-eu-backdrop')) { setOpen(false,true); return; }
    if (target.closest('.premium-sidebar a')) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (!document.body.classList.contains('bfr-eu-open')) return;
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false,true); return; }
    if (event.key !== 'Tab') return;
    const sidebar = root()?.querySelector('.premium-sidebar');
    const nodes = Array.from(sidebar?.querySelectorAll('a[href],button:not(:disabled),[tabindex="0"]') || [])
      .filter(element => element.getClientRects().length && !element.closest('[hidden]'));
    if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length-1];
    if (!sidebar.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  media.addEventListener('change', () => setOpen(false));
  window.addEventListener('pagehide',unlock);
  window.addEventListener('pageshow', () => { mounted = null; init(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
  // Only main-root replacement matters, not chart ticks or mutations in dialogs.
  new MutationObserver(init).observe(document.body,{childList:true});
})();
