/* BCH Flow Merchant Wallet V2: public address copy only; never accesses wallet secrets. */
(function () {
  'use strict';
  document.addEventListener('click', async function (event) {
    const button = event.target.closest('[data-copy-address]');
    if (!button) return;
    const address = button.getAttribute('data-copy-address');
    const panel = button.closest('.mw-v2');
    const status = panel && panel.querySelector('.mw-v2-feedback');
    if (!address) return;
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(address);
      if (status) status.textContent = 'Public address copied.';
    } catch (_) {
      if (status) status.textContent = 'Copy unavailable. Select the address and copy it manually.';
    }
  });
})();
