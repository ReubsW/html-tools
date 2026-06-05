import { Registry } from './Registry.js';
import { Memory } from './Memory.js';
import { Files } from './Files.js';
import { toast } from './Toast.js';
import { Auth } from './Auth.js';

const CONTAINER_ID = 'tool-container';

function parseHash() {
  const hash = window.location.hash;
  return hash.replace(/^#\/?/, '') || '';
}

async function render(toolId) {
  const container = document.getElementById(CONTAINER_ID);

  if (!container) return;

  if (!toolId) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-icon">▣</p>
        <p class="empty-text">select a tool to begin</p>
      </div>
    `;
    return;
  }

  const tool = Registry.get(toolId);

  if (!tool) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-icon">⚠</p>
        <p class="empty-text">tool not found: ${toolId}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  // ─────────────────────────────────────────────
  // Unified execution context (STATIC + DYNAMIC tools)
  // ─────────────────────────────────────────────

  const context = buildContext(toolId);

  try {
    await tool.render(container, context);
  } catch (err) {
    console.error(`[Router] tool crash: ${toolId}`, err);

    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-icon">⚠</p>
        <p class="empty-text">tool crashed — check console</p>
      </div>
    `;
  }
}

function buildContext(toolId) {
  const user = Auth.user;

  return {
    toolId,

    user: user ?? null,

    memory: Memory.scope(toolId),
    files: Files.scope(toolId),
    toast: Toast,

    // future-safe extension point for dynamic tools
    runtime: {
      isAuthenticated: !!user,
      mode: user ? 'cloud' : 'local'
    }
  };
}

export const Router = {
  init() {
    window.addEventListener('hashchange', () => {
      render(parseHash());
    });

    render(parseHash());
  },

  go(toolId) {
    window.location.hash = `/${toolId}`;
  },

  current() {
    return parseHash();
  }
};