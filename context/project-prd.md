# Folio — Project Overview & Product Requirements (PRD)

📖 *A quiet place to flip through illustrations, one page at a time.*

> This document is the "why" and the "what". For "how we code", see coding-standards.md. For scope, see features.md. For build order, see tasks/README.md and tasks/TASKLIST.md.

---

## 1. Why this exists

Illustrations in books are designed as pages and spreads, with a rhythm you only feel when you turn them. A folder of images in a gallery app loses that. Paper by WeTransfer gets the feeling right with its book view, but it's an iOS drawing app, not a place to bind your own collections.

Folio lets me upload illustrations, bind them into books shaped the way I want, and swipe through them as a stack of open spreads, like Paper's journals — on any device, in a browser, for free.

---

## 2. Principles

- **The artwork comes first.** The spread stack is the charm; seeing the illustration clearly (zoom, spreads, a calm surface) is the point.
- **Feels physical.** Bowed open spreads, stacked pages you can see, page-edge thickness, soft shadows, springy motion. Small details matter more than extra features.
- **Zero running cost.** No backend, no paid storage. Static hosting + the user's own Google Drive.
- **Local-first.** The app works fully without signing in. Drive is sync and backup, not a requirement.
- **Non-destructive.** Original images are never altered by layout edits; adjustments are stored as data.
- **Built to change.** Presets, layout rules and motion settings are tunable in one place.

---

## 3. Users

| Persona | Need |
| --- | --- |
| Me (primary) | Bind my illustration collections into books and browse them beautifully |
| Illustrator / artist | Preview a picture book or portfolio as an actual book |
| Collector | Keep scanned pages of favorite illustrated books in a browsable form (personal use) |

MVP is single-user, personal use. Sharing books with others is future work.

---

## 4. Product requirements

### 4.1 Shelf (home) — inspired by Paper's journal carousel
- Books shown as closed covers in a **horizontal carousel** on a soft surface. The selected book is centered and slightly larger; neighbors peek in at the sides. Swipe, drag, scroll or arrow keys move between books.
- Each closed book is drawn at its real proportions (a tall book looks tall, a wide one wide), with rounded corners on the open edge, a strip of page edges along the spine whose thickness reflects the page count, and a soft shadow.
- The selected book shows its **title and page count** above it, and a column of **round action buttons** beside it: open, add images, edit, more (settings, delete). A small settings button sits on the cover corner.
- Tap the selected book to open it; tap a neighbor to select it.
- Create, rename, edit settings, delete (with confirmation).
- Empty state that invites creating the first book.

### 4.2 Book settings (per book, chosen at creation, editable later)
- **Page shape:** presets (Portrait A-series 1:1.414, US Letter 8.5:11, Square 1:1, Picture book 10:8, Custom ratio).
- **Orientation:** portrait or landscape (swaps the ratio).
- **Display size:** how much of the screen the book fills (Fit / Large / Medium).
- **Binding:** left (MVP). Right-to-left and top binding are future.
- **Look:** cover color or cover image, paper tint, title on cover.

### 4.3 Importing images
- Drag-and-drop or file picker, multiple images at once (JPEG, PNG, WebP, HEIC where the browser supports it).
- Images are added as pages in natural filename order (`2.png` before `10.png`).
- On import, each image is downscaled to a display size and a thumbnail is generated, to keep storage small and swiping fast.
- Progress indicator for large imports; a failed file doesn't stop the rest.

### 4.4 Reader — the "spread stack" (Paper style)
The reader is **not** a page-curl flip. It works like Paper's journal view:
- **Each spread is an open book.** The two pages are drawn bowed toward the spine (each half tilted slightly in 3D, with soft shading at the crease), with rounded outer corners and a soft shadow on the surface.
- **The other spreads are stacked behind it.** Previous spreads peek out on one side and upcoming spreads on the other, offset and slightly smaller, so you can see where you are in the book and how much is left. Only a few layers are drawn on each side.
- **Swipe to move.** Dragging lifts and bends the current spread and slides it off, revealing the next one underneath; releasing past a threshold (or flicking) completes the move with a spring, otherwise it settles back. Click/tap edges and arrow keys do the same.
- The book opens on the front cover as the first card of the stack and ends on the back cover.
- Two-page spreads on wide screens; single bowed pages on narrow/portrait screens (same stack behavior).
- **Stack / grid toggle:** a grid of all pages (thumbnails); tap one to jump back into the stack at that spread.
- Page counter; double-click / pinch opens a zoom view of the current page or spread with pan.
- Background softly tinted from the book's cover color; distraction-free, auto-hiding controls, fullscreen.
- `prefers-reduced-motion` → simple cross-fade, no bending.

