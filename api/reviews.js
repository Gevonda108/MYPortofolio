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
          SELECT id, name, review, stars, help, created_at
          FROM reviews
          ORDER BY created_at DESC, id DESC
          LIMIT 50
        `,
      );

      res.status(200).json(rows);
      return;
    }

    if (req.method === 'POST') {
      const name = String(req.body?.name || '').trim();
      const review = String(req.body?.review || '').trim();
      const help = String(req.body?.help || '').trim();
      const stars = Number(req.body?.stars);

      if (!name || !review || !help || !Number.isFinite(stars) || stars < 1 || stars > 5) {
        res.status(400).json({ error: 'Name, review, help, and stars (1-5) are required.' });
        return;
      }

      const { rows } = await pool.query(
        `
          INSERT INTO reviews (name, review, stars, help)
          VALUES ($1, $2, $3, $4)
          RETURNING id, name, review, stars, help, created_at
        `,
        [name, review, stars, help],
      );

      res.status(200).json(rows[0]);
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch {
    res.status(500).json({ error: 'Failed to process reviews request.' });
  }
}
