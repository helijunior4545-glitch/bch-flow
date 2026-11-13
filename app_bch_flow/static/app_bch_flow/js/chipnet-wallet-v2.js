/* BCH Flow Chipnet V2: read-only, browser fetch, no signing or broadcasting. */
(() => {
  'use strict';
  const root = document.querySelector('[data-chipnet-v2]');
  if (!root) return;
  const status = root.querySelector('[data-chipnet-status]');
  const balance = root.querySelector('[data-chipnet-balance]');
  const address = root.querySelector('[data-chipnet-address]');
  const list = root.querySelector('[data-chipnet-utxos]');
  const refresh = root.querySelector('[data-chipnet-refresh]');
  const endpoint = root.getAttribute('data-endpoint');
  const fmt = n => (n / 100000000).toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
  const set = (node, value) => { node.textContent = String(value); };
  async function load() {
    refresh.disabled = true;
    set(status, 'Consultando a Chipnet...');
    set(balance, '— BCH');
    set(address, '—');
    list.replaceChildren();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 16000);
      let response;
      try { response = await fetch(endpoint, {credentials:'same-origin', cache:'no-store', headers:{'Accept':'application/json'}, signal:controller.signal}); }
      finally { clearTimeout(timeout); }
      if (!response.ok) throw Error('provider_unavailable');
      if (!(response.headers.get('content-type') || '').includes('application/json')) throw Error('unexpected_response');
      const data = await response.json();
      if (data.network !== 'chipnet' || data.spending_enabled !== false || data.settlement_verified !== false ||
          !Number.isSafeInteger(data.observed_satoshis) || data.observed_satoshis < 0 ||
          !Array.isArray(data.utxos) || data.utxos.length > 1000 ||
          typeof data.address !== 'string' || !data.address.startsWith('bchtest:')) throw Error('invalid_data');
      let sum = 0;
      for (const u of data.utxos) {
        if (!/^[a-f0-9]{64}$/.test(u.txid) || !Number.isInteger(u.vout) || u.vout < 0 ||
            !Number.isSafeInteger(u.satoshis) || u.satoshis <= 0 ||
            !Number.isInteger(u.confirmations) || u.confirmations < 0) throw Error('invalid_utxo');
        sum += u.satoshis;
      }
      if (sum !== data.observed_satoshis) throw Error('inconsistent_balance');
      set(balance, fmt(sum) + ' BCH');
      set(address, data.address);
      set(status, 'Observado via 1 provedor · não verificado para liquidação');
      if (!data.utxos.length) {
        const li = document.createElement('li'); set(li, 'Nenhum UTXO não gasto observado'); list.append(li);
      }
      for (const u of data.utxos.slice(0, 20)) {
        const li = document.createElement('li');
        set(li, `${u.txid.slice(0, 16)}…:${u.vout} · ${u.satoshis.toLocaleString('pt-BR')} sat · ${u.confirmations} confirmações`);
        list.append(li);
      }
      if (data.utxos.length > 20) {
        const li = document.createElement('li'); set(li, `Mais ${data.utxos.length - 20} UTXOs não exibidos`); list.append(li);
      }
    } catch (_) {
      set(status, 'Consulta indisponível · nenhuma informação de saldo confirmada');
      set(balance, '— BCH');
      set(address, '—');
      list.replaceChildren();
    } finally { refresh.disabled = false; }
  }
  refresh.addEventListener('click', load);
  load();
})();

/* BCH FLOW CHIPNET V3 — mirrors validated V2 observation, never verified settlement. */
(() => {
  'use strict';
  const card = document.querySelector('[data-chipnet-v3-card]');
  const panel = document.querySelector('[data-chipnet-v2]');
  if (!card || !panel) return;
  const amount = card.querySelector('[data-chipnet-v3-balance]');
  const status = card.querySelector('[data-chipnet-v3-status]');
  const label = card.querySelector('[data-chipnet-v3-label]');
  const endpoint = panel.getAttribute('data-endpoint');
  if (!endpoint || !endpoint.startsWith('/')) return;
  let generation = 0;
  const reset = () => {
    amount.textContent = '— BCH';
    status.textContent = 'Consulta indisponível · saldo não verificado';
    label.textContent = 'CHIPNET · SALDO OBSERVADO (NÃO VERIFICADO)';
  };
  const format = sats => (sats / 1e8).toFixed(8).replace(/0+$/, '').replace(/\.$/, '') + ' BCH';
  async function update() {
    const current = ++generation;
    reset();
    status.textContent = 'Consultando Chipnet · somente leitura';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 16000);
    try {
      const response = await fetch(endpoint, {
        method: 'GET', credentials: 'same-origin', cache: 'no-store',
        headers: {Accept: 'application/json'}, signal: controller.signal
      });
      if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json')) throw Error('network');
      const data = await response.json();
      if (data.network !== 'chipnet' || data.spending_enabled !== false || data.settlement_verified !== false ||
          typeof data.address !== 'string' || !data.address.startsWith('bchtest:') ||
          !Number.isSafeInteger(data.observed_satoshis) || data.observed_satoshis < 0 ||
          !Array.isArray(data.utxos) || data.utxos.length > 1000) throw Error('invalid');
      let sum = 0;
      const seen = new Set();
      for (const utxo of data.utxos) {
        if (typeof utxo.txid !== 'string' || !/^[a-f0-9]{64}$/.test(utxo.txid) ||
            !Number.isInteger(utxo.vout) || utxo.vout < 0 ||
            !Number.isSafeInteger(utxo.satoshis) || utxo.satoshis <= 0 ||
            !Number.isInteger(utxo.confirmations) || utxo.confirmations < 0) throw Error('invalid');
        const key = utxo.txid + ':' + utxo.vout;
        if (seen.has(key)) throw Error('duplicate');
        seen.add(key);
        sum += utxo.satoshis;
        if (!Number.isSafeInteger(sum)) throw Error('overflow');
      }
      if (sum !== data.observed_satoshis) throw Error('inconsistent');
      if (current !== generation) return;
      amount.textContent = format(sum);
      status.textContent = 'Chipnet · 1 provedor · não verificado para liquidação';
    } catch (_) {
      if (current === generation) reset();
    } finally { clearTimeout(timeout); }
  }
  const refresh = panel.querySelector('[data-chipnet-refresh]');
  if (refresh) refresh.addEventListener('click', update);
  update();
})();
