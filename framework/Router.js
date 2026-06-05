/**
 * Router.js
 * Hash-based router. URLs look like: /#/tool-id
 *
 * Works as a static site with no server-side routing required.
 */

import { Registry } from './Registry.js';
import { Memory }   from './Memory.js';
import { Files }    from './Files.js';
import { toast }    from './Toast.js';

const CONTAINER_ID = 'tool-container';

function parseHash() {
  // /#/tool-id  → 'tool-id'
  // /#/         → ''
  // (empty)     → ''
  const hash = window.location.hash; // e.g. "#/rent-checker"
  return hash.replace(/^#\/?/, '') || '';
}

async function render(toolId) {
  const container = document.getElementById(CONTAINER_ID);

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

  // Clear previous tool
  container.innerHTML = '';

  // Build the context object every tool receives
  const context = {
    memory: Memory.scope(toolId),
    files:  Files.scope(toolId),
    toast,
  };

  try {
    await tool.render(container, context);
  } catch (err) {
    console.error(`[Router] error rendering tool "${toolId}":`, err);
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-icon">⚠</p>
        <p class="empty-text">tool crashed — check the console</p>
      </div>
    `;
  }
}

export const Router = {
  init() {
    window.addEventListener('hashchange', () => {
      render(parseHash());
    });
    // Render whatever is in the URL on first load
    render(parseHash());
  },

  go(toolId) {
    window.location.hash = `/${toolId}`;
  },

  current() {
    return parseHash();
  },
};
