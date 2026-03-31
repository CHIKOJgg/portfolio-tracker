// In production (Render/Railway), env vars come from the platform UI.
// In dev, we load .env manually using Node 20+ built-in.
// --env-file=.env is only used in the "dev" script, not "start".

if (!process.env.DATABASE_URL) {
  // Try loading .env for local dev fallback
  try {
    const { readFileSync } = await import('fs');
    const { join, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const lines = readFileSync(join(__dirname, '../.env'), 'utf8').split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i < 1) continue;
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (k && process.env[k] === undefined) process.env[k] = v;
    }
    console.log('[env] loaded .env file');
  } catch {
    // No .env file — running in production with platform env vars
  }
}

if (!process.env.DATABASE_URL) {
  console.error('\n❌  DATABASE_URL is not set!\n');
  console.error('    In production: set it in Render Environment Variables');
  console.error('    In dev: add it to backend/.env\n');
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

const maskedDb = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@').slice(0, 70);
console.log(`[config] DEV_MODE=${isDev}  PORT=${PORT}`);
console.log(`[config] DB=${maskedDb}...`);

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
    : (origin, cb) => {
        if (!origin) return cb(null, true);

        const normalized = origin.replace(/\/$/, '');

        const isAllowed = allowedOrigins.some(o => {
          const allowed = o.replace(/\/$/, '');

          return (
            normalized === allowed ||
            normalized.endsWith('.pages.dev') ||
            normalized.includes('telegram')
          );
        });

        if (isAllowed) {
          cb(null, true);
        } else {
          console.log('❌ CORS blocked:', origin);
          cb(new Error('CORS: not allowed'), false);
        }
      },
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