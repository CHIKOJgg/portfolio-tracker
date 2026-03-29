import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Set it in .env');
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {},
});

// Verify connectivity (called from index.js)
export async function checkDb() {
  await sql`SELECT 1`;
}

export default sql;
