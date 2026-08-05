import { ensureFeedbackTables, getPool } from '../lib/feedbackDb.js';

function hasDbEnv() {
  return Boolean(
    process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL_NON_POOLING,
  );
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await ensureFeedbackTables();
    const pool = getPool();
    await pool.query('SELECT 1 AS ok');
    res.status(200).json({ ok: true, databaseEnvPresent: hasDbEnv() });
  } catch (error) {
    res.status(500).json({
      ok: false,
      databaseEnvPresent: hasDbEnv(),
      detail: String(error?.message || 'Unknown database error'),
    });
  }
}
