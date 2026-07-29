import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const defaultStoragePath = path.resolve('feedback-data.json');

function readStorage(storagePath) {
  return fs.readFile(storagePath, 'utf8').catch(() => '[]').then((content) => {
    try {
      return JSON.parse(content);
    } catch {
      return [];
    }
  });
}

function writeStorage(storagePath, data) {
  return fs.writeFile(storagePath, JSON.stringify(data, null, 2), 'utf8');
}

export function createApp(options = {}) {
  const storagePath = options.storagePath || defaultStoragePath;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/api/suggestions') {
      const data = await readStorage(storagePath);
      const suggestions = [...(data.suggestions || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(suggestions));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/suggestions') {
      const body = [];
      req.on('data', (chunk) => body.push(chunk));
      req.on('end', async () => {
        const payload = JSON.parse(Buffer.concat(body).toString() || '{}');
        const data = await readStorage(storagePath);
        const entry = {
          id: Date.now(),
          username: payload.username || 'Anonymous',
          message: payload.message || '',
          created_at: new Date().toISOString(),
        };
        const suggestions = [...(data.suggestions || []), entry];
        await writeStorage(storagePath, { ...data, suggestions: suggestions.slice(-50) });
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(entry));
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/reviews') {
      const data = await readStorage(storagePath);
      const reviews = [...(data.reviews || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(reviews));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/reviews') {
      const body = [];
      req.on('data', (chunk) => body.push(chunk));
      req.on('end', async () => {
        const payload = JSON.parse(Buffer.concat(body).toString() || '{}');
        const data = await readStorage(storagePath);
        const entry = {
          id: Date.now(),
          name: payload.name || 'Anonymous',
          review: payload.review || '',
          stars: Number(payload.stars || 0),
          help: payload.help || '',
          created_at: new Date().toISOString(),
        };
        const reviews = [...(data.reviews || []), entry];
        await writeStorage(storagePath, { ...data, reviews: reviews.slice(-50) });
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(entry));
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3001);
  createApp().listen(port, () => {
    console.log(`Feedback API listening on port ${port}`);
  });
}
