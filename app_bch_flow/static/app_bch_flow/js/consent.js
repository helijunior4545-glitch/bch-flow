/* No host-app dependencies, tracking requests or third-party resources. */
(() => {
  'use strict';
  const root = document.querySelector('[data-bch-consent]');
  if (!root) return;
  const VERSION = 1;
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  const key = `bchflow:privacy:${root.dataset.scope}`;
  const banner = root.querySelector('[data-bch-consent-banner]');
  const dialog = root.querySelector('dialog');
  const form = root.querySelector('form');
  const checkbox = form.elements.external_media;
  const status = root.querySelector('[data-bch-consent-status]');
  let choice = null;
  let opener = null;
  function read() {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      const now = Date.now();
      if (data?.version === VERSION && data.essential === true && typeof data.external_media === 'boolean' && Number.isFinite(data.saved_at) && data.saved_at <= now && now - data.saved_at < MAX_AGE) return data;
    } catch (_) { /* Storage can be disabled by the visitor. Default to essential only. */ }
    return null;
  }
  function allows(category) {
    return category === 'essential' || (category === 'external_media' && choice?.external_media === true && Date.now() - choice.saved_at < MAX_AGE);
  }
  const integrations = new Set();
  function update() {
    for (const integration of integrations) {
      const enabled = allows(integration.category);
      if (enabled !== integration.enabled) {
        integration.enabled = enabled;
        try { (enabled ? integration.start : integration.stop)(); } catch (error) { console.error('BCH Flow privacy integration failed', error); }
      }
    }
    banner.hidden = choice !== null;
    checkbox.checked = allows('external_media');
    root.dispatchEvent(new CustomEvent('bchflow:consentchange', {bubbles:true, detail:{essential:true, external_media:allows('external_media')}}));
  }
  function close() {
    if (dialog.open) dialog.close();
    const target = opener?.getClientRects().length ? opener : root.querySelector('.bch-consent-links button');
    target?.focus({preventScroll:true});
  }
  function save(externalMedia) {
    choice = {version:VERSION, essential:true, external_media:externalMedia, saved_at:Date.now()};
    let persisted = true;
    try { localStorage.setItem(key, JSON.stringify(choice)); } catch (_) { persisted = false; }
    update(); close();
    status.textContent = persisted ? root.dataset.savedLabel : root.dataset.storageError;
  }
  root.querySelectorAll('[data-bch-consent-open]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => {
      opener = button;
      checkbox.checked = allows('external_media');
      dialog.showModal();
    });
  });
  root.querySelectorAll('[data-bch-consent-reject]').forEach(button => button.addEventListener('click', () => save(false)));
  root.querySelector('[data-bch-consent-accept]').addEventListener('click', () => save(true));
  root.querySelector('[data-bch-consent-close]').addEventListener('click', close);
  form.addEventListener('submit', event => {event.preventDefault(); save(checkbox.checked);});
  addEventListener('storage', event => {if (event.key === key || event.key === null) {choice = read(); update();}});
  addEventListener('pageshow', () => {choice = read(); update();});
  document.addEventListener('visibilitychange', () => {if (!document.hidden) {choice = read(); update();}});
  // Optional integrations MUST use this API, supply teardown, and never load resources before start.
  window.BCHFlowPrivacy = Object.freeze({
    allows,
    register(category, start, stop) {
      if (category !== 'external_media' || typeof start !== 'function' || typeof stop !== 'function') throw new TypeError('External media requires start and stop callbacks');
      const integration = {category, start, stop, enabled:false};
      integrations.add(integration); update();
      return () => {if (integration.enabled) integration.stop(); integrations.delete(integration);};
    }
  });
  choice = read(); update();
})();