Page curl (turning a page around the spine like an e-reader) is a possible future per-book option, not MVP.

### 4.5 Page editor
- Separate Edit mode. Page thumbnails on one side, the selected page on a canvas at the book's true ratio.
- Per page: fit mode (contain / cover / stretch), drag to reposition, zoom, rotate (90° steps + free), background color, margin, reset.
- Add, remove, replace image; insert blank page; drag to reorder.
- **Spread:** mark an image to span both pages of a spread. The app keeps spreads correctly paired (left half on a left page) and inserts filler pages when needed, telling the user.
- Changes autosave.

### 4.6 Google Drive sync
- Optional "Connect Google Drive". Uses the `drive.file` scope only: the app sees files it created or that the user picked, nothing else.
- Drive layout: a `Folio/` folder → one folder per book → `book.json` + `images/` + `thumbs/`.
- Local-first sync: IndexedDB is the working copy; changes are pushed to Drive (debounced); on load, newer Drive versions are pulled. Single user, so last-write-wins by `updatedAt` is acceptable for MVP.
- Import existing images from Drive with the Google Picker.
- Shows sync status (synced / syncing / offline / error) and works offline.
- Disconnect leaves local data intact. Deleting a book asks separately whether to also remove it from Drive.

---

## 5. Data model (draft — will evolve)

```
Book        — id, schemaVersion, title, shape {presetId, ratioW, ratioH},
              orientation (portrait|landscape), displaySize (fit|large|medium),
              binding ('left'), cover {color, imageId?, showTitle},
              paperColor, pages: Page[], createdAt, updatedAt,
              drive? {folderId, fileId, syncedAt}
Page        — id, kind ('image'|'blank'|'spread'), imageId?,
              fit (contain|cover|stretch),
              transform {x, y, scale, rotation},   // normalized, see coding-standards
              background, margin                    // margin as fraction of page size
ImageAsset  — id, bookId, width, height, mime, bytes, sourceName,
              displayBlobKey, thumbBlobKey, drive? {fileId, thumbFileId}
```

`book.json` in Drive is the serialized `Book` (validated by Zod on read). Image blobs live in IndexedDB locally and as files in Drive.

**Render pages vs. stored pages:** a stored `spread` page expands into two render pages (left half, right half) at render time. `expandToRenderPages(book)` in the domain does this, plus cover/back-cover and filler handling. Nothing else does.

---

## 6. Tech stack

| Layer | Choice |
| --- | --- |
| App | React + Vite + TypeScript (strict) |
| Styling | Tailwind CSS v4 (`@theme` in CSS) |
| State | Zustand (UI/app state) |
| Local storage | IndexedDB via Dexie |
| Motion | Framer Motion (springs) + CSS 3D transforms for the shelf carousel and spread stack — no page-flip library |
| Gestures | @use-gesture/react (editor drag/pinch, zoom view) |
| Reorder | dnd-kit |
| Validation | Zod (book.json, imports) |
| Cloud storage | Google Drive API v3 via fetch + Google Identity Services (token client) + Google Picker |
| Tests | Vitest (+ fake-indexeddb, Testing Library where useful) |
| Hosting | Cloudflare Workers static assets (free), SPA fallback via `wrangler.jsonc` (`not_found_handling: single-page-application`) |

Decisions locked: stack-only reader for MVP (no page curl); no backend; `drive.file` scope only; local-first; one shared `PageRenderer`.

---

## 7. Open decisions ⚠️

- **Bowed-spread look.** Built by tilting each half in 3D plus crease shading. If that doesn't read as "open book" enough, a later option is a subtle warp (SVG/WebGL). Revisit after Phase 05.
- **Spreads on single-page (mobile) view.** Default: show the two halves on consecutive pages, with zoom to see the whole spread. Revisit after using it.
- **HEIC import.** Depends on browser support; may need a decoder library or be dropped.
- **Google OAuth app status.** Personal use can stay in "Testing" mode (manually added test users). Publishing for other users needs Google's review of the consent screen.

---

## 8. Out of scope (future)

Public share links · PDF import · right-to-left and top (calendar) binding · page-curl reading mode · bookmarks & page notes · page sound · multi-device conflict resolution beyond last-write-wins · export book as PDF/ZIP · collaborative books · PWA install/offline-first polish beyond basics.

---

## 9. Success

Opening a book in Folio feels like opening a real book, and I actually reach for it when I want to look at illustrations.
