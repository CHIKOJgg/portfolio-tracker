import sql from '../db.js';
import { validateTelegramData } from '../middleware/auth.js';

const DEV_USER = { id: 99999999, first_name: 'Developer', username: 'devmode' };

async function upsertUser(tgUser) {
  const [user] = await sql`
    INSERT INTO users (telegram_id, username, first_name)
    VALUES (${tgUser.id}, ${tgUser.username || null}, ${tgUser.first_name || null})
    ON CONFLICT (telegram_id) DO UPDATE SET
      username   = EXCLUDED.username,
      first_name = EXCLUDED.first_name
    RETURNING id
  `;
  await sql`
    INSERT INTO bond_params (user_id) VALUES (${user.id})
    ON CONFLICT (user_id) DO NOTHING
  `;
  return user;
}

export default async function authRoutes(fastify) {
  // Main auth endpoint
  fastify.post('/auth/validate', async (req, reply) => {
    const { initData = '' } = req.body || {};
    const isDev    = process.env.DEV_MODE === 'true';
    const botToken = process.env.BOT_TOKEN;

    // Log what we received (safe — no sensitive data in logs)
    fastify.log.info({
      isDev,
      hasBotToken: !!botToken,
      hasInitData: !!initData,
      initDataLength: initData?.length || 0,
    }, 'auth/validate called');

    let tgUser;
    if (isDev || !botToken) {
      tgUser = DEV_USER;
    } else {
      if (!initData) {
        return reply.status(401).send({
          error: 'No initData provided',
          hint: 'Open the app inside Telegram, not in browser',
        });
      }

      tgUser = validateTelegramData(initData, botToken);

      if (!tgUser) {
        // Try to understand WHY validation failed
        let reason = 'unknown';
        try {
          const params = new URLSearchParams(initData);
          const hash = params.get('hash');
          const authDate = parseInt(params.get('auth_date') || '0', 10);
          const age = Math.floor(Date.now() / 1000 - authDate);

          if (!hash) reason = 'no_hash';
          else if (!authDate) reason = 'no_auth_date';
          else if (age > 86400) reason = `auth_date_expired_${age}s_ago`;
          else reason = 'invalid_signature_check_bot_token';
        } catch (e) {
          reason = `parse_error: ${e.message}`;
        }

        fastify.log.warn({ reason }, 'Telegram auth validation failed');

        return reply.status(401).send({
          error: 'Invalid Telegram auth',
          reason,
        });
      }
    }

    await upsertUser(tgUser);
    return { ok: true, user: { id: tgUser.id, first_name: tgUser.first_name } };
  });
}