import { ensureFeedbackTables, getPool } from '../lib/feedbackDb.js';

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ ok: true });
    return;
  }

  try {
    await ensureFeedbackTables();
    const pool = getPool();

    if (req.method === 'GET') {
      const { rows } = await pool.query(
        `
          SELECT id, username, message, created_at
          FROM suggestions
          ORDER BY created_at DESC, id DESC
          LIMIT 50
        `,
      );

      res.status(200).json(rows);
      return;
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const username = String(body.username || '').trim();
      const message = String(body.message || '').trim();

      if (!username || !message) {
        res.status(400).json({ error: 'Username and message are required.' });
        return;
      }

      const { rows } = await pool.query(
        `
          INSERT INTO suggestions (username, message)
          VALUES ($1, $2)
          RETURNING id, username, message, created_at
        `,
        [username, message],
      );

      res.status(200).json(rows[0]);
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const detail = String(error?.message || 'Unknown error');
    if (detail.includes('Missing Neon Postgres')) {
      res.status(500).json({ error: 'Database is not configured in Vercel env vars.', detail });
      return;
    }
    res.status(500).json({ error: 'Failed to process suggestions request.', detail });
  }
}
