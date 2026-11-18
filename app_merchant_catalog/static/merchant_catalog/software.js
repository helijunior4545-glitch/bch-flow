(() => {
  'use strict';
  document.querySelectorAll('[data-pending-form]').forEach(form => {
    form.addEventListener('submit', event => {
      const submitter = event.submitter;
      // Keep the selected payment route even after disabling all method buttons.
      if (submitter?.hasAttribute('formaction')) form.action = submitter.formAction;
      form.querySelectorAll('button[type="submit"]').forEach(button => {
        button.disabled = true;
        if (button === submitter) button.setAttribute('aria-busy', 'true');
      });
    });
  });
  window.addEventListener('pageshow', () => {
    document.querySelectorAll('[data-pending-form] button').forEach(button => {
      button.disabled = false; button.removeAttribute('aria-busy');
    });
  });
  document.querySelectorAll('[data-sw-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const input = document.getElementById(button.dataset.swCopy);
      const label = button.querySelector('span');
      if (!input || !label) return;
      const original = label.textContent;
      try {
        await navigator.clipboard.writeText(input.value);
        label.textContent = button.dataset.copySuccess;
      } catch (_) {
        input.focus(); input.select();
        label.textContent = button.dataset.copyFallback;
      }
      window.setTimeout(() => { label.textContent = original; }, 3500);
    });
  });
  const root = document.querySelector('[data-software-order]');
  if (!root) return;
  // Render translated state messages on the server. Reload only on transitions.
  let stopped = false;
  const terminal = new Set(['review', 'expired']);
  const feedback = root.querySelector('[data-poll-feedback]');
  async function poll() {
    if (stopped) return;
    if (document.hidden) { setTimeout(poll, 5000); return; }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(root.dataset.statusUrl, {
        credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: {'Accept': 'application/json'}
      });
      if (!response.ok) throw new Error('status');
      const result = await response.json();
      if (typeof result.state !== 'string') throw new Error('response');
      if (result.state !== root.dataset.state) { window.location.reload(); return; }
      root.querySelector('[data-received]').textContent = result.received;
      feedback.textContent = '';
    } catch (_) {
      feedback.textContent = root.dataset.retryMessage;
    } finally { clearTimeout(timeout); }
    if (!stopped && !terminal.has(root.dataset.state)) setTimeout(poll, 5000);
  }
  // Keep checking ready orders too: a reversal must remove the download action.
  window.addEventListener('pagehide', () => { stopped = true; });
  window.addEventListener('pageshow', event => { if (event.persisted) { stopped = false; poll(); } });
  if (!terminal.has(root.dataset.state)) setTimeout(poll, 3000);
})();
