import { ToolLibrary } from '../../framework/ToolLibrary.js';

const STARTER_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>New Tool</title>
  <style>
    :root { color-scheme: light; }
    body {
      font-family: system-ui, sans-serif;
      padding: 24px;
      margin: 0;
      color: #111;
      background: #f5f4ef;
    }
    .shell {
      max-width: 720px;
      margin: 0 auto;
      padding: 24px;
      border: 1px solid #d7d2c7;
      border-radius: 12px;
      background: #fff;
    }
    h1 { margin: 0 0 12px; font-size: 28px; }
    p { margin: 0 0 16px; line-height: 1.5; }
    button {
      border: 0;
      border-radius: 8px;
      padding: 10px 14px;
      background: #111;
      color: #fff;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="shell">
    <h1>New tool</h1>
    <p>Paste or upload HTML here, preview it on the right, then save it to the library.</p>
    <button type="button">Example action</button>
  </div>
</body>
</html>`;

function blankHtml(message) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: system-ui, sans-serif;
      color: #666;
      background: #f3f0e8;
    }
  </style>
</head>
<body>${message}</body>
</html>`;
}

export default {
  id: 'tool-manager',
  name: 'Tool Manager',
  description: 'Create, preview, version, and restore HTML tools',
  category: 'tools',
  icon: '*',

  async render(container, context) {
    const userId = context.user?.id;

    container.innerHTML = `
      <div class="tool-manager">
        <aside class="tool-manager-panel tool-manager-sidebar">
          <div class="tool-manager-panel-head">
            <div>
              <div class="tool-manager-label">Library</div>
              <div class="tool-manager-title">Saved tools</div>
            </div>
            <button id="tool-manager-new" class="btn btn-secondary" type="button">New</button>
          </div>
          <div id="tool-manager-list" class="tool-manager-list"></div>
        </aside>

        <section class="tool-manager-panel tool-manager-main">
          <div class="tool-manager-panel-head tool-manager-panel-head--stack">
            <div class="tool-manager-fields">
              <div class="field">
                <label for="tool-manager-name">Name</label>
                <input id="tool-manager-name" type="text" placeholder="Tool name" />
              </div>
              <div class="field">
                <label for="tool-manager-id">Id</label>
                <input id="tool-manager-id" type="text" placeholder="tool-id" />
              </div>
              <div class="field">
                <label for="tool-manager-category">Category</label>
                <input id="tool-manager-category" type="text" placeholder="tools" />
              </div>
              <div class="field">
                <label for="tool-manager-commit">Commit message</label>
                <input id="tool-manager-commit" type="text" placeholder="update tool" />
              </div>
            </div>
            <div class="tool-manager-actions">
              <input id="tool-manager-file" type="file" accept=".html,.htm,text/html" hidden />
              <button id="tool-manager-import" class="btn btn-secondary" type="button">Import HTML</button>
              <button id="tool-manager-save" class="btn btn-primary" type="button">Save Tool</button>
            </div>
          </div>

          <div class="tool-manager-workspace">
            <div class="tool-manager-editor-pane">
              <div class="tool-manager-pane-head">
                <span class="tool-manager-label">Source</span>
                <span id="tool-manager-status" class="tool-manager-status">ready</span>
              </div>
              <textarea id="tool-manager-editor" spellcheck="false"></textarea>
            </div>

            <div class="tool-manager-preview-pane">
              <div class="tool-manager-pane-head">
                <span class="tool-manager-label">Preview</span>
                <span class="tool-manager-status">sandboxed iframe</span>
              </div>
              <iframe id="tool-manager-preview" class="html-tool-frame" title="Tool preview" sandbox="allow-forms allow-modals allow-popups allow-scripts" referrerpolicy="no-referrer"></iframe>
            </div>
          </div>
        </section>

        <aside class="tool-manager-panel tool-manager-sidebar">
          <div class="tool-manager-panel-head">
            <div>
              <div class="tool-manager-label">Versions</div>
              <div class="tool-manager-title">History</div>
            </div>
          </div>
          <div id="tool-manager-versions" class="tool-manager-history"></div>
        </aside>
      </div>
    `;

    const listEl = container.querySelector('#tool-manager-list');
    const versionsEl = container.querySelector('#tool-manager-versions');
    const editorEl = container.querySelector('#tool-manager-editor');
    const previewEl = container.querySelector('#tool-manager-preview');
    const statusEl = container.querySelector('#tool-manager-status');
    const nameEl = container.querySelector('#tool-manager-name');
    const idEl = container.querySelector('#tool-manager-id');
    const categoryEl = container.querySelector('#tool-manager-category');
    const commitEl = container.querySelector('#tool-manager-commit');
    const newBtn = container.querySelector('#tool-manager-new');
    const saveBtn = container.querySelector('#tool-manager-save');
    const importBtn = container.querySelector('#tool-manager-import');
    const fileInput = container.querySelector('#tool-manager-file');

    let toolRows = [];
    let selectedToolId = null;
    let selectedVersionRows = [];

    function setPreview(html) {
      previewEl.srcdoc = html || blankHtml('Paste HTML to preview it here');
    }

    function setEditor(html) {
      editorEl.value = html;
      setPreview(html);
    }

    function setStatus(message, tone = 'info') {
      statusEl.textContent = message;
      statusEl.dataset.tone = tone;
    }

    function setForm(tool, { lockId = false } = {}) {
      nameEl.value = tool?.name || '';
      idEl.value = tool?.id || '';
      idEl.readOnly = lockId;
      categoryEl.value = tool?.category || 'tools';
      commitEl.value = tool?.commit_message || '';
    }

    async function refreshTools(nextToolId = null) {
      if (!userId) {
        listEl.innerHTML = '<div class="tool-manager-empty">Sign in to manage saved tools.</div>';
        versionsEl.innerHTML = '<div class="tool-manager-empty">Sign in to see history.</div>';
        setForm({}, { lockId: false });
        setEditor(STARTER_HTML);
        return;
      }

      toolRows = await ToolLibrary.listActiveTools(userId);
      renderToolList();

      const candidateId = nextToolId || selectedToolId || toolRows[0]?.id || null;

      if (candidateId) {
        await selectTool(candidateId);
      } else {
        selectedToolId = null;
        selectedVersionRows = [];
        setForm({}, { lockId: false });
        setEditor(STARTER_HTML);
        renderVersions();
      }
    }

    function renderToolList() {
      if (!toolRows.length) {
        listEl.innerHTML = '<div class="tool-manager-empty">No saved tools yet.</div>';
        return;
      }

      listEl.innerHTML = '';

      for (const tool of toolRows) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `tool-manager-item${tool.id === selectedToolId ? ' is-active' : ''}`;
        button.innerHTML = `
          <span class="tool-manager-item-name">${tool.name}</span>
          <span class="tool-manager-item-meta">${tool.category || 'tools'}</span>
        `;
        button.onclick = () => selectTool(tool.id);
        listEl.appendChild(button);
      }
    }

    function renderVersions() {
      if (!selectedVersionRows.length) {
        versionsEl.innerHTML = '<div class="tool-manager-empty">No versions yet.</div>';
        return;
      }

      versionsEl.innerHTML = '';

      for (const versionRow of selectedVersionRows) {
        const row = document.createElement('div');
        row.className = 'tool-manager-version';
        row.innerHTML = `
          <div class="tool-manager-version-head">
            <strong>v${versionRow.version}</strong>
            <span>${versionRow.commit_message || 'update tool'}</span>
          </div>
          <div class="tool-manager-version-actions">
            <button type="button" class="btn btn-ghost">Load</button>
            <button type="button" class="btn btn-ghost">Restore</button>
          </div>
        `;

        const buttons = row.querySelectorAll('button');
        buttons[0].onclick = () => setEditor(versionRow.html || '');
        buttons[1].onclick = async () => {
          try {
            await ToolLibrary.restoreVersion(userId, versionRow.tool_id, versionRow);
            context.toast(`restored v${versionRow.version}`, 'success');
            await refreshTools(versionRow.tool_id);
          } catch (error) {
            console.error(error);
            context.toast(error.message || 'restore failed', 'error');
          }
        };

        versionsEl.appendChild(row);
      }
    }

    async function selectTool(toolId) {
      if (!userId) return;

      const tool = toolRows.find(row => row.id === toolId);
      if (!tool) return;

      selectedToolId = toolId;
      renderToolList();
      setForm(tool, { lockId: true });
      setStatus(`loaded ${tool.name}`);

      try {
        const html = await ToolLibrary.loadToolHtml(userId, toolId, tool.config?.entry_file || ToolLibrary.entryFile);
        setEditor(html || STARTER_HTML);
      } catch (error) {
        console.error(error);
        setEditor(blankHtml('Could not load this tool from storage.'));
        context.toast(error.message || 'failed to load tool', 'error');
      }

      try {
        selectedVersionRows = await ToolLibrary.listVersions(userId, toolId);
        renderVersions();
      } catch (error) {
        console.error(error);
        selectedVersionRows = [];
        renderVersions();
      }
    }

    function resetForNewTool() {
      selectedToolId = null;
      selectedVersionRows = [];
      renderToolList();
      setForm({ category: 'tools', commit_message: 'new tool' }, { lockId: false });
      commitEl.value = 'new tool';
      setEditor(STARTER_HTML);
      renderVersions();
      setStatus('new tool');
    }

    editorEl.addEventListener('input', () => {
      setPreview(editorEl.value);
      setStatus('editing');
    });

    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      const html = await file.text();
      setEditor(html);
      setStatus(`imported ${file.name}`);
      fileInput.value = '';
    });

    newBtn.addEventListener('click', resetForNewTool);

    saveBtn.addEventListener('click', async () => {
      if (!userId) {
        context.toast('sign in to save tools', 'error');
        return;
      }

      const id = (selectedToolId || idEl.value).trim();
      const name = nameEl.value.trim();
      const description = '';
      const category = categoryEl.value.trim() || 'tools';

      if (!id || !name) {
        context.toast('tool name and id are required', 'error');
        return;
      }

      saveBtn.disabled = true;
      setStatus('saving');

      try {
        await ToolLibrary.saveTool(userId, {
          id,
          name,
          description,
          category,
          icon: '□',
          kind: 'html',
          commit_message: commitEl.value.trim() || 'update tool',
          is_active: true,
        }, editorEl.value);

        selectedToolId = id;
        context.toast(`saved ${name}`, 'success');
        await refreshTools(id);
      } catch (error) {
        console.error(error);
        context.toast(error.message || 'save failed', 'error');
        setStatus('save failed', 'error');
      } finally {
        saveBtn.disabled = false;
      }
    });

    setEditor(STARTER_HTML);
    await refreshTools();
  }
};
