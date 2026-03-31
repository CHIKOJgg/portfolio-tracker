const BASE = import.meta.env.VITE_API_URL || '/api';
let _initData = '';
console.log('BASE:', BASE);
export const setInitData = (d) => {
  _initData = d || '';
  // Debug log in dev
  if (import.meta.env.DEV) {
    console.log('[api] initData set, length:', _initData.length);
  }
};

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };

  // Always send initData header if we have it
  if (_initData) {
    headers['x-telegram-init-data'] = _initData;
  }

  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    const msg = e.error || `HTTP ${res.status}`;
    const hint = e.hint ? ` (${e.hint})` : '';
    throw new Error(msg + hint);
  }
  return res.json();
}

export const api = {
  auth:         { validate: (d)    => req('POST', '/auth/validate', { initData: d || '' }) },
  portfolio:    { summary:  ()     => req('GET',  '/portfolio/summary') },
  transactions: {
    list:   (t)    => req('GET',    `/transactions${t ? `?asset_type=${t}` : ''}`),
    create: (d)    => req('POST',   '/transactions', d),
    update: (id,d) => req('PUT',    `/transactions/${id}`, d),
    remove: (id)   => req('DELETE', `/transactions/${id}`),
  },
  bonds:  {
    getParams:    ()  => req('GET', '/bond-params'),
    updateParams: (d) => req('PUT', '/bond-params', d),
  },
  rates:  {
    current:   ()  => req('GET',  '/rates/current'),
    setManual: (r) => req('POST', '/rates/manual', { rate: r }),
  },
  sim: { calc: (d) => req('POST', '/simulator/calculate', d) },
};