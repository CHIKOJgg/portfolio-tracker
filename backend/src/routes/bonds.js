import sql from '../db.js';

async function getDbUserId(telegramId) {
  const [u] = await sql`SELECT id FROM users WHERE telegram_id = ${telegramId}`;
  if (!u) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  return u.id;
}

async function ensureParams(uid) {
  await sql`INSERT INTO bond_params (user_id) VALUES (${uid}) ON CONFLICT DO NOTHING`;
  const [p] = await sql`SELECT * FROM bond_params WHERE user_id=${uid}`;
  return p;
}

export default async function bondsRoutes(fastify) {
  fastify.get('/bond-params', async (req) => {
    const uid = await getDbUserId(req.telegramUser.id);
    return ensureParams(uid);
  });

  fastify.put('/bond-params', {
    schema: {
      body: {
        type: 'object',
        properties: {
          nominal_byn:       { type: 'number', minimum: 0.01 },
          usd_equiv_nominal: { type: 'number', minimum: 0.0001 },
          coupon_rate:       { type: 'number', minimum: 0, maximum: 100 },
          base_rate_usd:     { type: 'number', minimum: 0.0001 },
          base_rate_date:    { type: 'string' },
          nkd_current:       { type: 'number', minimum: 0 },
          next_coupon:       { type: 'number', minimum: 0 },
          next_coupon_date:  { type: 'string' },
          maturity_date:     { type: 'string' },
          maturity_years:    { type: 'number', minimum: 0 },
        },
      },
    },
  }, async (req) => {
    const uid = await getDbUserId(req.telegramUser.id);
    const cur = await ensureParams(uid);
    const b   = req.body;

    // FIX: merge with current values — only update what was sent
    const [updated] = await sql`
      UPDATE bond_params SET
        nominal_byn       = ${b.nominal_byn       ?? cur.nominal_byn},
        usd_equiv_nominal = ${b.usd_equiv_nominal  ?? cur.usd_equiv_nominal},
        coupon_rate       = ${b.coupon_rate        ?? cur.coupon_rate},
        base_rate_usd     = ${b.base_rate_usd      ?? cur.base_rate_usd},
        base_rate_date    = ${b.base_rate_date      ?? cur.base_rate_date},
        nkd_current       = ${b.nkd_current        ?? cur.nkd_current},
        next_coupon       = ${b.next_coupon         ?? cur.next_coupon},
        next_coupon_date  = ${b.next_coupon_date    ?? cur.next_coupon_date},
        maturity_date     = ${b.maturity_date       ?? cur.maturity_date},
        maturity_years    = ${b.maturity_years      ?? cur.maturity_years},
        updated_at        = NOW()
      WHERE user_id = ${uid}
      RETURNING *
    `;
    return updated;
  });
}
