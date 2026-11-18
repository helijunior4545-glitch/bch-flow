/* Organization overview only: local search and native mobile navigation. */
(() => {
  'use strict';
  const root = document.querySelector('[data-overview]');
  if (!root) return;
  const dialog = root.querySelector('#overview-navigation');
  const toggle = root.querySelector('[data-navigation-open]');
  const close = root.querySelector('[data-navigation-close]');
  const desktop = matchMedia('(min-width:1080px)');
  let savedY = 0;
  function release() {
    document.documentElement.classList.remove('overview-navigation-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  function hide() {
    if (!dialog.open) return;
    dialog.close();
    release();
    window.scrollTo({top:savedY, behavior:'instant'});
  }
  toggle.hidden = false;
  root.dataset.ready = '';
  toggle.addEventListener('click', () => {
    if (desktop.matches || dialog.open) return;
    savedY = scrollY;
    dialog.showModal();
    document.documentElement.classList.add('overview-navigation-open');
    toggle.setAttribute('aria-expanded', 'true');
    close.focus({preventScroll:true});
  });
  close.addEventListener('click', hide);
  dialog.addEventListener('cancel', event => {event.preventDefault(); hide();});
  dialog.addEventListener('close', release);
  dialog.addEventListener('click', event => {
    if (!dialog.open) return;
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) hide();
    else if (event.target.closest('a')) hide();
  });
  desktop.addEventListener('change', hide);
  addEventListener('pagehide', () => {hide(); release();});
  const input = root.querySelector('#organization-search');
  if (!input) return;
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
  const cards = [...root.querySelectorAll('[data-organization]')].map(element => ({element, text:normalize(element.querySelector('.overview-card-identity').textContent)}));
  const empty = root.querySelector('[data-no-results]');
  const status = root.querySelector('[data-search-status]');
  root.querySelector('[data-search-control]').hidden = false;
  function filter() {
    const query = normalize(input.value);
    let count = 0;
    for (const card of cards) {
      card.element.hidden = !card.text.includes(query);
      if (!card.element.hidden) count++;
    }
    empty.hidden = count !== 0;
    status.textContent = `${status.dataset.resultsLabel} ${count}`;
  }
  input.addEventListener('input', filter);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') {input.value = ''; filter();}
  });
  // Synchronize browser-restored form values without persisting any organization data.
  addEventListener('pageshow', filter);
})();
