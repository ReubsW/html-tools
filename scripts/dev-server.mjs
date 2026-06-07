import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { readFile } from 'node:fs/promises';
import { generateToolDraft } from '../framework/ToolGeneration.js';

const root = resolve(process.cwd());
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const aiModel = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const aiKey = process.env.OPENAI_API_KEY || '';

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
};

function resolveRequestPath(url) {
  const { pathname } = new URL(url, `http://${host}:${port}`);
  const requestedPath = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const filePath = normalize(join(root, requestedPath));

  if (filePath !== root && !filePath.startsWith(root + sep)) {
    return null;
  }

  return filePath;
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${host}:${port}`);

  if (requestUrl.pathname === '/api/tool-manager/generate') {
    if (request.method !== 'POST') {
      response.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'method not allowed' }));
      return;
    }

    if (!aiKey) {
      response.writeHead(501, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'OpenAI API key is not configured' }));
      return;
    }

    try {
      let body = '';

      for await (const chunk of request) {
        body += chunk;
      }

      const payload = body ? JSON.parse(body) : {};
      const result = await generateToolDraft({
        apiKey: aiKey,
        model: aiModel,
        prompt: payload.prompt || '',
        currentHtml: payload.currentHtml || '',
        currentTool: payload.currentTool || {},
      });

      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(result));
    } catch (error) {
      console.error('[dev-server] tool manager generation failed:', error);
      response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: error.message || 'generation failed' }));
    }

    return;
  }

  const filePath = resolveRequestPath(request.url || '/');

  if (!filePath) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': types[extname(filePath)] || 'application/octet-stream',
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, host, () => {
  console.log(`html-tools dev server: http://${host}:${port}`);
});
