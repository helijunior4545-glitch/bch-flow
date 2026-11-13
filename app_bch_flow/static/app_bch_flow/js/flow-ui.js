/* Component behavior only. Payment state always comes from the server. */
(() => {
  'use strict';
  window.lucide?.createIcons({attrs:{'stroke-width':1.7,'aria-hidden':'true'}});
  document.querySelectorAll('.premium-menu a').forEach(link=>{
    const url=new URL(link.href);
    if(url.pathname===location.pathname && !url.hash) {link.setAttribute('aria-current','page');}
  });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (!reduce.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
    }), {threshold:.08});
    // Already-visible content must not fade out after its first paint.
    document.querySelectorAll('[data-reveal]').forEach(el=>{
      const rect=el.getBoundingClientRect();
      if(rect.top >= innerHeight || rect.bottom <= 0) observer.observe(el);
    });
  }
  document.querySelectorAll('[data-sidebar-toggle]').forEach(button=>button.addEventListener('click',()=>{
    const shell=button.closest('[data-dashboard-shell]');
    if (!shell) return;
    const open=shell.classList.toggle('navigation-open');
    shell.querySelectorAll('[data-sidebar-toggle]').forEach(toggle=>toggle.setAttribute('aria-expanded',String(open)));
  }));
  document.querySelectorAll('[data-password-toggle]').forEach(button=>button.addEventListener('click',()=>{
    const input=document.getElementById(button.dataset.passwordToggle);
    if(input){const visible=input.type==='password';input.type=visible?'text':'password';button.setAttribute('aria-pressed',String(visible));button.setAttribute('aria-label',visible?button.dataset.hideLabel:button.dataset.showLabel);}
  }));
  document.querySelectorAll('form[action$="/logout/"]').forEach(form=>form.addEventListener('submit',()=>{try{Object.keys(sessionStorage).filter(key=>key.startsWith('bchflow.wizard.')).forEach(key=>sessionStorage.removeItem(key));}catch{}}));
  document.querySelectorAll('[data-print]').forEach(button=>button.addEventListener('click',()=>window.print()));
  document.querySelectorAll('form').forEach(form=>{
    if(form.hasAttribute('data-submit-feedback') || form.closest('[data-payment-app]')) return;
    form.addEventListener('submit',()=>{form.setAttribute('aria-busy','true');});
  });
  document.querySelectorAll('[data-open-details]').forEach(button=>button.addEventListener('click',()=>{
    const details=document.getElementById(button.dataset.openDetails);
    if(details){details.open=true;details.scrollIntoView({behavior:reduce.matches?'auto':'smooth',block:'center'});details.querySelector('input:not([type=hidden])')?.focus({preventScroll:true});}
  }));
  const network=document.getElementById('environment');
  const walletInput=document.querySelector('[data-live-wallet]');
  if(network&&walletInput) network.addEventListener('change',()=>{walletInput.disabled=network.value!=='live';});
  const nodeForm=document.querySelector('[data-node-form]');
  const provider=nodeForm?.querySelector('[name="node-provider"]');
  function syncProvider(){
    const hosted=provider.value==='nownodes';
    ['node-api_key','node-public_key'].forEach(name=>{
      const input=nodeForm.querySelector(`[name="${name}"]`);
      input.required=hosted; input.closest('p').hidden=!hosted;input.disabled=!hosted;
    });
    const note=nodeForm.querySelector('[data-core-note]');if(note)note.hidden=hosted;
  }
  if(provider){provider.addEventListener('change',syncProvider);syncProvider();}
  addEventListener('pageshow',()=>document.querySelectorAll('form[aria-busy]').forEach(form=>{form.removeAttribute('aria-busy');form.querySelectorAll('button:disabled').forEach(b=>{if(b.dataset.wasEnabled)b.disabled=false;});}));
})();
