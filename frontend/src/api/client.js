const BASE = import.meta.env.VITE_API_URL || '/api';
let _initData = '';
export const setInitData = (d) => { _initData = d || ''; };

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (_initData) headers['x-telegram-init-data'] = _initData;
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth:         { validate: (d)    => req('POST', '/auth/validate', { initData: d||'' }) },
  portfolio:    { summary:  ()     => req('GET',  '/portfolio/summary') },
  transactions: {
    list:   (t)    => req('GET',    `/transactions${t ? `?asset_type=${t}` : ''}`),
    create: (d)    => req('POST',   '/transactions', d),
    update: (id,d) => req('PUT',    `/transactions/${id}`, d),
    remove: (id)   => req('DELETE', `/transactions/${id}`),
  },
  bonds: {
    getParams:    ()  => req('GET', '/bond-params'),
    updateParams: (d) => req('PUT', '/bond-params', d),
  },
  rates: {
    current:   ()  => req('GET',  '/rates/current'),
    setManual: (r) => req('POST', '/rates/manual', { rate: r }),
  },
  sim: { calc: (d) => req('POST', '/simulator/calculate', d) },
};
