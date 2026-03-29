import sql from '../db.js';

export async function runMigrations() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id          BIGSERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE NOT NULL,
      username    TEXT,
      first_name  TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id          BIGSERIAL PRIMARY KEY,
      user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      asset_type  TEXT NOT NULL CHECK (asset_type IN ('cash_usd', 'bond')),
      date        DATE NOT NULL,
      quantity    NUMERIC(18,6) NOT NULL CHECK (quantity > 0),
      price_byn   NUMERIC(18,6) NOT NULL CHECK (price_byn > 0),
      rate_usd    NUMERIC(18,6),
      notes       TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_tx_user_type ON transactions(user_id, asset_type)`;

  await sql`
    CREATE TABLE IF NOT EXISTS bond_params (
      user_id           BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      nominal_byn       NUMERIC(18,4) DEFAULT 500,
      usd_equiv_nominal NUMERIC(18,6) DEFAULT 175.3894,
      coupon_rate       NUMERIC(8,4)  DEFAULT 7.0,
      base_rate_usd     NUMERIC(18,6) DEFAULT 2.8508,
      base_rate_date    DATE          DEFAULT '2026-01-29',
      nkd_current       NUMERIC(18,6) DEFAULT 1.8164,
      next_coupon       NUMERIC(18,6) DEFAULT 2.3209,
      next_coupon_date  DATE          DEFAULT '2026-04-08',
      maturity_date     DATE          DEFAULT '2029-11-06',
      maturity_years    NUMERIC(6,2)  DEFAULT 3.62,
      updated_at        TIMESTAMPTZ   DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS rate_cache (
      currency   TEXT PRIMARY KEY,
      rate       NUMERIC(18,6) NOT NULL,
      fetched_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  console.log('[db] migrations ok');
}
