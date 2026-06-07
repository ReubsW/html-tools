import { Auth } from '../../framework/Auth.js';
import { ToolLibrary } from '../../framework/ToolLibrary.js';

const STARTER_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>New Tool</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: system-ui, sans-serif; padding: 24px; margin: 0; color: #111; background: #f5f4ef; }
    .shell { max-width: 720px; margin: 0 auto; padding: 24px; border: 1px solid #d7d2c7; border-radius: 12px; background: #fff; }
    h1 { margin: 0 0 12px; font-size: 28px; }
    p { margin: 0 0 16px; line-height: 1.5; }
    button { border: 0; border-radius: 8px; padding: 10px 14px; background: #111; color: #fff; cursor: pointer; }
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

const DRAFT_KEY = 'draft';

// Define known core app defaults to manage visibility of the Revert button
const KNOWN_DEFAULTS = ['calculator', 'json-formatter', 'color-picker'];

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slugify(value, fallback = 'new-tool') {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;
}

function blankHtml(message) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; color: #666; background: #f3f0e8; }
  </style>
</head>
<body>${message}</body>
</html>`;
}

function normalizeHtml(html, title = 'Preview') {
  const source = String(html ?? '').trim();
  if (!source) {
    return blankHtml('Paste HTML to preview it here');
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

function normalizeDraft(raw = {}) {
  return {
    mode: raw.mode === 'tool' ? 'tool' : 'draft',
    selectedToolId: String(raw.selectedToolId || '').trim() || null,
    name: String(raw.name || '').trim(),
    id: String(raw.id || '').trim(),
    category: String(raw.category || 'tools').trim() || 'tools',
    commit_message: String(raw.commit_message || 'new tool').trim() || 'new tool',
    html: String(raw.html || STARTER_HTML),
  };
}

function normalizeToolMeta(draft) {
  const generatedSlug = slugify(draft.name || 'new-tool');
  return {
    id: draft.selectedToolId || undefined, 
    slug: generatedSlug,                   
    name: String(draft.name || '').trim(),
    description: '',
    category: String(draft.category || 'tools').trim() || 'tools',
    icon: '*',
    commit_message: String(draft.commit_message || 'update tool').trim() || 'update tool',
    kind: 'html',
    is_active: true,
  };
}

function buildReviewMessage({ userId, draft }) {
  const scope = userId ? 'cloud save' : 'local draft';
  const action = userId ? 'save this tool to your library' : 'keep this draft in this browser';
  const displaySlug = slugify(draft.name || 'new-tool');
  return `
    <div class="tool-manager-review-copy">
      <div class="tool-manager-review-title">Review before you ${userId ? 'save' : 'keep'}</div>
      <div class="tool-manager-review-meta">${escapeHtml(scope)} is about to ${escapeHtml(action)}.</div>
      <ul class="tool-manager-review-list">
        <li><strong>Name:</strong> ${escapeHtml(draft.name || 'Untitled tool')}</li>
        <li><strong>Slug Column:</strong> ${escapeHtml(displaySlug)}</li>
        <li><strong>Category:</strong> ${escapeHtml(draft.category || 'tools')}</li>
        <li><strong>Commit:</strong> ${escapeHtml(draft.commit_message || 'update tool')}</li>
      </ul>
    </div>
  `;
}

export default {
  id: 'tool-manager',
  name: 'Tool Manager',
  description: 'Create, preview, version, and restore HTML tools',
  category: 'tools',
  icon: '*',

  async render(container, context) {
    const userId = context.user?.id || null;
    const isSignedIn = !!userId;

    container.innerHTML = `
      <div class="tool-manager-shell">
        <div id="tool-manager-banner" class="tool-manager-banner" hidden></div>
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
                <button id="tool-manager-revert" class="btn btn-danger" type="button" hidden>Revert to Default</button>
                <button id="tool-manager-preview-save" class="btn btn-primary" type="button">Review & Save</button>
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
                  <span class="tool-manager-label">Live preview</span>
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

        <div id="tool-manager-review" class="tool-manager-modal" hidden>
          <div class="tool-manager-modal-card">
            <div class="tool-manager-modal-head">
              <div>
                <div class="tool-manager-label">Preview screen</div>
                <div class="tool-manager-title">Confirm the tool before saving</div>
              </div>
              <button id="tool-manager-review-close" class="btn btn-ghost" type="button">Back to editing</button>
            </div>
            <div id="tool-manager-review-copy" class="tool-manager-review-copy"></div>
            <iframe id="tool-manager-review-preview" class="html-tool-frame" title="Tool review preview" sandbox="allow-forms allow-modals allow-popups allow-scripts" referrerpolicy="no-referrer"></iframe>
            <div class="tool-manager-review-actions">
              <button id="tool-manager-review-confirm" class="btn btn-primary" type="button">Save Tool</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const bannerEl = container.querySelector('#tool-manager-banner');
    const listEl = container.querySelector('#tool-manager-list');
    const versionsEl = container.querySelector('#tool-manager-versions');
    const editorEl = container.querySelector('#tool-manager-editor');
    const previewEl = container.querySelector('#tool-manager-preview');
    const statusEl = container.querySelector('#tool-manager-status');
    const nameEl = container.querySelector('#tool-manager-name');
    const categoryEl = container.querySelector('#tool-manager-category');
    const commitEl = container.querySelector('#tool-manager-commit');
    const newBtn = container.querySelector('#tool-manager-new');
    const previewSaveBtn = container.querySelector('#tool-manager-preview-save');
    const revertBtn = container.querySelector('#tool-manager-revert');
    const importBtn = container.querySelector('#tool-manager-import');
    const fileInput = container.querySelector('#tool-manager-file');
    const reviewEl = container.querySelector('#tool-manager-review');
    const reviewCopyEl = container.querySelector('#tool-manager-review-copy');
    const reviewPreviewEl = container.querySelector('#tool-manager-review-preview');
    const reviewCloseBtn = container.querySelector('#tool-manager-review-close');
    const reviewConfirmBtn = container.querySelector('#tool-manager-review-confirm');

    let toolRows = [];
    let selectedToolId = null;
    let selectedVersionRows = [];
    let draft = normalizeDraft();
    let pendingSave = null;
    let draftReady = false;
    let reviewMode = 'cloud';
    let saveTimer = null;

    function setPreview(html) {
      const title = nameEl.value.trim() || 'Preview';
      previewEl.srcdoc = normalizeHtml(html, title);
    }

    function setReviewPreview(html) {
      const title = nameEl.value.trim() || 'Preview';
      reviewPreviewEl.srcdoc = normalizeHtml(html, title);
    }

    function setEditor(html, { persist = true } = {}) {
      editorEl.value = html;
      setPreview(html);
      if (persist) scheduleDraftSave();
    }

    function setStatus(message, tone = 'info') {
      statusEl.textContent = message;
      statusEl.dataset.tone = tone;
    }

    function setForm(tool = {}, { persist = true } = {}) {
      nameEl.value = tool.name || '';
      categoryEl.value = tool.category || 'tools';
      commitEl.value = tool.commit_message || 'new tool';
      if (persist) scheduleDraftSave();
    }

    function readDraft() {
      return normalizeDraft({
        mode: selectedToolId ? 'tool' : 'draft',
        selectedToolId,
        name: nameEl.value,
        id: selectedToolId || '',
        category: categoryEl.value,
        commit_message: commitEl.value,
        html: editorEl.value,
      });
    }

    function updateRevertButtonVisibility(toolSlug) {
      if (selectedToolId && KNOWN_DEFAULTS.includes(toolSlug)) {
        revertBtn.hidden = false;
      } else {
        revertBtn.hidden = true;
      }
    }

    function applyDraft(nextDraft, { persist = false } = {}) {
      draft = normalizeDraft(nextDraft);
      selectedToolId = draft.selectedToolId;
      setForm(draft, { persist: false });
      setEditor(draft.html || STARTER_HTML, { persist: false });
      
      const currentTool = toolRows.find(row => row.id === selectedToolId);
      if (currentTool) {
        updateRevertButtonVisibility(currentTool.slug);
      } else {
        revertBtn.hidden = true;
      }

      if (draft.mode === 'tool' && draft.selectedToolId) {
        setStatus(`editing ${draft.name || draft.selectedToolId}`);
      } else {
        setStatus('draft loaded');
      }
      renderToolList();
      renderVersions();
      if (persist) scheduleDraftSave(true);
    }

    function scheduleDraftSave(immediate = false) {
      draft = normalizeDraft(readDraft());
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      const save = () => context.memory.set(DRAFT_KEY, draft);
      if (immediate) {
        save();
        return;
      }
      saveTimer = setTimeout(save, 120);
    }

    async function loadDraft() {
      try {
        const stored = await context.memory.get(DRAFT_KEY, { cloud: isSignedIn });
        if (stored && typeof stored === 'object') {
          return normalizeDraft(stored);
        }
      } catch (error) {
        console.warn('[ToolManager] failed to load draft', error);
      }
      return normalizeDraft();
    }

    function showBanner() {
      if (!isSignedIn) {
        bannerEl.hidden = false;
        bannerEl.innerHTML = `
          <div class="tool-manager-banner-copy">
            <strong>Local draft mode.</strong> <span>You can keep working in this browser, but saving to the library, version history, and device sync all require sign in.</span>
          </div>
          <button id="tool-manager-banner-signin" class="btn btn-primary" type="button">Sign in to sync</button>
        `;
        bannerEl.querySelector('#tool-manager-banner-signin')?.addEventListener('click', () => {
          Auth.signInWithGoogle();
        });
        return;
      }
      bannerEl.hidden = false;
      bannerEl.innerHTML = `
        <div class="tool-manager-banner-copy">
          <strong>Signed in and ready to publish.</strong> <span>Your draft will sync to this account and your saved tools will appear in the library.</span>
        </div>
      `;
    }

    function renderToolList() {
      if (!isSignedIn) {
        listEl.innerHTML = `
          <div class="tool-manager-empty">
            <p>Sign in to manage saved tools.</p>
            <p>Until then, the draft you edit here stays local to this browser.</p>
          </div>
        `;
        return;
      }
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
          <span class="tool-manager-item-name">${escapeHtml(tool.name)}</span>
          <span class="tool-manager-item-meta">${escapeHtml(tool.category || 'tools')}</span>
        `;
        button.onclick = () => selectTool(tool.id);
        listEl.appendChild(button);
      }
    }

    function renderVersions() {
      if (!isSignedIn) {
        versionsEl.innerHTML = '<div class="tool-manager-empty">Sign in to see history.</div>';
        return;
      }
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
            <span>${escapeHtml(versionRow.commit_message || 'update tool')}</span>
          </div>
          <div class="tool-manager-version-actions">
            <button type="button" class="btn btn-ghost">Load</button>
            <button type="button" class="btn btn-ghost">Restore</button>
          </div>
        `;
        const buttons = row.querySelectorAll('button');
        buttons[0].onclick = () => {
          setEditor(versionRow.html || '', { persist: true });
          setStatus(`loaded v${versionRow.version}`);
        };
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

    async function loadVersionsForTool(toolId) {
      if (!isSignedIn || !toolId) {
        selectedVersionRows = [];
        renderVersions();
        return;
      }
      try {
        selectedVersionRows = await ToolLibrary.listVersions(userId, toolId);
      } catch (error) {
        console.error(error);
        selectedVersionRows = [];
      }
      renderVersions();
    }

    async function selectTool(toolId) {
      if (!isSignedIn) {
        return;
      }
      const tool = toolRows.find(row => row.id === toolId);
      if (!tool) {
        return;
      }
      selectedToolId = toolId;
      renderToolList();
      setForm(tool, { persist: false });
      updateRevertButtonVisibility(tool.slug);

      try {
        const html = await ToolLibrary.loadToolHtml(userId, toolId, tool.config?.entry_file || ToolLibrary.entryFile);
        setEditor(html || STARTER_HTML, { persist: false });
        draft = normalizeDraft({
          mode: 'tool',
          selectedToolId: toolId,
          name: tool.name,
          id: toolId,
          category: tool.category,
          commit_message: tool.commit_message || 'update tool',
          html: html || STARTER_HTML,
        });
        scheduleDraftSave(true);
        setStatus(`loaded ${tool.name}`);
      } catch (error) {
        console.error(error);
        setEditor(blankHtml('Could not load this tool from storage.'), { persist: false });
        context.toast(error.message || 'failed to load tool', 'error');
      }
      await loadVersionsForTool(toolId);
    }

    function resetForNewTool() {
      selectedToolId = null;
      selectedVersionRows = [];
      revertBtn.hidden = true;
      draft = normalizeDraft({
        mode: 'draft',
        selectedToolId: null,
        name: '',
        id: '',
        category: 'tools',
        commit_message: 'new tool',
        html: STARTER_HTML,
      });
      renderToolList();
      renderVersions();
      setForm(draft, { persist: false });
      setEditor(STARTER_HTML, { persist: false });
      setStatus('new draft');
      scheduleDraftSave(true);
    }

    function openReviewModal(mode) {
      const nextDraft = normalizeDraft(readDraft());
      const toolMeta = normalizeToolMeta(nextDraft);
      pendingSave = {
        draft: nextDraft,
        tool: toolMeta,
        html: normalizeHtml(nextDraft.html, nextDraft.name || 'Preview'),
      };
      reviewMode = mode;
      reviewCopyEl.innerHTML = buildReviewMessage({ userId, draft: nextDraft });
      setReviewPreview(pendingSave.html);
      reviewConfirmBtn.textContent = isSignedIn ? 'Save Tool' : 'Keep Local Draft';
      reviewEl.hidden = false;
    }

    function closeReviewModal() {
      reviewEl.hidden = true;
      pendingSave = null;
    }

    async function saveCurrentDraft() {
      const snapshot = normalizeDraft(readDraft());
      const html = normalizeHtml(snapshot.html, snapshot.name || 'Preview');

      if (!isSignedIn) {
        draft = snapshot;
        draft.html = html;
        context.memory.set(DRAFT_KEY, draft);
        context.toast('local draft saved in this browser', 'success');
        setStatus('draft saved locally');
        closeReviewModal();
        return;
      }

      if (!snapshot.name) {
        context.toast('tool name is required', 'error');
        return;
      }

      previewSaveBtn.disabled = true;
      reviewConfirmBtn.disabled = true;
      setStatus('saving');

      const targetMeta = normalizeToolMeta(snapshot);

      try {
        const result = await ToolLibrary.saveTool(userId, {
          ...targetMeta,
          icon: '*',
        }, html);
        
        const nextId = result.toolId || targetMeta.id;
        selectedToolId = nextId;
        
        draft = normalizeDraft({
          ...snapshot,
          mode: 'tool',
          id: nextId,
          selectedToolId: nextId,
          html,
        });
        
        scheduleDraftSave(true);
        context.toast(`saved ${snapshot.name}`, 'success');
        closeReviewModal();
        await refreshTools(nextId);
      } catch (error) {
        console.error(error);
        context.toast(error.message || 'save failed', 'error');
        setStatus('save failed', 'error');
      } finally {
        previewSaveBtn.disabled = false;
        reviewConfirmBtn.disabled = false;
      }
    }

    async function handleRevertToDefault() {
      if (!selectedToolId) return;

      const currentTool = toolRows.find(row => row.id === selectedToolId);
      if (!currentTool) return;

      const confirmRevert = confirm(`Are you sure you want to discard your iterations on "${currentTool.name}" and revert back to the pristine default setup?`);
      if (!confirmRevert) return;

      try {
        setStatus('reverting');
        await ToolLibrary.deleteTool(userId, selectedToolId);
        context.toast(`Reverted ${currentTool.name} to default`, 'success');
        selectedToolId = null;
        await refreshTools();
      } catch (error) {
        console.error(error);
        context.toast(error.message || 'failed to revert tool', 'error');
        setStatus('revert failed', 'error');
      }
    }

    async function refreshTools(nextToolId = null) {
      if (!isSignedIn) {
        toolRows = [];
        selectedVersionRows = [];
        revertBtn.hidden = true;
        renderToolList();
        renderVersions();
        const storedDraft = await loadDraft();
        const nextDraft = storedDraft || normalizeDraft({
          mode: 'draft',
          selectedToolId: null,
          category: 'tools',
          commit_message: 'new tool',
          html: STARTER_HTML,
        });
        applyDraft(nextDraft, { persist: false });
        setStatus('draft ready');
        return;
      }

      toolRows = await ToolLibrary.listActiveTools(userId);
      renderToolList();

      const storedDraft = await loadDraft();
      const storedToolId = storedDraft?.selectedToolId || selectedToolId || nextToolId || null;
      const matchingTool = storedToolId ? toolRows.find(tool => tool.id === storedToolId) : null;

      if (matchingTool && storedDraft?.mode === 'tool') {
        selectedToolId = matchingTool.id;
        renderToolList();
        await loadVersionsForTool(matchingTool.id);
      }

      if (storedDraft && storedDraft.html) {
        applyDraft(storedDraft, { persist: false });
        if (storedDraft.mode === 'tool' && storedDraft.selectedToolId && toolRows.some(tool => tool.id === storedDraft.selectedToolId)) {
          selectedToolId = storedDraft.selectedToolId;
          renderToolList();
          await loadVersionsForTool(storedDraft.selectedToolId);
        } else {
          selectedToolId = null;
          selectedVersionRows = [];
          renderVersions();
        }
        return;
      }

      const candidateId = nextToolId || selectedToolId || toolRows[0]?.id || null;
      if (candidateId) {
        await selectTool(candidateId);
      } else {
        selectedToolId = null;
        selectedVersionRows = [];
        revertBtn.hidden = true;
        setForm({
          category: 'tools',
          commit_message: 'new tool',
        }, { persist: false });
        setEditor(STARTER_HTML, { persist: false });
        renderVersions();
        setStatus('new draft');
        scheduleDraftSave(true);
      }
    }

    editorEl.addEventListener('input', () => {
      if (selectedToolId) {
        draft.mode = 'tool';
        draft.selectedToolId = selectedToolId;
      }
      setPreview(editorEl.value);
      setStatus('editing');
      scheduleDraftSave();
    });

    [nameEl, categoryEl, commitEl].forEach(el => {
      el.addEventListener('input', () => {
        setPreview(editorEl.value);
        if (el === commitEl) {
          setStatus('editing');
        }
        scheduleDraftSave();
      });
    });

    importBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const html = await file.text();
      setEditor(html, { persist: true });
      setStatus(`imported ${file.name}`);
      fileInput.value = '';
    });

    newBtn.addEventListener('click', resetForNewTool);
    revertBtn.addEventListener('click', handleRevertToDefault);

    previewSaveBtn.addEventListener('click', () => {
      openReviewModal(isSignedIn ? 'cloud' : 'local');
    });

    reviewCloseBtn.addEventListener('click', closeReviewModal);
    reviewConfirmBtn.addEventListener('click', saveCurrentDraft);

    reviewEl.addEventListener('click', (event) => {
      if (event.target === reviewEl) {
        closeReviewModal();
      }
    });

    setPreview(STARTER_HTML);
    showBanner();

    if (!isSignedIn) {
      listEl.innerHTML = '<div class="tool-manager-empty">Sign in to manage saved tools.</div>';
      versionsEl.innerHTML = '<div class="tool-manager-empty">Sign in to see history.</div>';
      setForm({
        category: 'tools',
        commit_message: 'new tool',
      }, { persist: false });
      setEditor(STARTER_HTML, { persist: false });
      draft = await loadDraft();
      applyDraft(draft, { persist: false });
      draftReady = true;
      return;
    }

    draft = await loadDraft();
    draftReady = true;
    await refreshTools(draft.selectedToolId || null);
  }
};
