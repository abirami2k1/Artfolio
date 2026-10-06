# Folio — Features List

Source of truth for scope. Grouped by area. Each maps to a phase in @tasks/README.md.
Status: ✅ in MVP · 🕓 future · ⚠️ has open decisions.

---

## 1. Foundation
- ✅ Project scaffolding (Vite + React + TS strict, Tailwind v4 tokens, lint, Vitest)
- ✅ App shell + routing: Shelf (`/`), Reader (`/book/:id`), Editor (`/book/:id/edit`), Settings (`/settings`)
- ✅ Free static hosting (Cloudflare Pages) with SPA fallback

## 2. Domain (pure logic, tested)
- ✅ Book shape presets + orientation → page aspect ratio
- ✅ Book display sizing to fit any viewport, preserving ratio
- ✅ Image placement math (contain / cover / stretch + transform)
- ✅ Render-page expansion (covers, spreads, filler pages, spread pairing)
- ✅ Natural filename sort for imports

## 3. Local storage
- ✅ IndexedDB (Dexie) for books + image blobs
- ✅ `BookRepository` interface + local implementation
- ✅ Image processing on import: downscale + thumbnail (Web Worker)
- ✅ Storage usage indicator; persistent-storage request

## 4. Shelf
- ✅ Horizontal carousel of closed books (Paper style) at true proportions, with page-edge thickness
- ✅ Selected book: title + page count, round action buttons, cover settings button
- ✅ Create book (title, shape preset, orientation, display size, cover color)
- ✅ Edit settings, rename, delete (confirmed)
- ✅ Empty state

## 5. Import
- ✅ Drag-and-drop + file picker, multiple files
- ✅ Natural order, progress, per-file failure doesn't abort the batch
- ⚠️ HEIC support depends on browser / decoder

## 6. Reader
- ✅ Spread stack (Paper style): bowed open spreads, previous/next spreads stacked behind
- ✅ Swipe/drag with spring physics, tap edges, arrow keys
- ✅ Crease shading, rounded corners, soft shadows, background tinted from cover
- ✅ Two-page spread on wide screens, single page on narrow
- ✅ Page counter + stack/grid toggle (grid to jump)
- ✅ Zoom view (double-click / pinch, pan)
- ✅ Fullscreen, distraction-free surface, reduced-motion fallback
- ⚠️ Bowed look via 3D tilt + shading; subtle warp later if needed

## 7. Page editor
- ✅ Edit mode with page list + canvas at true ratio
- ✅ Fit mode, drag reposition, zoom, rotate (90° + free), background, margin, reset
- ✅ Add / remove / replace image, insert blank page
- ✅ Drag to reorder pages (dnd-kit)
- ✅ Spread pages (image across two pages) with auto pairing + filler notice
- ✅ Autosave + undo
- ⚠️ Spread behavior on single-page (mobile) view

## 8. Google Drive sync
- ✅ Connect / disconnect Google (GIS token client, `drive.file` scope)
- ✅ Drive folder layout: `Folio/<book>/book.json, images/, thumbs/`
- ✅ `DriveRepository` + local-first sync engine (push debounced, pull newer, last-write-wins)
- ✅ Sync status indicator; offline-safe
- ✅ Restore books from Drive on a new device/browser
- ✅ Import images from Drive via Google Picker
- ✅ Delete book: separate, explicit choice to remove from Drive

---

## Future (not MVP)
🕓 Share link to a book · PDF import · right-to-left & top (calendar) binding · page-curl reading mode · bookmarks & page notes · page sound · export book as PDF/ZIP · shelf sorting/tags · multi-device conflict UI · PWA install & offline polish · collaborative books
