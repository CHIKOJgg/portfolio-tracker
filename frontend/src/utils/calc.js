// Formatting
export const fmt   = (v, d=2) => v == null || isNaN(+v) ? '—'
  : (+v).toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
export const r4    = (v) => fmt(v, 4);
export const pct   = (v) => v == null ? '—' : `${+v > 0 ? '+' : ''}${fmt(v, 2)}%`;
export const pnlCls= (v) => !v || +v === 0 ? '' : +v > 0 ? 'pos' : 'neg';
export const today = () => new Date().toISOString().split('T')[0];
export function fmtDate(str) {
  if (!str) return '';
  const s = str.split('T')[0];
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}`;
}

// TWX calculations (mirrors backend — runs client-side for instant UI)
export function calcCashMetrics(txs) {
  if (!txs?.length) return null;
  let totalByn = 0, totalUsd = 0;
  const rates = [];
  for (const t of txs) {
    const qty = +t.quantity, price = +t.price_byn;
    totalByn += qty * price; totalUsd += qty; rates.push(price);
  }
  return { totalUsd, totalByn, count: txs.length,
    avgTwx: totalUsd > 0 ? totalByn / totalUsd : 0,
    minTwx: Math.min(...rates), maxTwx: Math.max(...rates) };
}

export function calcBondMetrics(txs, bp) {
  if (!txs?.length || !bp) return null;
  const enriched = txs.map(t => {
    const qty = +t.quantity, price = +t.price_byn;
    const rate = t.rate_usd ? +t.rate_usd : null;
    const usdPer   = rate ? price / rate : +bp.usd_equiv_nominal;
    const costByn  = qty * price;
    const totalUsd = qty * usdPer;
    return { ...t, usdPer, costByn, totalUsd, twx: totalUsd > 0 ? costByn / totalUsd : 0 };
  });
  const totalByn = enriched.reduce((s, t) => s + t.costByn, 0);
  const totalUsd = enriched.reduce((s, t) => s + t.totalUsd, 0);
  const totalQty = enriched.reduce((s, t) => s + +t.quantity, 0);
  return {
    totalQty, totalByn, totalUsd, count: txs.length,
    avgTwx: totalUsd > 0 ? totalByn / totalUsd : 0,
    minTwx: Math.min(...enriched.map(t => t.twx)),
    maxTwx: Math.max(...enriched.map(t => t.twx)),
    nkdTotal: totalQty * +bp.nkd_current,
  };
}

export function calcPortfolio(cm, bm) {
  const cB = cm?.totalByn||0, cU = cm?.totalUsd||0;
  const bB = bm?.totalByn||0, bU = bm?.totalUsd||0;
  const totalByn = cB+bB, totalUsd = cU+bU;
  return { totalByn, totalUsd, avgTwx: totalUsd > 0 ? totalByn/totalUsd : 0,
           cashByn:cB, cashUsd:cU, bondsByn:bB, bondsUsd:bU };
}

// localStorage cache — prevents white screen on slow connection
const CACHE_KEY = 'usd_portfolio_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

export function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
}
