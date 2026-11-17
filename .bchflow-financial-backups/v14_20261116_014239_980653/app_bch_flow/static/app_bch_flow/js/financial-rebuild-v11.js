/* BCH Flow Financial V11. No wallet arithmetic, settlement decisions or fake market candles. */
(() => {
  'use strict';
  const SELECTOR = '#main[data-payment-app].bfr-dashboard';
  const SWITCH_SELECTOR = '[data-financial-navigation] a[href]';
  const ASSETS = new Set(['BTC', 'BCH']);
  const PERIODS = new Set([1, 7, 30, 90]);
  const marketFormat = new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:2});
  let current = null;
  let navigationController = null;
  let busyNavigation = false;
  let privateValuesHidden = false;
  let returnFocus = null;
  let toastTimer = 0;

  function uiMessage(root, message) {
    const toast = root?.querySelector('.pay-toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => {toast.hidden = true;}, 4200);
  }
  function formatUSD(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? marketFormat.format(n) : '—';
  }
  function icons() {try {window.lucide?.createIcons({attrs:{'stroke-width':1.7,'aria-hidden':'true'}});} catch (_) {}}

  function destroy() {
    if (!current) return;
    current.cancelled = true;
    for (const c of current.controllers) c.abort();
    for (const id of current.timers) clearInterval(id);
    current.observer?.disconnect();
    try {current.chart?.remove();} catch (_) {}
    document.body.style.removeProperty('overflow');
    current = null;
  }

  async function navigate(address, popstate = false) {
    navigationController?.abort();
    const here = document.querySelector(SELECTOR);
    const url = new URL(address, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) {
      location.assign(url.href); return;
    }
    navigationController = new AbortController();
    const signal = navigationController.signal;
    busyNavigation = true;
    here?.classList.add('bfr-navigating');
    here?.setAttribute('aria-busy','true');
    let bar = document.querySelector('.bfr-loading-bar');
    if (!bar) {bar = document.createElement('div');bar.className = 'bfr-loading-bar';document.body.append(bar);}
    try {
      const response = await fetch(url, {credentials:'same-origin',cache:'no-store',redirect:'follow',headers:{Accept:'text/html'},signal});
      if (signal.aborted) return;
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html') || new URL(response.url).pathname !== url.pathname) {
        throw new Error('Navigation response unavailable');
      }
      const html = await response.text();
      if (signal.aborted) return;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const next = doc.querySelector(SELECTOR);
      const previous = document.querySelector(SELECTOR);
      if (!next || !previous || next.querySelectorAll('#receive-dialog').length > 1) throw new Error('Unexpected page structure');
      // The complete rendered state (balances, permissions, modal CSRF tokens and forms)
      // comes from Django, never from client-side guesses or cached account data.
      const savedScrollY = window.scrollY;
      const oldSidebar = previous.querySelector('.premium-sidebar');
      const savedSidebarY = oldSidebar?.scrollTop ?? 0;
      const commit = () => {
        destroy();
        previous.replaceWith(document.importNode(next, true));
        document.title = doc.title || document.title;
        if (!popstate) history.pushState({bfr:true}, '', url.href);
        const updated = document.querySelector(SELECTOR);
        if (updated) {
          const sidebar = updated.querySelector('.premium-sidebar');
          if (sidebar) sidebar.scrollTop = savedSidebarY;
        }
        mount(updated);
        window.scrollTo({top:savedScrollY,behavior:'instant'});
      };
      commit();
      await rehydrateCatalog(doc);
      // Preserve viewport on currency/wallet changes; only scroll for an explicit new anchor.
      if (url.hash && url.hash !== location.hash) document.querySelector(url.hash)?.scrollIntoView({block:'start',behavior:'smooth'});
    } catch (error) {
      if (signal.aborted) return;
      here?.classList.remove('bfr-navigating');
      uiMessage(document.querySelector(SELECTOR), 'Wallet could not be updated. Previous financial information remains visible.');
      // Do not silently show the previous wallet under a new URL.
      if (popstate) location.assign(url.href);
    } finally {
      if (navigationController?.signal === signal) {
        busyNavigation = false;
        document.querySelector(SELECTOR)?.classList.remove('bfr-navigating');
        document.querySelector(SELECTOR)?.removeAttribute('aria-busy');
        bar?.remove();
      }
    }
  }

  async function rehydrateCatalog(doc) {
    // Catalog scripts initialize the server-rendered receive form. Re-run them only
    // after replacing that form. Do not reload the operational financial page.
    const scripts = [...doc.querySelectorAll('script[data-financial-rehydrate]')];
    for (const script of scripts) {
      if (!document.querySelector(SELECTOR)) return;
      const src = script.getAttribute('src');
      if (!src) continue;
      await new Promise((resolve) => {
        const el = document.createElement('script');
        el.src = src; el.async = false;
        el.onload = el.onerror = () => {el.remove();resolve();};
        document.head.append(el);
      });
    }
  }

  function setPrivacy(root) {
    root.querySelectorAll('[data-private-value]').forEach((el) => {
      if (!el.hasAttribute('data-original-financial-value')) el.setAttribute('data-original-financial-value', el.textContent);
      el.textContent = privateValuesHidden ? '••••••' : el.getAttribute('data-original-financial-value');
    });
    const toggle = root.querySelector('[data-balance-toggle]');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(privateValuesHidden));
      toggle.setAttribute('aria-label', privateValuesHidden ? 'Show balances' : 'Hide balances');
    }
  }

  function showDialog(root, id, button) {
    const dialog = root.querySelector('#' + CSS.escape(id));
    if (!(dialog instanceof HTMLDialogElement)) return;
    returnFocus = button;
    if (!dialog.open) dialog.showModal();
  }
  function bindActions(scope) {
    const {root} = scope;
    setPrivacy(root);
    root.addEventListener('click', (event) => {
      const link = event.target.closest('[data-financial-navigation] a[href]');
      if (link) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
        const url = new URL(link.href, location.href);
        if (url.pathname === location.pathname && url.origin === location.origin && url.href !== location.href) {
          event.preventDefault(); navigate(url.href);
        }
        return;
      }
      const opened = event.target.closest('[data-open-dialog]');
      if (opened) {showDialog(root, opened.dataset.openDialog, opened);return;}
      const closed = event.target.closest('[data-close-dialog]');
      if (closed) {closed.closest('dialog')?.close(); return;}
      if (event.target.closest('[data-balance-toggle]')) {privateValuesHidden = !privateValuesHidden;setPrivacy(root);return;}
      if (event.target.closest('[data-financial-search]')) {root.querySelector('#requests')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
      const range = event.target.closest('[data-financial-range]');
      if (range) {const days = Number(range.dataset.financialRange);if (PERIODS.has(days)) loadOHLC(scope,days);return;}
      const expand = event.target.closest('[data-financial-expand]');
      if (expand) {
        const finance=root.querySelector('.bfr-finance');const on=finance.classList.toggle('is-expanded');
        expand.setAttribute('aria-expanded',String(on));
        document.body.style.overflow=on?'hidden':'';
        requestAnimationFrame(() => scope.chart?.resize(scope.plot.clientWidth,scope.plot.clientHeight));
        return;
      }
      const copy = event.target.closest('[data-copy-value],[data-copy-link]');
      if (copy) {
        const input = copy.dataset.copyValue ? document.getElementById(copy.dataset.copyValue) : null;
        const value = input?.value || (copy.dataset.copyLink ? new URL(copy.dataset.copyLink,location.origin).href : '');
        if (!value) return;
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(value).then(() => uiMessage(root,'Copied successfully.'),() => uiMessage(root,'Select and copy manually.'));
        } else {input?.focus();input?.select();uiMessage(root,'Select and copy manually.');}
      }
    });
    const env = root.querySelector('[data-financial-environment]');
    env?.addEventListener('submit', (event) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      const url = new URL(location.href);
      const data = new FormData(env);
      url.search = new URLSearchParams(data).toString();
      navigate(url.href);
    });
    root.querySelectorAll('dialog').forEach(dialog => {
      dialog.addEventListener('close', () => {const focus=returnFocus;returnFocus=null;if(focus?.isConnected)focus.focus();});
      dialog.addEventListener('click', event => {
        if (event.target!==dialog) return;
        const rect=dialog.getBoundingClientRect();
        if (event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) dialog.close();
      });
    });
    const problem = root.querySelector('dialog[data-show-errors]');
    if (problem && !problem.open) problem.showModal();
    const transferForm = root.querySelector('form[data-review-transfer]');
    const review = root.querySelector('#transfer-review');
    if (transferForm && review) {
      let approved = false;
      let submitter = null;
      transferForm.addEventListener('submit', (event) => {
        if (approved) {approved=false;return;}
        event.preventDefault();event.stopImmediatePropagation();
        submitter = event.submitter;
        for (const [name, selector] of [['destination','[data-review-destination]'],['amount','[data-review-amount]'],['fee_limit','[data-review-fee]']]) {
          const from = transferForm.querySelector('[name="send-' + name + '"]');
          const to = review.querySelector(selector);
          if (to) to.textContent = from?.value || '—';
        }
        returnFocus = submitter;
        if (!review.open) review.showModal();
      }, true);
      review.querySelector('[data-confirm-reservation]')?.addEventListener('click', () => {
        approved=true;review.close();
        try {transferForm.requestSubmit(submitter || undefined);} catch (_) {approved=false;}
      });
    }
    root.querySelectorAll('form[data-submit-feedback]').forEach(form => {
      form.addEventListener('submit', () => {
        form.setAttribute('aria-busy','true');
        setTimeout(() => form.querySelectorAll('button[type="submit"]').forEach(button => {button.disabled=true;}),0);
      });
    });
  }

  async function loadRates(scope) {
    if (scope.cancelled) return;
    const {root} = scope;
    const status = root.querySelector('[data-financial-rate-status]');
    const url = root.dataset.bfcRatesUrl;
    if (!url) return;
    const controller = new AbortController();scope.controllers.add(controller);
    try {
      const response = await fetch(url,{credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('Rates unavailable');
      const payload = await response.json();
      if (!payload.available || !payload.rates || scope.cancelled) throw new Error('Provider unavailable');
      for (const asset of ['BTC','BCH']) {
        const rate = payload.rates?.[asset]?.prices?.USD;
        root.querySelectorAll('[data-financial-rate="'+asset+'"]').forEach(el => {el.textContent=formatUSD(rate);});
      }
      if (status) status.textContent='CoinGecko · indicative live prices, not account balances';
    } catch (error) {
      if (error.name!=='AbortError' && !scope.cancelled && status) status.textContent='Market quotations unavailable · balances unaffected';
    } finally {scope.controllers.delete(controller);}
  }

  function setMarket(scope, rows, days) {
    const {root} = scope;
    const latest=rows[rows.length-1], start=rows[0];
    const hi=Math.max(...rows.map(r=>r.high));
    const lo=Math.min(...rows.map(r=>r.low));
    const pct=((latest.close/start.open)-1)*100;
    const set=(selector,value)=>{const el=root.querySelector(selector);if(el)el.textContent=value;};
    set('[data-financial-market-price]',formatUSD(latest.close));
    set('[data-financial-high]',formatUSD(hi));
    set('[data-financial-low]',formatUSD(lo));
    set('[data-financial-change]',Number.isFinite(pct)?(pct>=0?'+':'')+pct.toFixed(2)+'%':'—');
    set('[data-financial-market-period]','Observed period · '+days+' days');
  }
  function chartStatus(scope,text) {
    const el=scope.root.querySelector('[data-financial-chart-status]');
    if(el) el.textContent=text;
  }
  async function loadOHLC(scope,days) {
    if (scope.cancelled || !ASSETS.has(scope.root.dataset.asset) || !PERIODS.has(days)) return;
    scope.days=days;
    scope.root.querySelectorAll('[data-financial-range]').forEach(el => el.setAttribute('aria-pressed',String(Number(el.dataset.financialRange)===days)));
    scope.marketController?.abort();
    const controller=new AbortController();scope.marketController=controller;scope.controllers.add(controller);
    chartStatus(scope,'Loading actual OHLC candles…');
    try {
      const url = new URL(scope.root.dataset.financialOhlcUrl, location.href);
      url.searchParams.set('asset',scope.root.dataset.asset);
      url.searchParams.set('days',String(days));
      const response = await fetch(url,{signal:controller.signal,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('Market endpoint '+response.status);
      const payload = await response.json();
      if (!payload.available || payload.source!=='CoinGecko' || !Array.isArray(payload.candles)) throw new Error('Unverified market response');
      const rows=payload.candles.filter(r=>Number.isSafeInteger(r.time)&&[r.open,r.high,r.low,r.close].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>0)&&r.low<=r.open&&r.open<=r.high&&r.low<=r.close&&r.close<=r.high).sort((a,b)=>a.time-b.time);
      if(rows.length<2||scope.cancelled||controller.signal.aborted) throw new Error('Not enough valid candles');
      const C = window.LightweightCharts;
      if(!C || !scope.plot) throw new Error('Chart library unavailable');
      if (!scope.chart) {
        scope.chart=C.createChart(scope.plot,{width:scope.plot.clientWidth||300,height:scope.plot.clientHeight||240,layout:{background:{type:'solid',color:'#111b2c'},textColor:'#91a5c4',fontFamily:'Inter,system-ui,sans-serif',fontSize:10},grid:{vertLines:{color:'#ffffff0c'},horzLines:{color:'#ffffff13'}},crosshair:{vertLine:{color:'#d4a54f66'},horzLine:{color:'#d4a54f66'}},rightPriceScale:{borderColor:'#ffffff22'},timeScale:{borderColor:'#ffffff22',timeVisible:days<=1,secondsVisible:false},handleScroll:false,handleScale:false});
        const opts={upColor:'#0cc06d',downColor:'#f25b59',wickUpColor:'#0cc06d',wickDownColor:'#f25b59',borderVisible:false,priceFormat:{type:'price',precision:2,minMove:.01}};
        scope.series=scope.chart.addSeries?scope.chart.addSeries(C.CandlestickSeries,opts):scope.chart.addCandlestickSeries(opts);
        if('ResizeObserver' in window){scope.observer=new ResizeObserver(()=>{if(!scope.cancelled&&scope.chart&&scope.plot.clientWidth&&scope.plot.clientHeight)scope.chart.resize(scope.plot.clientWidth,scope.plot.clientHeight);});scope.observer.observe(scope.plot);}
      }
      scope.series.setData(rows.map(({time,open,high,low,close})=>({time,open,high,low,close})));
      scope.chart.timeScale().fitContent();
      setMarket(scope,rows,days);
      chartStatus(scope,'CoinGecko OHLC · '+scope.root.dataset.asset+'/USD · '+days+'d · indicative');
    } catch(error) {
      if(error.name!=='AbortError'&&!scope.cancelled&&!controller.signal.aborted){
        chartStatus(scope,'Real market candles unavailable. No example data displayed.');
        scope.root.querySelectorAll('[data-financial-market-price],[data-financial-high],[data-financial-low],[data-financial-change]').forEach(el=>{el.textContent='—';});
        try {scope.series?.setData([]);} catch (_) {}
      }
    } finally {scope.controllers.delete(controller);}
  }

  function mount(root) {
    if (!root) return;
    const scope={root,plot:root.querySelector('[data-financial-chart]'),chart:null,series:null,observer:null,controllers:new Set(),timers:[],marketController:null,cancelled:false,days:7};
    current=scope;
    const activeMenu=root.querySelector('.premium-menu a[href]');
    root.querySelectorAll('.premium-menu a').forEach(el=>{try {if(new URL(el.href).pathname===location.pathname) el.classList.add('bfr-current');}catch(_){}});
    icons(); bindActions(scope);
    loadRates(scope);
    if(ASSETS.has(root.dataset.asset))loadOHLC(scope,7);
    else chartStatus(scope,'Pix / BRL · no cryptocurrency OHLC market');
    scope.timers.push(setInterval(()=>{if(!document.hidden&&!scope.cancelled)loadRates(scope);},90000));
    scope.timers.push(setInterval(()=>{if(!document.hidden&&!scope.cancelled&&ASSETS.has(root.dataset.asset))loadOHLC(scope,scope.days);},240000));
  }
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const link = target?.closest(SWITCH_SELECTOR);
    if (!link || !link.closest(SELECTOR) || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.href === location.href) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    navigate(url.href);
  }, true);
  window.addEventListener('popstate',()=>{if(document.querySelector(SELECTOR))navigate(location.href,true);});
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&document.querySelector(SELECTOR)){event.preventDefault();document.querySelector('#requests')?.scrollIntoView({behavior:'smooth'});}
    if(event.key==='Escape'){
      const finance=document.querySelector('.bfr-finance.is-expanded');
      if(finance){finance.classList.remove('is-expanded');document.body.style.removeProperty('overflow');const button=finance.querySelector('[data-financial-expand]');button?.setAttribute('aria-expanded','false');button?.focus();requestAnimationFrame(()=>current?.chart?.resize(current.plot.clientWidth,current.plot.clientHeight));}
    }
  });
  window.addEventListener('pagehide',destroy,{once:true});
  mount(document.querySelector(SELECTOR));
})();
