/* Revalidate old tabs and restored history after BCH account transitions. */
(() => {
  'use strict';
  function context() {
    return document.cookie.split(';').map(item => item.trim())
      .find(item => item.startsWith('bchflow_context=')) || '';
  }
  const initial = context();
  let reloading = false;
  function revalidate(restored = false) {
    if (!reloading && (restored || context() !== initial)) {
      reloading = true;
      document.documentElement.style.visibility = 'hidden';
      location.reload();
    }
  }
  window.addEventListener('pageshow', event => revalidate(event.persisted));
  window.addEventListener('focus', () => revalidate());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) revalidate(); });
})();
