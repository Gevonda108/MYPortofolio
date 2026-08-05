import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ensureFeedbackTables, getPool } from './lib/feedbackDb.js';

const defaultDistPath = path.resolve('dist');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const body = [];
    req.on('data', (chunk) => body.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(body).toString();
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

export function createApp(options = {}) {
  const distPath = options.distPath || defaultDistPath;

  const writeError = (res, statusCode, message) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify({ error: message }));
  };

  const writeJson = (res, statusCode, payload) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(payload));
  };

  const writeStatic = (res, statusCode, content, extension) => {
    res.writeHead(statusCode, {
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=604800',
    });
    res.end(content);
  };

  const tryServeFile = async (res, relativePath) => {
    const safePath = relativePath.replace(/^\/+/, '');
    const targetPath = path.resolve(distPath, safePath);

    if (!targetPath.startsWith(distPath)) {
      return false;
    }

    try {
      const content = await fs.readFile(targetPath);
      const extension = path.extname(targetPath).toLowerCase();
      writeStatic(res, 200, content, extension);
      return true;
    } catch {
      return false;
    }
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    try {
      await ensureFeedbackTables();
    } catch {
      writeError(res, 500, 'Database is not configured. Set DATABASE_URL for Neon.');
      return;
    }

    const pool = getPool();

    if (req.method === 'OPTIONS') {
      writeJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/suggestions') {
      try {
        const { rows } = await pool.query(`
          SELECT id, username, message, created_at
          FROM suggestions
          ORDER BY created_at DESC, id DESC
          LIMIT 50
        `);
        writeJson(res, 200, rows);
      } catch {
        writeError(res, 500, 'Failed to read suggestions.');
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/suggestions') {
      try {
        const payload = await readJsonBody(req);
        const username = String(payload.username || '').trim();
        const message = String(payload.message || '').trim();

        if (!username || !message) {
          writeJson(res, 400, { error: 'Username and message are required.' });
          return;
        }

        const createdAt = new Date().toISOString();
        const { rows } = await pool.query(
          `
            INSERT INTO suggestions (username, message, created_at)
            VALUES ($1, $2, $3)
            RETURNING id, username, message, created_at
          `,
          [username, message, createdAt],
        );

        writeJson(res, 200, {
          ...rows[0],
        });
      } catch {
        writeJson(res, 400, { error: 'Invalid request payload.' });
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/reviews') {
      try {
        const { rows } = await pool.query(`
          SELECT id, name, review, stars, help, created_at
          FROM reviews
          ORDER BY created_at DESC, id DESC
          LIMIT 50
        `);
        writeJson(res, 200, rows);
      } catch {
        writeError(res, 500, 'Failed to read reviews.');
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/reviews') {
      try {
        const payload = await readJsonBody(req);
        const name = String(payload.name || '').trim();
        const review = String(payload.review || '').trim();
        const help = String(payload.help || '').trim();
        const stars = Number(payload.stars);

        if (!name || !review || !help || !Number.isFinite(stars) || stars < 1 || stars > 5) {
          writeJson(res, 400, { error: 'Name, review, help, and stars (1-5) are required.' });
          return;
        }

        const createdAt = new Date().toISOString();
        const { rows } = await pool.query(
          `
            INSERT INTO reviews (name, review, stars, help, created_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, review, stars, help, created_at
          `,
          [name, review, stars, help, createdAt],
        );

        writeJson(res, 200, {
          ...rows[0],
        });
      } catch {
        writeJson(res, 400, { error: 'Invalid request payload.' });
      }
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      const pathname = decodeURIComponent(url.pathname);
      const staticPath = pathname === '/' ? 'index.html' : pathname.slice(1);

      if (await tryServeFile(res, staticPath)) {
        return;
      }

      if (await tryServeFile(res, 'index.html')) {
        return;
      }
    }

    writeJson(res, 404, { error: 'Not found' });
  });

  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3001);
  createApp().listen(port, () => {
    console.log(`Portfolio server listening on port ${port}`);
  });
}
