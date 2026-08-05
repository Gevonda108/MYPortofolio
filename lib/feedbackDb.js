import { Pool } from 'pg';

let pool;

let initPromise;

function getInitPromise() {
  if (!initPromise) {
    initPromise = (async () => {
      const db = getPool();

      await db.query(`
        CREATE TABLE IF NOT EXISTS suggestions (
          id BIGSERIAL PRIMARY KEY,
          username TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS reviews (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          review TEXT NOT NULL,
          stars INTEGER NOT NULL,
          help TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT reviews_stars_check CHECK (stars >= 1 AND stars <= 5)
        );
      `);
    })();
  }

  return initPromise;
}

export async function ensureFeedbackTables() {
  await getInitPromise();
}

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('Missing DATABASE_URL (or POSTGRES_URL) environment variable.');
    }

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }

  return pool;
}
