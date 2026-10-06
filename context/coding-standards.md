# Coding Standards

## Guiding principle: separate the volatile from the stable

**Tech should be handy to use and easy to change.** In Folio, the things that change often are *book presets*, *layout/fit math*, *spread pairing rules*, *image-processing limits* and *motion feel* (shelf carousel, spread stack). These live apart from the stable core (routing, storage plumbing, UI shell).

Concretely:
- All layout and book logic lives in `src/domain/` as **pure functions** (no React, no DOM, no IndexedDB, no fetch).
- All tunables live in **one config file**: `src/domain/config.ts`, e.g.

```ts
export const BOOK_PRESETS = [
  { id: 'a-series', label: 'Portrait A (1:1.414)', ratioW: 1, ratioH: 1.414 },
  { id: 'letter',   label: 'US Letter',            ratioW: 8.5, ratioH: 11 },
  { id: 'square',   label: 'Square',               ratioW: 1, ratioH: 1 },
  { id: 'picture',  label: 'Picture book 10×8',    ratioW: 10, ratioH: 8 },
] as const;

export const DISPLAY_SIZES = { fit: 0.92, large: 0.8, medium: 0.65 } as const; // share of viewport
export const SPREAD_BREAKPOINT_PX = 768;   // below → single-page view
export const IMAGE_LIMITS = { displayMaxPx: 2400, thumbMaxPx: 320, quality: 0.85, mime: 'image/webp' } as const;
export const SHELF_SETTINGS = { neighborScale: 0.85, neighborOffset: 0.62, spring: { stiffness: 260, damping: 30 } } as const;
export const STACK_SETTINGS = {
  visibleLayers: 4,        // spreads drawn on each side of the current one
  layerOffsetPx: 14,       // how far each back layer peeks out
  layerScaleStep: 0.03,    // each back layer slightly smaller
  restBowDeg: 6,           // tilt of each half toward the spine at rest
  dragBowDeg: 18,          // extra bend while dragging
  swipeThreshold: 0.35,    // share of width to complete a move
  spring: { stiffness: 300, damping: 32 },
} as const;
export const SYNC_SETTINGS = { pushDebounceMs: 3000, retryBackoffMs: [2000, 5000, 15000] } as const;
```

- Changing a preset or limit = editing one constant, not hunting through components.
- Components and stores CALL the domain; they never contain layout math.
- If a change would put layout math inside a component, stop — it belongs in the domain.

## Transforms are normalized

Page transforms are stored **resolution-independent** so a page looks identical at any screen size and in both editor and reader:
- `x`, `y`: offset of the image center as a fraction of page width/height (0 = centered).
- `scale`: multiplier on top of the fit mode (1 = exactly the fit).
- `rotation`: degrees.
- `margin`: fraction of the page's shorter side.

`computeImagePlacement(pageSizePx, imageSize, page)` → `{ left, top, width, height, rotation }` in pixels. Only the renderer converts to pixels.

## One renderer

`PageRenderer` is the single component that draws a page (image placement, background, margin, spread half). Reader and editor both use it. Editor-only handles/overlays wrap it; they never re-implement it.

## Storage adapter

```ts
interface BookRepository {
  listBooks(): Promise<BookSummary[]>;
  getBook(id: string): Promise<Book | null>;
  saveBook(book: Book): Promise<void>;
  deleteBook(id: string): Promise<void>;
  putImage(asset: ImageAssetInput): Promise<ImageAsset>;
  getImageBlob(imageId: string, variant: 'display' | 'thumb'): Promise<Blob | null>;
  deleteImage(imageId: string): Promise<void>;
}
```

- `LocalRepository` (Dexie) is the working copy the UI uses.
- `DriveRepository` implements the same shape against Drive.
- The `SyncEngine` moves data between them. UI never imports Dexie or Drive code directly.

