import sql from '../db.js';
import { getDbUserId } from './_helpers.js';
import { calcCashMetrics, calcBondMetrics, calcPortfolioMetrics } from '../utils/twx.js';

export default async function portfolioRoutes(fastify) {
  fastify.get('/portfolio/summary', async (req, reply) => {
    const uid = await getDbUserId(req, reply);
    if (uid === null) return;

    const [cashTxs, bondTxs, bpRows, rateRows] = await Promise.all([
      sql`SELECT * FROM transactions WHERE user_id=${uid} AND asset_type='cash_usd' ORDER BY date`,
      sql`SELECT * FROM transactions WHERE user_id=${uid} AND asset_type='bond' ORDER BY date`,
      sql`SELECT * FROM bond_params WHERE user_id=${uid}`,
      sql`SELECT rate FROM rate_cache WHERE currency='USD'`,
    ]);

    const bondParams  = bpRows[0] || null;
    const currentRate = rateRows[0] ? Number(rateRows[0].rate) : null;

    const cashMetrics = calcCashMetrics(cashTxs);
    const bondMetrics = bondParams ? calcBondMetrics(bondTxs, bondParams) : null;
    const portfolio   = calcPortfolioMetrics(cashMetrics, bondMetrics);

    let currentValueByn = null, pnlByn = null, pnlPct = null;
    if (currentRate && portfolio.totalUsd > 0) {
      currentValueByn = portfolio.totalUsd * currentRate;
      pnlByn          = currentValueByn - portfolio.totalByn;
      pnlPct          = portfolio.totalByn > 0 ? (pnlByn / portfolio.totalByn) * 100 : 0;
    }

    const stripRaw = (m) => m ? { ...m, raw: undefined } : null;
    return { portfolio, cash: stripRaw(cashMetrics), bonds: stripRaw(bondMetrics),
             bondParams, currentRate, currentValueByn, pnlByn, pnlPct };
  });
}
