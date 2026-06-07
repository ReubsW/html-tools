import { Supabase } from './Supabase.js';
import { Files } from './Files.js';

const TOOL_TABLE = 'tool_library';
const VERSION_TABLE = 'tool_library_versions';
const ENTRY_FILE = 'index.html';

function requireClient() {
  const db = Supabase.client();

  if (!db) {
    throw new Error('[ToolLibrary] Supabase is not configured');
  }

  return db;
}

function normalizeMeta(toolMeta) {
  return {
    id: String(toolMeta.id || '').trim(),
    name: String(toolMeta.name || '').trim(),
    description: String(toolMeta.description || '').trim(),
    category: String(toolMeta.category || 'tools').trim() || 'tools',
    icon: String(toolMeta.icon || '*').trim() || '*',
    commit_message: String(toolMeta.commit_message || '').trim(),
    is_active: toolMeta.is_active !== false,
    kind: String(toolMeta.kind || 'html').trim() || 'html',
  };
}

async function getToolRow(userId, toolId) {
  const db = requireClient();
  const { data, error } = await db
    .from(TOOL_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('id', toolId)
    .maybeSingle();

  if (error) throw new Error(`[ToolLibrary] tool lookup failed: ${error.message}`);
  return data ?? null;
}

async function writeVersionRow(userId, toolId, version, html, commitMessage, entryFile) {
  const db = requireClient();

  const { error } = await db
    .from(VERSION_TABLE)
    .insert({
      user_id: userId,
      tool_id: toolId,
      version,
      html,
      entry_path: entryFile,
      commit_message: commitMessage || 'update tool',
    });

  if (error) {
    throw new Error(`[ToolLibrary] version insert failed: ${error.message}`);
  }
}

export const ToolLibrary = {
  entryFile: ENTRY_FILE,

  async listActiveTools(userId) {
    const db = requireClient();
    const { data, error } = await db
      .from(TOOL_TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`[ToolLibrary] load failed: ${error.message}`);
    return data ?? [];
  },

  async getTool(userId, toolId) {
    return getToolRow(userId, toolId);
  },

  async listVersions(userId, toolId) {
    const db = requireClient();
    const { data, error } = await db
      .from(VERSION_TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('tool_id', toolId)
      .order('version', { ascending: false });

    if (error) throw new Error(`[ToolLibrary] version load failed: ${error.message}`);
    return data ?? [];
  },

  async loadToolHtml(userId, toolId, entryFile = ENTRY_FILE) {
    const file = await Files.scope(toolId).download(entryFile);
    return file.text();
  },

  async saveTool(userId, toolMeta, html) {
    const meta = normalizeMeta(toolMeta);
    if (!meta.id) throw new Error('[ToolLibrary] tool id is required');
    if (!meta.name) throw new Error('[ToolLibrary] tool name is required');

    const db = requireClient();
    const existing = await getToolRow(userId, meta.id);
    const currentVersion = existing?.version ?? 0;
    const newVersion = currentVersion + 1;

    await Files.scope(meta.id).upload(ENTRY_FILE, html, {
      contentType: 'text/html; charset=utf-8',
      upsert: true,
    });

    const { error: toolError } = await db
      .from(TOOL_TABLE)
      .upsert(
        {
          id: meta.id,
          user_id: userId,
          name: meta.name,
          description: meta.description,
          category: meta.category,
          icon: meta.icon,
          kind: meta.kind,
          version: newVersion,
          is_active: meta.is_active,
          config: {
            entry_file: ENTRY_FILE,
          },
        },
        { onConflict: 'user_id,id' }
      );

    if (toolError) {
      throw new Error(`[ToolLibrary] tool save failed: ${toolError.message}`);
    }

    await writeVersionRow(userId, meta.id, newVersion, html, meta.commit_message, ENTRY_FILE);

    return {
      toolId: meta.id,
      version: newVersion,
      entryFile: ENTRY_FILE,
    };
  },

  async restoreVersion(userId, toolId, versionRow) {
    const tool = await getToolRow(userId, toolId);
    if (!tool) {
      throw new Error(`[ToolLibrary] cannot restore missing tool: ${toolId}`);
    }

    return ToolLibrary.saveTool(userId, {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      icon: tool.icon,
      kind: tool.kind,
      is_active: tool.is_active,
      commit_message: `restore v${versionRow.version}`,
    }, versionRow.html);
  },

  async createRuntimeTool(userId, toolRow) {
    const html = await this.loadToolHtml(userId, toolRow.id, toolRow.config?.entry_file || ENTRY_FILE);

    return {
      id: toolRow.id,
      name: toolRow.name,
      description: toolRow.description,
      category: toolRow.category || 'tools',
      icon: toolRow.icon || '*',
      async render(container) {
        container.innerHTML = '';

        const frame = document.createElement('iframe');
        frame.className = 'html-tool-frame';
        frame.title = toolRow.name || toolRow.id;
        frame.sandbox = 'allow-forms allow-modals allow-popups allow-scripts';
        frame.referrerPolicy = 'no-referrer';
        frame.srcdoc = html;

        container.appendChild(frame);
      }
    };
  },
};