## TypeScript
- Strict mode. No `any` (use `unknown` and narrow).
- Domain types in `src/domain/types.ts`. Zod schemas in `src/domain/schemas.ts`; types for persisted data are inferred from the schemas.
- Every `book.json` read from Drive or IndexedDB is parsed with Zod. Include `schemaVersion` and a `migrateBook()` step.

## React
- Functional components + hooks only. One job per component.
- App/UI state in Zustand stores (`src/stores/`). Keep stores thin: they call repositories and domain functions.
- Object URLs for blobs are created and revoked through one hook (`useImageUrl`) — no leaks.
- Motion: Framer Motion springs + CSS 3D transforms (`perspective`, `rotateY`). Animate only `transform` and `opacity`. All positions, scales and bend angles come from domain functions (`carouselLayout`, `stackLayout`, `spreadBend`); components just apply them.
- Gestures via @use-gesture; the gesture maps to a single `dragProgress` value that the domain turns into layout.

## Performance
- Image decoding/resizing happens in a Web Worker (`OffscreenCanvas` + `createImageBitmap`), with a main-thread fallback.
- Reader loads display images lazily (current spread ± 2); thumbnails everywhere else.
- Avoid re-rendering the whole book on a single page edit (select by page id).

## Google Drive
- Google Identity Services **token client**, scope `https://www.googleapis.com/auth/drive.file` only.
- Access tokens kept **in memory only** — never in localStorage, URLs or logs. Re-request silently when expired.
- All Drive calls in `src/storage/drive/` via a small typed fetch wrapper with retry/backoff for 429/5xx.
- Client ID comes from `VITE_GOOGLE_CLIENT_ID`; Picker API key from `VITE_GOOGLE_API_KEY`. Never commit real values; `.env.example` has placeholders.

## Styling (Tailwind v4)
- CSS-based config via `@theme` in `src/styles/globals.css`. Do NOT create `tailwind.config.js`.
- Tokens defined once:

```css
@import "tailwindcss";
@theme {
  --color-surface:  #EDE8DF;  /* linen table the book sits on */
  --color-paper:    #FBF8F2;  /* default page tint */
  --color-ink:      #2B2724;
  --color-accent:   #C2593A;  /* warm terracotta for actions */
  --color-muted:    #8C847A;
  --font-display: "Fraunces", serif;
  --font-ui: "Inter", system-ui, sans-serif;
}
```

- Calm, paper-like UI. The book is the hero; chrome stays out of the way (auto-hiding toolbars in the reader).

## File organization

```
src/
  app/            routes, layout, providers
  pages/          Shelf, Reader, Editor, Settings
  components/     shared UI (PageRenderer, OpenSpread, SpreadStack, BookCover, Thumb, Dialog, Toast…)
  features/       editor/, import/, reader/, sync/ — feature-specific components + hooks
  domain/         config.ts, types.ts, schemas.ts, layout.ts, pages.ts, sort.ts (+ *.test.ts)
  storage/        repository.ts (interface), local/ (Dexie), drive/ (Drive API), sync/ (engine)
  workers/        image.worker.ts
  stores/         Zustand stores
  styles/         globals.css
```

## Naming
- Components PascalCase; functions camelCase; constants SCREAMING_SNAKE_CASE; types PascalCase.

## Error handling
- Repository and Drive calls wrapped in try/catch and surfaced as friendly toasts.
- A failed import file or failed sync never loses local data.
- Never log tokens, image data or file contents.

## Testing
- Domain functions REQUIRE unit tests (Vitest). Changing `config.ts` values must not require test rewrites beyond fixtures that assert those values.
- Storage: test `LocalRepository` with `fake-indexeddb`; test the sync engine with an in-memory fake `BookRepository`.
- Drive: mock fetch; test request shapes, retry and Zod parsing.

## Quality
- No commented-out or dead code. No unused imports. Functions < 50 lines where reasonable.
- Lint + build + tests pass before commit.
