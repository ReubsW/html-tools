# html-tools

A personal utility platform. Small, deterministic JavaScript calculators that persist data between sessions.

---

## Architecture

```
html-tools/
├── index.html              Shell page (sidebar, viewport, auth button)
├── env.js                  Supabase credentials (gitignored)
├── vercel.json             Static site routing
├── supabase-schema.sql     Database setup (run once)
├── package.json            Local dev server script
├── scripts/dev-server.mjs  Dependency-free static server
├── docs/workspace-setup.md  Working notes for the current checkout
│
├── public/
│   └── app.css             All shared styles + design system
│
├── framework/
│   ├── App.js              Entry point — wires everything together
│   ├── Registry.js         Holds registered tools
│   ├── Router.js           Hash-based routing (#/tool-id)
│   ├── Memory.js           localStorage + Supabase memory abstraction
│   ├── Files.js            Supabase Storage abstraction
│   ├── Auth.js             Google OAuth via Supabase
│   ├── Supabase.js         Supabase client singleton
│   ├── ToolLibrary.js      HTML tool storage + versions + runtime loader
│   └── Toast.js            Notification helper
│
├── utils/
│   ├── DateUtils.js        Date arithmetic helpers
│   ├── FormatUtils.js      Currency, number formatting
│   └── DomUtils.js         Lightweight DOM builder helpers
│
└── tools/
    ├── pto-calculator/
    │   └── index.js
    ├── rent-checker/
    │   └── index.js
    └── vacation-planner/
        └── index.js
```

---

## Adding a new tool

The app supports two layers of tools:

- Static JS tools live in `tools/` and are registered at startup.
- Saved HTML tools are created in the Tool Manager, previewed in an iframe, and stored in Supabase Storage.

For a static JS tool, create `tools/my-tool/index.js`:

```js
export default {
  id:          'my-tool',          // kebab-case, unique
  name:        'My Tool',          // shown in sidebar
  description: 'Does X and Y',    // one line
  category:    'finance',          // sidebar group
  icon:        '◈',               // emoji or symbol

  render(container, context) {
    const { memory, files, toast } = context;

    container.innerHTML = `<div class="tool-header">...</div>`;

    // Save state
    memory.set('key', value);

    // Restore state
    const val = memory.get('key');
  }
};
```

2. Import and register it in `framework/App.js`:

```js
import MyTool from '../tools/my-tool/index.js';
Registry.register(MyTool);
```

That's it. The sidebar, routing, memory, and file access are all provided automatically.

For an HTML tool, open Tool Manager, paste or import the HTML, preview it, then save it to the library. The saved tool becomes a normal sidebar item and is reloaded from Supabase on sign-in.

---

## Memory API

```js
// Synchronous (localStorage)
context.memory.get('key')           // returns value or undefined
context.memory.set('key', value)    // writes local + cloud (if signed in)
context.memory.delete('key')
context.memory.keys()               // all keys for this tool
context.memory.clear()              // clear all keys for this tool

// Force cloud fetch (async)
const val = await context.memory.get('key', { cloud: true });
```

---

## Files API (requires sign-in)

```js
await context.files.upload('report.csv', blob, { contentType: 'text/csv' });
await context.files.download('report.csv');   // returns Blob
await context.files.url('report.csv');        // signed URL (1 hr)
await context.files.list();                   // array of file metadata
await context.files.delete('report.csv');
```

---

## Supabase setup

1. Create a project at supabase.com
2. Run `supabase-schema.sql` in the SQL editor
3. Create a Storage bucket named `tool-files` (private)
4. Enable Google Auth under Authentication → Providers
5. Fill in `env.js` with your project URL and anon key

---

## Deployment

Deployed as a static site on Vercel. No build step required.

```bash
vercel deploy
```

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` as Vercel environment variables
if you want to avoid committing `env.js` (recommended for any shared/public repo).

---

## Design decisions

- **No bundler.** ES modules with import maps. Works as a static site, deployable anywhere.
- **Hash routing.** `#/tool-id` — no server-side routing config needed beyond the catch-all rewrite.
- **Memory is local-first.** localStorage always works; cloud syncs in the background when the user is signed in.
- **Tools are plain objects.** No base class, no constructor. Just `{ id, name, render }`.
- **Auth is optional.** Every tool works offline with localStorage; cloud persistence activates on sign-in.
