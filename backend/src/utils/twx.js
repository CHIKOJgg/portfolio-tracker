/**
 * TWX calculation engine — pure functions, no DB.
 * FIX: calcCashMetrics now returns .raw (original txs) for simulator use.
 */

export function calcCashMetrics(transactions) {
  if (!transactions?.length) return null;
  let totalByn = 0, totalUsd = 0;
  const rates = [];
  for (const t of transactions) {
    const qty = Number(t.quantity), price = Number(t.price_byn);
    totalByn += qty * price;
    totalUsd += qty;
    rates.push(price);
  }
  return {
    totalUsd, totalByn,
    avgTwx: totalUsd > 0 ? totalByn / totalUsd : 0,
    minTwx: Math.min(...rates),
    maxTwx: Math.max(...rates),
    count:  transactions.length,
    raw:    transactions, // kept for simulator
  };
}

export function calcBondMetrics(transactions, bondParams) {
  if (!transactions?.length || !bondParams) return null;

  const enriched = transactions.map(t => {
    const qty   = Number(t.quantity);
    const price = Number(t.price_byn);
    const rate  = t.rate_usd ? Number(t.rate_usd) : null;
    const usdPer = rate ? price / rate : Number(bondParams.usd_equiv_nominal);
    const costByn  = qty * price;
    const totalUsd = qty * usdPer;
    return { ...t, usdPer, costByn, totalUsd, twx: totalUsd > 0 ? costByn / totalUsd : 0 };
  });

  const totalByn = enriched.reduce((s, t) => s + t.costByn, 0);
  const totalUsd = enriched.reduce((s, t) => s + t.totalUsd, 0);
  const totalQty = enriched.reduce((s, t) => s + Number(t.quantity), 0);

  return {
    totalQty, totalByn, totalUsd,
    avgTwx:   totalUsd > 0 ? totalByn / totalUsd : 0,
    minTwx:   Math.min(...enriched.map(t => t.twx)),
    maxTwx:   Math.max(...enriched.map(t => t.twx)),
    nkdTotal: totalQty * Number(bondParams.nkd_current || 0),
    count:    transactions.length,
    raw:      transactions, // kept for simulator
  };
}

export function calcPortfolioMetrics(cashM, bondM) {
  const cashByn  = cashM?.totalByn  || 0;
  const cashUsd  = cashM?.totalUsd  || 0;
  const bondsByn = bondM?.totalByn  || 0;
  const bondsUsd = bondM?.totalUsd  || 0;
  const totalByn = cashByn + bondsByn;
  const totalUsd = cashUsd + bondsUsd;
  return {
    totalByn, totalUsd,
    avgTwx:   totalUsd > 0 ? totalByn / totalUsd : 0,
    cashByn, cashUsd, bondsByn, bondsUsd,
  };
}

/**
 * Simulate adding a trade and return how TWX changes.
 * FIX: use .raw (original rows) instead of non-existent .enriched on cash
 */
export function simulateTrade({ existingCash, existingBonds, bondParams, trade }) {
  const mock = { quantity: trade.quantity, price_byn: trade.priceByn, rate_usd: trade.rateUsd || null };

  const newCashMetrics = trade.type === 'cash_usd'
    ? calcCashMetrics([...(existingCash?.raw || []), mock])
    : existingCash;

  const newBondMetrics = trade.type === 'bond'
    ? calcBondMetrics([...(existingBonds?.raw || []), mock], bondParams)
    : existingBonds;

  const oldPortfolio = calcPortfolioMetrics(existingCash, existingBonds);
  const newPortfolio = calcPortfolioMetrics(newCashMetrics, newBondMetrics);

  return {
    old:         oldPortfolio,
    new:         newPortfolio,
    twxDelta:    (newPortfolio.avgTwx || 0) - (oldPortfolio.avgTwx || 0),
    cashMetrics: newCashMetrics,
    bondMetrics: newBondMetrics,
  };
}
