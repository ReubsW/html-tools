/**
 * App.js
 * Entry point. Initialises auth, registry, and router.
 */

import { Registry } from './Registry.js';
import { Router }   from './Router.js';
import { Auth }     from './Auth.js';
import { toast }    from './Toast.js';

// ── Import all tools here when you add them ──────────────────────
import PTOCalculator   from '../tools/pto-calculator/index.js';
import RentChecker     from '../tools/rent-checker/index.js';
import VacationPlanner from '../tools/vacation-planner/index.js';

async function init() {
  // 1. Register tools
  Registry.register(PTOCalculator);
  Registry.register(RentChecker);
  Registry.register(VacationPlanner);

  // 2. Initialise auth (non-blocking — tools work without it)
  await Auth.init();

  // 3. Build sidebar nav
  renderNav();

  // 4. Wire up auth button
  document.getElementById('auth-btn').addEventListener('click', () => {
    if (Auth.user) {
      Auth.signOut();
    } else {
      Auth.signInWithGoogle();
    }
  });

  // 5. Listen for auth state changes
  Auth.onChange((user) => {
    updateAuthUI(user);
  });

  // 6. Start router (reads current hash and renders the right tool)
  Router.init();
}

function renderNav() {
  const nav   = document.getElementById('tool-nav');
  const tools = Registry.all();

  if (tools.length === 0) {
    nav.innerHTML = '<div class="nav-loading">no tools registered</div>';
    return;
  }

  // Optional: group by category if tools define one
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
      btn.className  = 'nav-item';
      btn.dataset.id = tool.id;
      btn.innerHTML  = `
        <span class="nav-icon">${tool.icon ?? '▸'}</span>
        <span>${tool.name}</span>
      `;
      btn.addEventListener('click', () => {
        Router.go(tool.id);
      });
      nav.appendChild(btn);
    }
  }

  // Highlight active item when hash changes
  window.addEventListener('hashchange', () => updateActiveNav());
  updateActiveNav();
}

function updateActiveNav() {
  const current = Router.current();
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.id === current);
  });
}

function updateAuthUI(user) {
  const label = document.getElementById('auth-label');
  const btn   = document.getElementById('auth-btn');

  if (user) {
    label.textContent = user.email ?? 'signed in';
    btn.textContent   = 'sign out';
    toast('signed in', 'success');
  } else {
    label.textContent = 'not signed in';
    btn.textContent   = 'sign in';
  }
}

init().catch(err => {
  console.error('[App] init failed:', err);
});
