import { Registry } from './Registry.js';
import { Router } from './Router.js';
import { Auth } from './Auth.js';
import { Supabase } from './Supabase.js';
import { toast } from './Toast.js';

import { DynamicToolLoader } from '../DynamicToolLoader.js';
import { HotReloadManager } from '../HotReloadManager.js';

// Static tools (temporary layer)
import PTOCalculator from '../tools/pto-calculator/index.js';
import RentChecker from '../tools/rent-checker/index.js';
import VacationPlanner from '../tools/vacation-planner/index.js';
import ToolManager from '../tools/tool-manager/index.js';

let navListenerBound = false;

async function init() {
  console.log('[App] booting...');

  // 1. Init Supabase
  Supabase.init();

  // 2. Register static tools
  registerStaticTools();

  // 3. Auth init
  await Auth.init();

  // 4. Load dynamic tools
  if (Auth.user) {
    await DynamicToolLoader.init(Auth.user);
    HotReloadManager.start(Auth.user);
  }

  // 5. UI
  renderNav();
  wireAuth();

  // 6. Auth changes
  Auth.onChange(async (user) => {
    updateAuthUI(user);

    if (user) {
      await DynamicToolLoader.init(user);
      HotReloadManager.start(user);
      renderNav();
    } else {
      DynamicToolLoader.clear();
      HotReloadManager.stop();
      renderNav();
    }
  });

  // 7. Router
  Router.init();

  console.log('[App] ready');
}

function registerStaticTools() {
  Registry.register(PTOCalculator);
  Registry.register(RentChecker);
  Registry.register(VacationPlanner);
  Registry.register(ToolManager);
}

function renderNav() {
  const nav = document.getElementById('tool-nav');
  const tools = Registry.all();

  if (!nav) return;

  if (!tools.length) {
    nav.innerHTML = '<div class="nav-loading">no tools registered</div>';
    return;
  }

  const groups = {};

  for (const tool of tools) {
    const cat = tool.category || 'tools';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(tool);
  }

  nav.innerHTML = '';

  for (const [category, items] of Object.entries(groups)) {
    const label = document.createElement('div');
    label.className = 'nav-group-label';
    label.textContent = category;
    nav.appendChild(label);

    for (const tool of items) {
      const btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.dataset.id = tool.id;

      btn.innerHTML = `
        <span class="nav-icon">${tool.icon ?? '▸'}</span>
        <span>${tool.name}</span>
      `;

      btn.onclick = () => Router.go(tool.id);
      nav.appendChild(btn);
    }
  }

  if (!navListenerBound) {
    window.addEventListener('hashchange', updateActiveNav);
    navListenerBound = true;
  }

  updateActiveNav();
}

function updateActiveNav() {
  const current = Router.current();

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.id === current);
  });
}

function wireAuth() {
  document.getElementById('auth-btn')?.addEventListener('click', () => {
    if (Auth.user) Auth.signOut();
    else Auth.signInWithGoogle();
  });
}

function updateAuthUI(user) {
  const label = document.getElementById('auth-label');
  const btn = document.getElementById('auth-btn');

  if (!label || !btn) return;

  if (user) {
    label.textContent = user.email ?? 'signed in';
    btn.textContent = 'sign out';
    toast('signed in', 'success');
  } else {
    label.textContent = 'not signed in';
    btn.textContent = 'sign in';
  }
}

init().catch(err => {
  console.error('[App] init failed:', err);
});
