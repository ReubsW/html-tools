const TOOL_GENERATION_SCHEMA = {
  type: 'json_schema',
  name: 'tool_generation',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['tool', 'html'],
    properties: {
      tool: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'id', 'category', 'description', 'icon', 'commit_message'],
        properties: {
          name: { type: 'string' },
          id: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
          icon: { type: 'string' },
          commit_message: { type: 'string' },
        },
      },
      html: { type: 'string' },
      notes: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  },
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripCodeFences(text = '') {
  return String(text)
    .trim()
    .replace(/^```(?:json|html)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function slugify(value, fallback = 'new-tool') {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;
}

function ensureHtmlDocument(html, title = 'Preview') {
  const source = String(html || '').trim();

  if (!source) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body></body>
</html>`;
  }

  if (/<!doctype/i.test(source) || /<html[\s>]/i.test(source)) {
    return source;
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body>
${source}
</body>
</html>`;
}

function normalizeGeneratedTool(payload = {}) {
  const tool = payload.tool || {};
  const name = String(tool.name || 'Untitled Tool').trim() || 'Untitled Tool';
  const id = slugify(tool.id || tool.name || name);
  const category = String(tool.category || 'tools').trim() || 'tools';
  const description = String(tool.description || '').trim();
  const icon = String(tool.icon || '*').trim() || '*';
  const commitMessage = String(tool.commit_message || 'generated tool').trim() || 'generated tool';
  const html = ensureHtmlDocument(payload.html || tool.html || '', name);
  const notes = Array.isArray(payload.notes)
    ? payload.notes.map(note => String(note).trim()).filter(Boolean)
    : [];

  return {
    tool: {
      name,
      id,
      category,
      description,
      icon,
      commit_message: commitMessage,
    },
    html,
    notes,
  };
}

function buildGenerationPrompt({ prompt, currentHtml = '', currentTool = {} }) {
  const toolSummary = {
    name: String(currentTool.name || '').trim(),
    id: String(currentTool.id || '').trim(),
    category: String(currentTool.category || '').trim(),
    commit_message: String(currentTool.commit_message || '').trim(),
  };

  return [
    'You are generating a single, self-contained HTML tool for the html-tools app.',
    'Return only structured JSON that matches the schema.',
    'The HTML must be complete, compatible with a sandboxed iframe, and must not rely on external files.',
    'Prefer semantic HTML, inline CSS, and vanilla JS.',
    'Keep the tool focused on the user request and make it easy to edit later.',
    '',
    `User prompt: ${prompt}`,
    '',
    `Current tool metadata: ${JSON.stringify(toolSummary)}`,
    '',
    `Current HTML draft: ${currentHtml ? currentHtml : '[none]'}`,
  ].join('\n');
}

function extractResponseText(responseJson) {
  if (typeof responseJson?.output_text === 'string' && responseJson.output_text.trim()) {
    return responseJson.output_text;
  }

  for (const item of responseJson?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string' && content.text.trim()) {
        return content.text;
      }
      if (typeof content?.output_text === 'string' && content.output_text.trim()) {
        return content.output_text;
      }
      if (typeof content?.value === 'string' && content.value.trim()) {
        return content.value;
      }
    }
  }

  return '';
}

async function generateToolDraft({
  apiKey,
  model = 'gpt-4.1-mini',
  prompt,
  currentHtml = '',
  currentTool = {},
}) {
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured');
  }

  const body = {
    model,
    input: buildGenerationPrompt({ prompt, currentHtml, currentTool }),
    text: {
      format: TOOL_GENERATION_SCHEMA,
    },
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const responseJson = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = responseJson?.error?.message || responseJson?.message || `OpenAI request failed (${response.status})`;
    throw new Error(message);
  }

  const text = extractResponseText(responseJson);
  if (!text) {
    throw new Error('OpenAI returned an empty response');
  }

  const parsed = JSON.parse(stripCodeFences(text));
  return normalizeGeneratedTool(parsed);
}

export {
  TOOL_GENERATION_SCHEMA,
  buildGenerationPrompt,
  ensureHtmlDocument,
  extractResponseText,
  generateToolDraft,
  normalizeGeneratedTool,
  slugify,
  stripCodeFences,
};
