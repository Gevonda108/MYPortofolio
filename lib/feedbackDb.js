import { Pool } from 'pg';

let pool;

let initPromise;

function resolveConnectionString() {
  const direct = (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ''
  );

  if (direct) return direct;

  const host = process.env.PGHOST;
  const port = process.env.PGPORT || '5432';
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;

  if (!host || !user || !password || !database) {
    return '';
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}?sslmode=require`;
}

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
    })().catch((error) => {
      // Allow retry on next request instead of permanently caching a failed init.
      initPromise = undefined;
      throw error;
    });
  }

  return initPromise;
}

export async function ensureFeedbackTables() {
  await getInitPromise();
}

export function getPool() {
  if (!pool) {
    const connectionString = resolveConnectionString();
    if (!connectionString) {
      throw new Error('Missing Neon Postgres environment variable (DATABASE_URL or POSTGRES_URL).');
    }

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }

  return pool;
}
