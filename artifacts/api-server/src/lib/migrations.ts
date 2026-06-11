import { pool } from "@workspace/db";
import { logger } from "./logger";

const MIGRATIONS: Array<{ name: string; sql: string }> = [
  {
    name: "001_tier_config_price_cols",
    sql: `
      ALTER TABLE tier_config
        ADD COLUMN IF NOT EXISTS price_fen integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS original_price_fen integer NOT NULL DEFAULT 0;
    `,
  },
  {
    name: "002_tier_config_default_prices",
    sql: `
      UPDATE tier_config
      SET price_fen = CASE tier WHEN 'plus' THEN 2800 WHEN 'pro' THEN 6800 END,
          original_price_fen = CASE tier WHEN 'plus' THEN 3500 WHEN 'pro' THEN 9800 END
      WHERE tier IN ('plus', 'pro')
        AND price_fen = 0
        AND original_price_fen = 0;
    `,
  },
];

export async function runMigrations(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  for (const m of MIGRATIONS) {
    const { rows } = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE name = $1",
      [m.name],
    );
    if (rows.length > 0) continue;

    logger.info({ migration: m.name }, "Applying migration");
    await pool.query(m.sql);
    await pool.query(
      "INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING",
      [m.name],
    );
    logger.info({ migration: m.name }, "Migration applied");
  }
}
