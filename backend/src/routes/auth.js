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
  fastify.post('/auth/validate', async (req, reply) => {
    const { initData = '' } = req.body || {};
    const isDev    = process.env.DEV_MODE === 'true';
    const botToken = process.env.BOT_TOKEN;

    let tgUser;
    if (isDev || !botToken) {
      tgUser = DEV_USER;
    } else {
      tgUser = validateTelegramData(initData, botToken);
      if (!tgUser) return reply.status(401).send({ error: 'Invalid Telegram auth' });
    }

    await upsertUser(tgUser);
    return { ok: true, user: { id: tgUser.id, first_name: tgUser.first_name } };
  });
}
