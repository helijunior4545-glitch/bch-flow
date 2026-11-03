/* BCH FLOW V311 — progressive visual enhancement only; never intercept payment submissions */
(() => {
  'use strict';
  if (!/\/dashboard\/organizations\/[^/]+\/wallet(?:\/|$)/.test(location.pathname)) return;
  document.documentElement.classList.add('bch-v311');
  const start = () => {
    // Indicate that this is the REAL wallet page, not the v301 demo; no fake balance or state.
    const toast = document.createElement('div');
    toast.className = 'bch-v311-toast'; toast.hidden = true;
    toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    let hideTimer;
    const notify = (message) => {
      toast.textContent = message; toast.hidden = false;
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { toast.hidden = true; }, 2300);
    };
    // Copy feedback only for elements explicitly marked as copy controls.
    document.addEventListener('click', (event) => {
      const el = event.target.closest('[data-copy-address], [data-copy-value]');
      if (!el || !navigator.clipboard || !window.isSecureContext) return;
      // Existing business handlers remain untouched; no preventDefault/stopPropagation.
      const value = el.getAttribute('data-copy-address') || el.getAttribute('data-copy-value');
      if (!value) return;
      navigator.clipboard.writeText(value).then(() => notify('Copied to clipboard')).catch(() => {});
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
