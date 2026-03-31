import crypto from 'crypto';

const DEV_USER = { id: 99999999, first_name: 'Developer', username: 'devmode' };
const AUTH_MAX_AGE_SEC = 86400; // 24 hours

export function validateTelegramData(initData, botToken) {
  try {
    if (!initData || !botToken) return null;
    const params = new URLSearchParams(initData);
    const hash   = params.get('hash');
    if (!hash) return null;

    // Check auth_date freshness
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    if (!authDate || Date.now() / 1000 - authDate > AUTH_MAX_AGE_SEC) return null;

    params.delete('hash');
    const dataCheckStr = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const expected = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckStr)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) return null;

    const userStr = params.get('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch { return null; }
}

export async function authMiddleware(fastify) {
  fastify.decorateRequest('telegramUser', null);

  fastify.addHook('preHandler', async (req, reply) => {
    // Skip auth for public routes
    if (req.url === '/health' || req.url.startsWith('/auth')) return;

    const isDev = process.env.DEV_MODE === 'true';
    if (isDev) {
      req.telegramUser = DEV_USER;
      return;
    }

    // Get initData from header (sent by frontend api/client.js)
    const initData = req.headers['x-telegram-init-data'];

    if (!initData || initData.trim() === '') {
      fastify.log.warn({
        url: req.url,
        method: req.method,
        headers: Object.keys(req.headers),
      }, 'Request rejected: missing x-telegram-init-data header');

      return reply.status(401).send({
        error: 'Unauthorized',
        hint: 'Header x-telegram-init-data is missing or empty. Open the app in Telegram.',
      });
    }

    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      fastify.log.error('BOT_TOKEN environment variable is not set!');
      return reply.status(500).send({ error: 'Server misconfiguration: BOT_TOKEN not set' });
    }

    const user = validateTelegramData(initData, botToken);

    if (!user) {
      // Log reason for debugging without exposing sensitive data
      try {
        const params = new URLSearchParams(initData);
        const authDate = parseInt(params.get('auth_date') || '0', 10);
        const age = Math.floor(Date.now() / 1000 - authDate);
        fastify.log.warn({
          url: req.url,
          hasHash: !!params.get('hash'),
          authDateAge: age,
          expired: age > AUTH_MAX_AGE_SEC,
        }, 'Telegram initData validation failed');
      } catch {}

      return reply.status(401).send({
        error: 'Unauthorized',
        hint: 'Invalid or expired Telegram session. Try closing and reopening the app.',
      });
    }

    req.telegramUser = user;
  });
}