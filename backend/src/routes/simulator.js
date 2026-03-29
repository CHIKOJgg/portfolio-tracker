import sql from '../db.js';
import { calcCashMetrics, calcBondMetrics, simulateTrade } from '../utils/twx.js';

async function getDbUserId(telegramId) {
  const [u] = await sql`SELECT id FROM users WHERE telegram_id = ${telegramId}`;
  if (!u) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  return u.id;
}

export default async function simulatorRoutes(fastify) {
  fastify.post('/simulator/calculate', {
    schema: {
      body: {
        type: 'object',
        required: ['type', 'quantity', 'price_byn'],
        properties: {
          type:      { type: 'string', enum: ['cash_usd', 'bond'] },
          quantity:  { type: 'number', minimum: 0.000001, maximum: 1e9 },
          price_byn: { type: 'number', minimum: 0.000001, maximum: 1e9 },
          rate_usd:  { type: ['number', 'null'], minimum: 0.001, maximum: 1000 },
        },
      },
    },
  }, async (req) => {
    const uid = await getDbUserId(req.telegramUser.id);

    const [cashTxs, bondTxs, bpRows] = await Promise.all([
      sql`SELECT * FROM transactions WHERE user_id=${uid} AND asset_type='cash_usd'`,
      sql`SELECT * FROM transactions WHERE user_id=${uid} AND asset_type='bond'`,
      sql`SELECT * FROM bond_params WHERE user_id=${uid}`,
    ]);

    const bondParams     = bpRows[0] || null;
    const existingCash   = calcCashMetrics(cashTxs);
    const existingBonds  = bondParams ? calcBondMetrics(bondTxs, bondParams) : null;

    const result = simulateTrade({
      existingCash, existingBonds, bondParams,
      trade: { type: req.body.type, quantity: req.body.quantity,
               priceByn: req.body.price_byn, rateUsd: req.body.rate_usd },
    });

    // Strip .raw from response
    if (result.cashMetrics) delete result.cashMetrics.raw;
    if (result.bondMetrics) delete result.bondMetrics.raw;

    return result;
  });
}
