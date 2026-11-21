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
  const download = document.getElementById('download-software');
  if (download && window.location.hash === '#download-software') {
    download.focus();
  }
  const feedback = root.querySelector('[data-poll-feedback]');
  const progress = root.querySelector('[data-payment-progress]');
  const checking = progress?.querySelector('[data-checking]');
  const nextCheck = progress?.querySelector('[data-next-check]');
  const seconds = progress?.querySelector('[data-check-seconds]');
  let scheduledPoll;
  let countdown;
  let activeRequest;
  if (progress) progress.hidden = false;

  function schedulePoll(delay) {
    clearTimeout(scheduledPoll);
    clearInterval(countdown);
    if (progress) {
      const deadline = Date.now() + delay;
      const update = () => {
        seconds.textContent = Math.max(1, Math.ceil((deadline - Date.now()) / 1000));
      };
      checking.hidden = true;
      nextCheck.hidden = false;
      update();
      countdown = setInterval(update, 250);
    }
    scheduledPoll = setTimeout(poll, delay);
  }

  async function poll() {
    if (stopped || activeRequest) return;
    if (document.hidden) { schedulePoll(5000); return; }
    clearInterval(countdown);
    if (progress) {
      nextCheck.hidden = true;
      checking.hidden = false;
    }
    const controller = new AbortController();
    activeRequest = controller;
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(root.dataset.statusUrl, {
        credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: {'Accept': 'application/json'}
      });
      if (activeRequest !== controller) return;
      if (!response.ok) throw new Error('status');
      const result = await response.json();
      if (activeRequest !== controller) return;
      if (typeof result.state !== 'string') throw new Error('response');
      if (result.state !== root.dataset.state) {
        const destination = new URL(window.location.href);
        destination.hash = result.state === 'ready' ? 'download-software' : '';
        window.history.replaceState(null, '', destination);
        window.location.reload();
        return;
      }
      root.querySelector('[data-received]').textContent = result.received;
      feedback.textContent = '';
    } catch (_) {
      if (activeRequest !== controller) return;
      feedback.textContent = root.dataset.retryMessage;
    } finally {
      clearTimeout(timeout);
      if (activeRequest === controller) activeRequest = null;
    }
    if (!stopped) schedulePoll(5000);
  }
  // Keep checking ready orders too: a reversal must remove the download action.
  window.addEventListener('pagehide', () => {
    stopped = true;
    clearTimeout(scheduledPoll);
    clearInterval(countdown);
    activeRequest?.abort();
    activeRequest = null;
  });
  window.addEventListener('pageshow', event => { if (event.persisted) { stopped = false; poll(); } });
  schedulePoll(3000);
})();
