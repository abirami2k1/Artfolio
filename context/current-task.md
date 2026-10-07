# Current Task

> The single active task. Update this when starting/finishing a task. Follow the workflow in @context/ai-interaction.md and the order in @tasks/TASKLIST.md.

## Active
**Phase 01 — Domain: shapes, layout & pages** → first unchecked item in @tasks/TASKLIST.md (Milestone 1.1 — Config, types, schemas)
Branch: `feature/01-domain`

## Next up
Phase 02 — Local storage & image processing

## Deployment
Production: https://artfolio.abirami2k1sr.workers.dev/ (Cloudflare Worker `artfolio`, builds from `main`)

## History (completed)
- 0.1 Init Vite + React + TS (strict), `.gitignore`, README stub
- 0.1 ESLint (typescript-eslint, react-hooks) + Prettier + `.editorconfig`; `npm run lint`
- 0.1 Vitest + Testing Library + `fake-indexeddb`; sample test
- 0.1 `.env.example` placeholders (Phase 07 only)
- 0.2 Tailwind v4 `@theme` tokens; Fraunces + Inter self-hosted via @fontsource
- 0.2 React Router routes (Shelf, Reader, Editor, Settings; unknown → Shelf)
- 0.2 Shell layout (top bar) vs full-screen layout (Reader/Editor)
- 0.2 Toast + confirm dialog (Zustand stores, `toast()` / `confirm()`), demo on Settings
- 0.2 Folder structure per coding-standards
- 0.3 `wrangler.jsonc` SPA static assets; Cloudflare Worker deployed from `main`
- ✅ Phase 00 complete
