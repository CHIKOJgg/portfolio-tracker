import sql from '../db.js';
import { getDbUserId } from './_helpers.js';

const TX_SCHEMA = {
  type: 'object',
  required: ['asset_type', 'date', 'quantity', 'price_byn'],
  properties: {
    asset_type: { type: 'string', enum: ['cash_usd', 'bond'] },
    date:       { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    quantity:   { type: 'number', minimum: 0.000001, maximum: 1e9 },
    price_byn:  { type: 'number', minimum: 0.000001, maximum: 1e9 },
    rate_usd:   { type: ['number', 'null'], minimum: 0.001, maximum: 1000 },
    notes:      { type: 'string', maxLength: 300 },
  },
};

const UPDATE_SCHEMA = {
  type: 'object',
  properties: {
    date:      { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    quantity:  { type: 'number', minimum: 0.000001, maximum: 1e9 },
    price_byn: { type: 'number', minimum: 0.000001, maximum: 1e9 },
    rate_usd:  { type: ['number', 'null'], minimum: 0.001, maximum: 1000 },
    notes:     { type: 'string', maxLength: 300 },
  },
};

export default async function transactionRoutes(fastify) {
  fastify.get('/transactions', async (req, reply) => {
    const uid = await getDbUserId(req, reply);
    if (uid === null) return;

    const { asset_type } = req.query;
    return asset_type
      ? sql`SELECT * FROM transactions WHERE user_id=${uid} AND asset_type=${asset_type} ORDER BY date DESC, created_at DESC`
      : sql`SELECT * FROM transactions WHERE user_id=${uid} ORDER BY date DESC, created_at DESC`;
  });

  fastify.post('/transactions', { schema: { body: TX_SCHEMA } }, async (req, reply) => {
    const uid = await getDbUserId(req, reply);
    if (uid === null) return;

    const { asset_type, date, quantity, price_byn, rate_usd = null, notes = null } = req.body;
    const [tx] = await sql`
      INSERT INTO transactions (user_id, asset_type, date, quantity, price_byn, rate_usd, notes)
      VALUES (${uid}, ${asset_type}, ${date}, ${quantity}, ${price_byn}, ${rate_usd}, ${notes})
      RETURNING *
    `;
    return reply.status(201).send(tx);
  });

  fastify.put('/transactions/:id', { schema: { body: UPDATE_SCHEMA } }, async (req, reply) => {
    const uid = await getDbUserId(req, reply);
    if (uid === null) return;

    const id = parseInt(req.params.id, 10);
    const [existing] = await sql`SELECT * FROM transactions WHERE id=${id} AND user_id=${uid}`;
    if (!existing) return reply.status(404).send({ error: 'Not found' });

    const b = req.body;
    const [tx] = await sql`
      UPDATE transactions SET
        date       = ${b.date      ?? existing.date},
        quantity   = ${b.quantity  ?? existing.quantity},
        price_byn  = ${b.price_byn ?? existing.price_byn},
        rate_usd   = ${'rate_usd' in b ? (b.rate_usd ?? null) : existing.rate_usd},
        notes      = ${b.notes     ?? existing.notes},
        updated_at = NOW()
      WHERE id=${id} AND user_id=${uid}
      RETURNING *
    `;
    return tx;
  });

  fastify.delete('/transactions/:id', async (req, reply) => {
    const uid = await getDbUserId(req, reply);
    if (uid === null) return;

    const id = parseInt(req.params.id, 10);
    const [d] = await sql`DELETE FROM transactions WHERE id=${id} AND user_id=${uid} RETURNING id`;
    if (!d) return reply.status(404).send({ error: 'Not found' });
    return { ok: true };
  });
}
