import sql from '../db.js';

export async function getDbUserId(req, reply) {
  // Guard: telegramUser should always be set by authMiddleware
  if (!req.telegramUser) {
    reply.status(401).send({ error: 'Unauthorized' });
    return null;
  }

  const [u] = await sql`SELECT id FROM users WHERE telegram_id = ${req.telegramUser.id}`;
  if (!u) {
    // User authenticated via Telegram but not yet in DB — trigger /auth/validate first
    reply.status(404).send({
      error: 'User not found. Please open the app fresh to re-authenticate.',
    });
    return null;
  }
  return u.id;
}
