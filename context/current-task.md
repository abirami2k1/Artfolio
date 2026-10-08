# Current Task

> The single active task. Update this when starting/finishing a task. Follow the workflow in @context/ai-interaction.md and the order in @tasks/TASKLIST.md.

## Active
**Phase 05 — Reader (spread stack)** → first unchecked item in @tasks/TASKLIST.md (Milestone 5.1 — Stack geometry)
Branch: `feature/05-reader` (to create)

## Next up
Phase 06 — Page editor

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
- 1.1 `config.ts` tunables; Zod schemas + inferred types; `createBook`/`createPage`; `migrateBook`; ESLint purity guard on `src/domain`
- 1.2 `pageAspect` (orientation-normalized), `computeBookSize`, `viewMode`
- 1.3 `computeImagePlacement`, `computeSpreadPlacement`, `clampTransform`, `resetTransform`
- 1.4 `expandToRenderPages` (covers, spread halves, filler pairing), `naturalSort`, `movePage`/`insertPage`/`removePage`
- ✅ Phase 01 complete
- 2.1 `BookRepository` (+ `getImage`), Dexie v1 (books/images/blobs as bytes+mime), `LocalRepository` (Zod on every read), no-orphan `deleteBook`, persistence + usage helpers
- 2.2 `fitWithin`/`resizePlan` (domain); image worker (OffscreenCanvas, WebP) + main-thread fallback; `useImageUrl` in `src/hooks/`
- 2.3 `libraryStore`, `bookStore` (debounced autosave, `AUTOSAVE_DEBOUNCE_MS`); `MemoryRepository` for tests; lint blocks Dexie outside `storage/local`
- ✅ Phase 02 complete
- 3 Shelf domain: `coverBox`, `bookThickness`, `coverGeometry`, `carouselLayout`, `dragPosition`, `settleCarouselIndex`; `readableTextColor`, `formatBytes`
- 3 `BookCover`, `ShelfCarousel` (Framer Motion + @use-gesture; drag/flick, wheel, arrows, tap), selected-book chrome, empty state
- 3 Create / settings dialog with live preview (`bookForm` mapping), delete with named confirm, Settings page (usage + persistence)
- 3 Shared `Dialog` (ConfirmDialog now uses it), `Menu`, `Segmented`; `shelfStore` remembers the selected book
- ✅ Phase 03 complete — note: "Add images" button is disabled until Phase 04 import exists
- 4.1 `computePagePlacement` (single vs spread half) in domain; `PageRenderer` (background, margin frame, placement, spread halves, `thumb` variant)
- 4.2 Domain: `classifyImportFile`/`planImport`/`importAcceptAttribute` (`IMPORT_FORMATS`), `pageSizeForWidth` (`PAGE_GRID`)
- 4.2 `importStore` (one file at a time: process → `putImage` → append page; progress; per-file failures; orphan cleanup; HEIC message); `libraryStore.appendPages`
- 4.2 `ImportDropzone`, `useImportPicker`, `ImportProgress` pill; shelf "Add images" enabled + drop onto selected book; `useImageAsset`
- 4.2 Reader route: book header + `PageGrid` (thumbs via PageRenderer) — becomes the grid view in Phase 05
- ✅ Phase 04 complete — verified in Chrome: picker + drop import, natural order, failures summarized, persists on reload
