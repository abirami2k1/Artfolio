# Folio

A personal flipbook web app for looking at illustrations the way they're meant to be seen — in a book. Upload images, bind them into books of any size and orientation, adjust how each image sits on its page, and swipe through them as a stack of open spreads. Inspired by the journal view in Paper by WeTransfer.

Built solo, at zero running cost: a static site with no backend. Books live in the browser (IndexedDB) and sync to the user's own Google Drive.

---

## Read these first (full project context)

- @context/project-prd.md — vision, users, product requirements, data model, tech
- @context/features.md — the complete feature list (source of truth for scope)
- @context/coding-standards.md — how code is written and structured (esp. the domain/volatility separation and the storage adapter)
- @context/ai-interaction.md — how we work together (workflow, commits, privacy rules)
- @context/current-task.md — the single active task right now

## Build plan

- @tasks/TASKLIST.md — **the detailed, ordered checklist. This is what you execute.** Do one unchecked item at a time, top to bottom; run its acceptance check; mark it `[x]`; move on.
- @tasks/README.md — the high-level phase map and dependency table (context for the checklist).

---

## Golden rules (do not violate)

1. **One task at a time, in order.** Follow @tasks/TASKLIST.md top to bottom. Do not skip ahead or pull work forward.
2. **Volatile rules live apart from the core.** Book presets, layout/fit math, spread pairing, image-processing limits and stack/shelf motion settings live in `src/domain/` as pure functions with their constants at the top. Components call the domain; they never contain layout math.
3. **One renderer.** The editor and the reader draw pages with the same `PageRenderer`. What you see while editing is exactly what you see while reading.
4. **Storage goes through the adapter.** UI and stores talk to the `BookRepository`, never to IndexedDB or the Drive API directly.
5. **The user's data is theirs.** Least-privilege Drive scope (`drive.file` only), no tokens or images in logs or URLs, never delete anything in Drive without explicit confirmation in the UI. See ai-interaction.
6. **Ask before large refactors or architectural changes.** Don't add features not in features.md.
7. **Build, lint and tests must pass before commit. Ask before committing.**

---

## Commands

Single app at the repo root (React + Vite + TS):
- **Dev**: `npm run dev` (http://localhost:5173)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Test**: `npm run test` (Vitest)

## Tech at a glance

React (Vite, TS) · Tailwind v4 · Zustand · Dexie (IndexedDB) · Framer Motion · @use-gesture/react · dnd-kit · Zod · Vitest · Google Identity Services + Drive API v3 · hosted free on Cloudflare Pages.
