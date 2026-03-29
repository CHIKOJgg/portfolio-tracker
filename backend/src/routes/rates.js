import sql from '../db.js';

const NBRB_URL  = 'https://api.nbrb.by/exrates/rates/USD?parammode=2';
const CACHE_TTL = 60 * 60 * 1000;

async function fetchNBRB() {
  const res = await fetch(NBRB_URL, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`NBRB HTTP ${res.status}`);
  const d = await res.json();
  return { rate: Number(d.Cur_OfficialRate), date: d.Date };
}

async function saveRate(rate) {
  await sql`
    INSERT INTO rate_cache (currency, rate, fetched_at)
    VALUES ('USD', ${rate}, NOW())
    ON CONFLICT (currency) DO UPDATE SET rate=${rate}, fetched_at=NOW()
  `;
}

export default async function ratesRoutes(fastify) {
  fastify.get('/rates/current', async (_req, reply) => {
    const [cached] = await sql`SELECT rate, fetched_at FROM rate_cache WHERE currency='USD'`;
    const isFresh  = cached && (Date.now() - new Date(cached.fetched_at).getTime()) < CACHE_TTL;
    if (isFresh) return { rate: Number(cached.rate), source: 'cache' };

    try {
      const { rate, date } = await fetchNBRB();
      await saveRate(rate);
      return { rate, source: 'nbrb', date };
    } catch (err) {
      if (cached) return { rate: Number(cached.rate), source: 'stale' };
      return reply.status(503).send({ error: 'Rate unavailable', detail: err.message });
    }
  });

  fastify.post('/rates/manual', {
    schema: {
      body: {
        type: 'object', required: ['rate'],
        properties: { rate: { type: 'number', minimum: 0.5, maximum: 50 } },
      },
    },
  }, async (req) => {
    const { rate } = req.body;
    await saveRate(rate);
    return { rate, source: 'manual' };
  });
}
