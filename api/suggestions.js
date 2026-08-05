import { ensureFeedbackTables, getPool } from '../lib/feedbackDb.js';

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
      const username = String(req.body?.username || '').trim();
      const message = String(req.body?.message || '').trim();

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
    res.status(500).json({ error: 'Failed to process suggestions request.' });
  }
}
