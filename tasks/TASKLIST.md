# Folio — Detailed Task List (execute in order)

How to use this: work **top to bottom**. Do ONE checkbox at a time. After each, run its acceptance check, then mark it `[x]` before moving on. Do not pull later work forward. If an item needs something not yet built, stop and flag it.

Conventions:
- `[setup]` tooling/config · `[domain]` pure logic · `[storage]` IndexedDB/Drive · `[ui]` components/pages · `[test]` tests · `[human]` manual step for the founder (stop and wait)
- Each item is small (roughly one focused session).
- "AC" = acceptance criteria (how you know it's done).

Status: `[ ]` todo · `[~]` in progress · `[x]` done

---

## PHASE 00 — SCAFFOLDING, SHELL & DEPLOY

### Milestone 0.1 — Repo & tooling
- [x] `[setup]` Init Vite + React + TypeScript (strict) at repo root; `.gitignore` (incl. `.env`), README stub. AC: `npm run dev` serves; `npm run build` passes.
- [x] `[setup]` ESLint (typescript-eslint, react-hooks) + Prettier + `.editorconfig`; `npm run lint`. AC: lint passes on clean tree.
- [x] `[setup]` Vitest + Testing Library + `fake-indexeddb`; `npm run test` with one sample test. AC: tests run green.
- [x] `[setup]` `.env.example` with `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY` placeholders (documented as needed only in Phase 07). AC: no real values committed.

### Milestone 0.2 — Styling & shell
- [x] `[setup]` Tailwind v4 via `@theme` in `src/styles/globals.css` with tokens from coding-standards; load Fraunces + Inter. AC: a token color and both fonts render.
- [x] `[ui]` React Router routes: `/` Shelf, `/book/:id` Reader, `/book/:id/edit` Editor, `/settings` Settings — placeholder pages. AC: all routes navigate; unknown route → Shelf.
- [x] `[ui]` App layout: minimal top bar (app name, Settings link) on Shelf/Settings; Reader/Editor get full-screen layouts. AC: layouts switch per route.
- [x] `[ui]` Toast system + confirm-dialog component (reused everywhere later). AC: demo toast and dialog work.
- [x] `[setup]` Create folder structure from coding-standards (`domain/`, `storage/`, `stores/`, `features/`, `workers/`…) with index stubs only where needed. AC: build passes.

### Milestone 0.3 — Deploy early
- [x] `[setup]` Add `wrangler.jsonc` (static assets from `dist`, `not_found_handling: single-page-application`) for SPA routing. AC: file present; deep links return the app under `wrangler dev`.
- [x] `[human]` Create a Cloudflare Worker connected to the GitHub repo (build `npm run build`, deploy `npx wrangler deploy`, workers.dev URL enabled). Claude provides step-by-step instructions and waits. AC: production URL loads; deep link `/settings` loads on refresh.

**Phase 00 done when:** app runs locally and on its Cloudflare URL, lint/build/test pass, routes and layouts render.

---

## PHASE 01 — DOMAIN: SHAPES, LAYOUT & PAGES (pure, tested)

> No React, no DOM, no IndexedDB in `src/domain/`. Every function has unit tests.

### Milestone 1.1 — Config, types, schemas
- [x] `[domain]` `config.ts` with `BOOK_PRESETS`, `DISPLAY_SIZES`, `SPREAD_BREAKPOINT_PX`, `IMAGE_LIMITS`, `SHELF_SETTINGS`, `STACK_SETTINGS`, `SYNC_SETTINGS` (commented). AC: single source of tunables.
- [x] `[domain]` `schemas.ts` (Zod) for `Book`, `Page`, `ImageAsset` per PRD §5, with `schemaVersion: 1`; `types.ts` infers types from schemas. AC: types exported; invalid fixture fails parse.
- [x] `[domain]` `createBook(input)` and `createPage(imageId?)` factories with sane defaults (contain, centered, scale 1, margin 0). AC: output passes schema.
- [x] `[domain]` `migrateBook(raw)` → parses + upgrades by `schemaVersion` (v1 is identity). AC: test for v1 and unknown-version error.

### Milestone 1.2 — Shape & sizing
- [x] `[domain]` `pageAspect(book)` → width/height ratio from preset or custom ratio + orientation (landscape swaps). AC: tests for every preset × orientation.
- [x] `[domain]` `computeBookSize(viewport, book, mode: 'spread'|'single')` → page width/height in px, fitting the viewport with `DISPLAY_SIZES`. AC: never exceeds viewport; ratio preserved within 1px; tests for tall/wide viewports.
- [x] `[domain]` `viewMode(viewport)` → `'spread'` above `SPREAD_BREAKPOINT_PX` and landscape-ish, else `'single'`. AC: tests.

### Milestone 1.3 — Image placement
- [x] `[domain]` `computeImagePlacement(pageSize, imageSize, page)` for `contain` / `cover` / `stretch` with margin. AC: tests incl. tall image on wide page and vice versa.
- [x] `[domain]` Extend placement with normalized transform (`x`, `y`, `scale`, `rotation`). AC: tests — same normalized transform gives proportional result at two page sizes.
- [x] `[domain]` Spread placement: an image placed across a 2-page area, returning the left-half and right-half placements. AC: halves line up exactly at the gutter.
- [x] `[domain]` `clampTransform` keeps at least part of the image on the page; `resetTransform`. AC: tests.

### Milestone 1.4 — Pages & ordering
- [x] `[domain]` `expandToRenderPages(book, mode)` → ordered render pages: front cover, inside pages, spread halves, back cover. AC: tests for books with 0, 1, odd and even pages.
- [x] `[domain]` Spread pairing: in `'spread'` mode a spread must start on a left page; insert a filler blank when needed and return a `fillersInserted` count. AC: tests for spreads at various positions.
- [x] `[domain]` `naturalSort(fileNames)` (`2.png` before `10.png`, case-insensitive). AC: tests.
- [x] `[domain]` `movePage`, `insertPage`, `removePage` pure array helpers. AC: tests.

**Phase 01 done when:** all domain tests green, `src/domain/` has zero React/DOM/storage imports, all tunables live in `config.ts`.

---

## PHASE 02 — LOCAL STORAGE & IMAGE PROCESSING

### Milestone 2.1 — Repository
- [x] `[storage]` `repository.ts`: `BookRepository` interface (coding-standards) + `BookSummary` type. AC: compiles.
- [x] `[storage]` Dexie DB: tables `books` (Book JSON), `images` (meta), `blobs` (display/thumb). AC: DB opens; version 1 defined.
- [x] `[storage]` `LocalRepository` implementing the interface; every read passes through `migrateBook`. AC: tests with `fake-indexeddb` for CRUD.
- [x] `[storage]` `deleteBook` removes its images and blobs (no orphans). AC: test confirms no orphans.
- [x] `[storage]` Request `navigator.storage.persist()` once; `getStorageUsage()` helper. AC: usage readable in console/test.

### Milestone 2.2 — Image processing
- [x] `[storage]` `image.worker.ts`: decode with `createImageBitmap`, resize to `IMAGE_LIMITS.displayMaxPx` and `thumbMaxPx` via `OffscreenCanvas`, encode WebP. AC: returns two blobs + width/height.
- [x] `[storage]` Main-thread fallback when OffscreenCanvas isn't available; `processImage(file)` picks the path. AC: works in both paths (unit-test the size math).
- [x] `[ui]` `useImageUrl(imageId, variant)` hook creating/revoking object URLs. AC: URL revoked on unmount (test).

### Milestone 2.3 — Stores
- [x] `[ui]` Zustand `libraryStore` (list/create/update/delete books via repository). AC: no direct Dexie imports outside `storage/`.
- [x] `[ui]` Zustand `bookStore` (current book, page selection, debounced `save()`). AC: rapid edits produce one write after debounce.

**Phase 02 done when:** books and images persist across reloads through `LocalRepository`; images are resized in a worker.

---

## PHASE 03 — SHELF & BOOK SETTINGS

- [ ] `[ui]` `BookCover` component: closed book at the book's true aspect — cover color/image, rounded open-edge corners, page-edge strip along the spine (thickness from `bookThickness()` in domain), soft shadow. AC: portrait, square and landscape covers look correct; thickness grows with page count.
- [ ] `[domain]` `carouselLayout(index, selectedIndex, viewport)` → x offset, scale, z-order, opacity for each cover (constants in `SHELF_SETTINGS`). AC: unit tests — selected centered and largest; neighbors peek.
- [ ] `[ui]` Shelf carousel: covers laid out via `carouselLayout`, spring-animated (Framer Motion); swipe/drag (@use-gesture), wheel and arrow keys change selection; tap neighbor selects, tap selected opens Reader. AC: smooth on touch and mouse; selection survives reload.
- [ ] `[ui]` Selected-book details: title + page count above, round action buttons beside (open, add images, edit, more), settings button on the cover corner. AC: buttons act on the selected book.
- [ ] `[ui]` Empty state with "Create your first book". AC: shows when no books.
- [ ] `[ui]` Create-book dialog: title, shape preset or custom ratio, orientation toggle, display size, cover color — with a live mini preview of the shape. AC: created book appears on shelf at correct proportions.
- [ ] `[ui]` Book settings dialog (same form) from a cover menu; rename. AC: changes persist; shelf updates.
- [ ] `[ui]` Delete book with confirm dialog naming the book. AC: book and its images gone after reload.
- [ ] `[ui]` Settings page: storage usage + persistence status. AC: shows numbers.

**Phase 03 done when:** you can create, edit and delete books of any shape, and they survive reloads.

---

## PHASE 04 — IMPORT & PAGERENDERER

### Milestone 4.1 — Renderer
- [ ] `[ui]` `PageRenderer`: given page size, page and image, draws background, margin and image using `computeImagePlacement`. No layout math in the component. AC: contain/cover/stretch fixtures render correctly.
- [ ] `[ui]` `PageRenderer` renders spread halves (left/right) using spread placement. AC: two halves side by side form a seamless image.
- [ ] `[ui]` Thumbnail variant (uses thumb blob, same placement math). AC: thumb matches full render.

### Milestone 4.2 — Import
- [ ] `[ui]` Import dropzone + file picker (multiple, image types). AC: files accepted; non-images rejected with toast.
- [ ] `[ui]` Import pipeline: naturalSort → processImage → `putImage` → append pages. AC: pages added in natural order.
- [ ] `[ui]` Progress UI (n of total) and per-file failure handling. AC: one corrupt file doesn't stop the batch; summary toast lists failures.
- [ ] `[ui]` HEIC: attempt decode; friendly message when unsupported. AC: no crash on HEIC.
- [ ] `[ui]` "Page grid" on the Reader route showing all pages via PageRenderer (becomes the grid view of the stack/grid toggle in Phase 05). AC: imported images visible.

**Phase 04 done when:** images import into a book and render correctly through the one PageRenderer.

---

## PHASE 05 — READER (SPREAD STACK, Paper style)

> No page-curl library. The stack is built with CSS 3D transforms + Framer Motion springs + @use-gesture. All stack geometry comes from the domain; `STACK_SETTINGS` holds the feel.

### Milestone 5.1 — Stack geometry (domain)
- [ ] `[domain]` `groupIntoSpreads(renderPages, mode)` → spreads (front cover alone, pairs of inside pages, back cover alone; single pages in `'single'` mode). AC: tests for odd/even books, spreads, both modes.
- [ ] `[domain]` `stackLayout(spreadIndex, currentIndex, dragProgress)` → per-spread translate, scale, z-order, opacity, visibility (only `STACK_SETTINGS.visibleLayers` each side). AC: tests — current front and full size, neighbors offset and smaller, far layers hidden, interpolates with drag.
- [ ] `[domain]` `spreadBend(dragProgress)` → per-half rotateY/rotateX and shading strength for the bowed open-book look (rest bow from `STACK_SETTINGS.restBowDeg`, more while dragging). AC: tests at progress 0, 0.5, 1.

### Milestone 5.2 — Spread rendering
- [ ] `[ui]` `OpenSpread`: two `PageRenderer`s as halves, each tilted toward the spine per `spreadBend`, crease shading gradient, rounded outer corners, shadow on the surface. AC: looks like an open book at rest; spread images join seamlessly at the crease.
- [ ] `[ui]` `SpreadStack`: renders spreads layered via `stackLayout` with edges of previous/next spreads peeking out. AC: on a 10-spread book you can see layers on both sides; layer count matches position.
- [ ] `[ui]` Responsive: size from `computeBookSize` + `viewMode`; switch spread/single on resize/rotation, keeping the current page. AC: rotate phone — same page stays in view.

### Milestone 5.3 — Motion & navigation
- [ ] `[ui]` Swipe/drag (@use-gesture) drives `dragProgress`; spread lifts, bends and slides; release past threshold or flick completes with a spring, otherwise settles back. AC: feels smooth at 60fps on a mid-range phone; no jank at stack ends.
- [ ] `[ui]` Arrow keys, click/tap left/right edges, page counter. AC: all move one spread with the same animation.
- [ ] `[ui]` Lazy images: display blobs for current spread ± 2, thumbs for visible back layers. AC: 100-page book opens fast; memory stable while swiping.

### Milestone 5.4 — Viewing
- [ ] `[ui]` Stack / grid toggle: grid of all pages (thumbs via PageRenderer); tap → return to stack at that spread with a transition. AC: jumps correctly incl. spreads and covers.
- [ ] `[ui]` Zoom view: double-click / pinch opens current page or spread full screen with pan + zoom. AC: zoom in/out, pan, close with Esc or pinch-out.
- [ ] `[ui]` Surface: background tinted from the cover color, auto-hiding controls, fullscreen toggle. AC: controls hide after idle, show on move/tap.
- [ ] `[ui]` Reduced motion: `prefers-reduced-motion` → cross-fade between spreads, no bend. AC: verified with OS setting.
- [ ] `[ui]` Remember last-opened spread per book. AC: reopen → same spread.

**Phase 05 done when:** a book opens as a bowed spread stack, swipes smoothly on desktop and phone, spreads pair correctly, and grid + zoom work. 🎉 Most of MVP-1 is now usable.

---

## PHASE 06 — PAGE EDITOR

### Milestone 6.1 — Layout
- [ ] `[ui]` Editor layout: page list (thumbs) + canvas showing the selected page at true ratio via PageRenderer + toolbar; "Done" returns to Reader. AC: selecting a thumb shows that page.

### Milestone 6.2 — Adjust a page
- [ ] `[ui]` Fit mode control (contain / cover / stretch). AC: canvas and thumb update.
- [ ] `[ui]` Drag to reposition (normalized `x`,`y` via domain), with snap-to-center. AC: position identical in Reader.
- [ ] `[ui]` Zoom (slider + wheel/pinch) and rotate (90° buttons + free slider). AC: values clamped via domain.
- [ ] `[ui]` Background color + margin controls; Reset page. AC: reset restores defaults.

### Milestone 6.3 — Manage pages
- [ ] `[ui]` Drag to reorder thumbs (dnd-kit) using `movePage`. AC: order persists.
- [ ] `[ui]` Add images (reuses import), replace image, insert blank page, remove page (confirm). AC: all persist; removed page's image deleted if unused.
- [ ] `[ui]` Make/unmake spread; show a notice when a filler page was inserted to keep pairing. AC: spread shows across two pages in Reader.

### Milestone 6.4 — Saving
- [ ] `[ui]` Autosave via `bookStore` debounce with a "Saved" indicator. AC: reload keeps edits.
- [ ] `[ui]` Undo (Ctrl/Cmd+Z, toolbar button) with a small history of book snapshots (max ~20). AC: undo restores previous transform/order.

**Phase 06 done when:** every page can be adjusted, reordered and spread, and the Reader shows exactly what the editor shows. ✅ **MVP-1 complete.**

---

## PHASE 07 — GOOGLE DRIVE SYNC

### Milestone 7.1 — Google setup & auth
- [ ] `[human]` Google Cloud project: enable Drive API + Picker API; OAuth consent screen (External, Testing, add yourself as test user); OAuth Web client ID with origins `http://localhost:5173` and the Cloudflare URL; API key restricted to Picker + your origins. Claude writes the steps in `docs/google-setup.md` and waits for the values in `.env`. AC: env values present locally and in Cloudflare.
- [ ] `[storage]` Load Google Identity Services; `googleAuth` module with token client, scope `drive.file`, token in memory only, silent re-request on expiry. AC: connect → token obtained; nothing in localStorage.
- [ ] `[ui]` Settings: Connect / Disconnect Google Drive with account email; disconnect keeps local data. AC: both work; local books untouched.

### Milestone 7.2 — Drive client & repository
- [ ] `[storage]` `driveClient`: typed fetch wrapper (auth header, JSON/multipart upload, `alt=media` download, retry/backoff on 429/5xx). AC: tests with mocked fetch.
- [ ] `[storage]` Folder management: find-or-create `Folio/` and per-book folder (`<title> — <id>`), store folder ids in `book.drive`. AC: folders appear in Drive.
- [ ] `[storage]` `DriveRepository`: save/get `book.json` (Zod-validated), upload/download display + thumb images. AC: round-trip test with mocked fetch; manual check in real Drive.

### Milestone 7.3 — Sync engine
- [ ] `[storage]` `SyncEngine` push: on local save, debounced (`SYNC_SETTINGS`) upload of changed `book.json` + new images only. AC: editing one page uploads only `book.json`.
- [ ] `[storage]` Pull: on app start and focus, list Drive books; download newer (`updatedAt`) `book.json` and missing images into LocalRepository. AC: change made on device A appears on device B after refresh.
- [ ] `[storage]` Offline & failure safety: queue pushes while offline; failures never modify local data; retry with backoff. AC: test with fake repos — failed push leaves local intact; queued push runs on reconnect.
- [ ] `[ui]` Sync status indicator (synced / syncing / offline / error) on shelf and in reader toolbar. AC: states visible and accurate.
- [ ] `[ui]` Restore flow: fresh browser + connect → books listed from Drive with thumbs; open downloads display images on demand. AC: full book restored on a second browser.

### Milestone 7.4 — Drive extras
- [ ] `[ui]` Import from Drive via Google Picker (images only, multi-select); picked files go through the normal import pipeline. AC: picked images become pages.
- [ ] `[ui]` Delete book dialog: checkbox "Also delete from Google Drive" (off by default) naming the Drive folder. AC: local-only delete leaves Drive; checked deletes Drive folder.

**Phase 07 done when:** books sync to the user's Drive, survive a cleared browser, and open on another device. ✅ **MVP-2 complete.**

---

## PHASE 08 — POLISH & HARDENING

- [ ] `[ui]` Loading skeletons and empty/error states across Shelf, Reader, Editor. AC: no blank screens or raw spinners.
- [ ] `[ui]` Accessibility pass: keyboard nav everywhere, focus rings, aria labels, focus order in shelf carousel and stack, screen-reader page announcements. AC: whole app usable by keyboard.
- [ ] `[ui]` Performance pass with a 200-page book: profile shelf, stack swipes and editor, fix re-renders. AC: smooth 60fps swiping on a mid-range phone.
- [ ] `[ui]` Storage-full handling: friendly message when IndexedDB quota is hit; suggest connecting Drive. AC: simulated quota error handled.
- [ ] `[setup]` README: what Folio is, setup, env vars, Google setup link, deploy. AC: a fresh clone can be run by following it.

**Phase 08 done when:** the app feels smooth, accessible and robust for everyday use. ✅ **MVP-3 complete.**

---

## CROSS-CUTTING (verify continuously)
- [ ] No layout math outside `src/domain/`; tunables only in `config.ts`.
- [ ] Reader and editor both use `PageRenderer` — never a second renderer.
- [ ] UI never imports Dexie or Drive code; everything goes through repositories/stores.
- [ ] Drive scope is `drive.file` only; tokens in memory only; no destructive Drive action without confirmation.
- [ ] Every persisted read goes through Zod + `migrateBook`.
- [ ] Every commit: lint + build + tests pass; domain changes carry tests.
