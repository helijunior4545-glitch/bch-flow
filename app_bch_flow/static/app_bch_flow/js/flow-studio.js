/* Decorative motion only; no balances, payment status or tenant state are changed. */
(() => {
  const wallet = document.querySelector('[data-wallet-toggle]');
  if (wallet) wallet.addEventListener('click', () => {
    const open = wallet.classList.toggle('is-open');
    wallet.setAttribute('aria-expanded', String(open));
  });
  const motionToggle = document.querySelector('[data-motion-toggle]');
  if (motionToggle) motionToggle.addEventListener('click', () => {
    const paused = document.body.classList.toggle('studio-motion-paused');
    motionToggle.setAttribute('aria-pressed', String(paused));
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!reduced.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('studio-reveal');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold: 0.12});
    document.querySelectorAll('.studio-feature-grid article, .studio-section-intro, .flow-org-card, .flow-metric').forEach(el => observer.observe(el));
  }
})();
