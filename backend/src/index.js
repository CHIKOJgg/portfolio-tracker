// .env is loaded by Node.js --env-file flag BEFORE this file runs.
// No manual parsing needed.

if (!process.env.DATABASE_URL) {
  console.error('\n❌  DATABASE_URL is not set in backend/.env\n');
  process.exit(1);
}

import Fastify   from 'fastify';
import cors      from '@fastify/cors';
import helmet    from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import { checkDb }          from './db.js';
import { runMigrations }    from './utils/migrate.js';
import { authMiddleware }   from './middleware/auth.js';
import authRoutes           from './routes/auth.js';
import transactionRoutes    from './routes/transactions.js';
import bondsRoutes          from './routes/bonds.js';
import portfolioRoutes      from './routes/portfolio.js';
import ratesRoutes          from './routes/rates.js';
import simulatorRoutes      from './routes/simulator.js';

const PORT  = parseInt(process.env.PORT || '3001', 10);
const isDev = process.env.DEV_MODE === 'true';

console.log(`[config] DEV_MODE=${isDev}  PORT=${PORT}`);
console.log(`[config] DB=${process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@').slice(0, 60)}...`);

try {
  await runMigrations();
} catch (err) {
  console.error('❌  Migration failed:', err.message);
  process.exit(1);
}

const fastify = Fastify({ logger: { level: isDev ? 'info' : 'warn' } });

await fastify.register(helmet, { contentSecurityPolicy: false });
await fastify.register(rateLimit, {
  max: 300, timeWindow: 60_000,
  errorResponseBuilder: () => ({ error: 'Too many requests' }),
});

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

await fastify.register(cors, {
  origin: isDev || allowedOrigins.length === 0
    ? true
    : (origin, cb) =>
        (!origin || allowedOrigins.includes(origin))
          ? cb(null, true)
          : cb(new Error('CORS: not allowed'), false),
  credentials: true,
});

await fastify.register(authMiddleware);

fastify.get('/health', async (_req, reply) => {
  try {
    await checkDb();
    return { ok: true, db: 'up', env: isDev ? 'dev' : 'prod' };
  } catch (e) {
    return reply.status(503).send({ ok: false, db: 'down', error: e.message });
  }
});

await fastify.register(authRoutes);
await fastify.register(transactionRoutes);
await fastify.register(bondsRoutes);
await fastify.register(portfolioRoutes);
await fastify.register(ratesRoutes);
await fastify.register(simulatorRoutes);

fastify.setErrorHandler((err, _req, reply) => {
  const code = err.statusCode || 500;
  if (code >= 500) fastify.log.error(err);
  reply.status(code).send({ error: err.message || 'Internal server error' });
});

await fastify.listen({ port: PORT, host: '0.0.0.0' });
console.log(`\n🚀  http://localhost:${PORT}  [${isDev ? 'DEV' : 'PROD'}]\n`);

const shutdown = async (sig) => {
  console.log(`\n${sig} — shutting down...`);
  await fastify.close();
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));