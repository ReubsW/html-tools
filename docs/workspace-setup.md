# Workspace Setup

## Local checkout

- Repository: https://github.com/ReubsW/html-tools
- Local path: `C:\Users\reube\Documents\HtmlTools\html-tools`
- Working branch for Codex setup work: `codex/workspace-setup`

## Run locally

This project is a static ES module app with no bundler and no dependency install required.

```bash
npm run dev
```

The local server defaults to:

```text
http://127.0.0.1:4173
```

Set `PORT` or `HOST` if another service is already using that port.

## Current environment notes

- Supabase configuration is read from `env.js` via `window.ENV`.
- `env.js` is currently tracked in Git even though `.gitignore` says not to commit it.
- `supabase-schema.sql` contains the one-time database setup for memory, tool files, versions, and upload/rollback flows.
- Vercel deployment is static and uses `vercel.json` to rewrite all routes to `index.html`.

## Git hygiene

- Keep work on feature branches using the `codex/` prefix unless a different branch name is requested.
- Commit setup, docs, and product changes separately when possible.
- Before deploying or pushing sensitive changes, review whether `env.js` should remain tracked or move to an untracked local config pattern.
