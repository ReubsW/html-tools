import { generateToolDraft } from '../../../framework/ToolGeneration.js';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const API_KEY = process.env.OPENAI_API_KEY || '';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.statusCode = 405;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ error: 'method not allowed' }));
    return;
  }

  if (!API_KEY) {
    response.statusCode = 501;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
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
      apiKey: API_KEY,
      model: MODEL,
      prompt: payload.prompt || '',
      currentHtml: payload.currentHtml || '',
      currentTool: payload.currentTool || {},
    });

    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(result));
  } catch (error) {
    console.error('[tool-manager generate] failed:', error);
    response.statusCode = 500;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({
      error: error.message || 'generation failed',
    }));
  }
}
