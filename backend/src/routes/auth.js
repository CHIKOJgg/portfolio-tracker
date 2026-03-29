import crypto from 'crypto';
import { authMiddleware } from './routes/auth.js';
const DEV_USER = { id: 99999999, first_name: 'Developer', username: 'devmode' };
const AUTH_MAX_AGE_SEC = 86400;

export function validateTelegramData(initData, botToken) {
  try {
    if (!initData || !botToken) return null;
    const params = new URLSearchParams(initData);
    const hash   = params.get('hash');
    if (!hash) return null;

    const authDate = parseInt(params.get('auth_date') || '0', 10);
    if (!authDate || Date.now() / 1000 - authDate > AUTH_MAX_AGE_SEC) return null;

    params.delete('hash');
    const dataCheckStr = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expected  = crypto.createHmac('sha256', secretKey).update(dataCheckStr).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) return null;

    const userStr = params.get('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch { return null; }
}

export async function authMiddleware(fastify) {
  fastify.decorateRequest('telegramUser', null);

  fastify.addHook('preHandler', async (req, reply) => {
    // Public routes — no auth needed
    if (req.url === '/health' || req.url.startsWith('/auth')) return;

    const isDev = process.env.DEV_MODE === 'true';
    if (isDev) {
      req.telegramUser = DEV_USER;
      return;
    }

    const initData = req.headers['x-telegram-init-data'];
    if (!initData) {
      return reply.status(401).send({ error: 'Unauthorized: missing Telegram auth header' });
    }

    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      // No bot token configured — reject with clear error
      return reply.status(500).send({ error: 'Server misconfiguration: BOT_TOKEN not set' });
    }

    const user = validateTelegramData(initData, botToken);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized: invalid or expired Telegram auth' });
    }

    req.telegramUser = user;
  });
}
