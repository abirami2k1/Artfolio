# Folio — Build Plan (ordered)

> **To execute the build, use `TASKLIST.md`** — the detailed one-item-at-a-time checklist. This README is the high-level map and dependency table behind it.

Build **strictly top to bottom**. Do not pull future work forward. At every stage the app should run and be deployable.

## Why this order

Foundation first → then the **pure domain** (sizes, layout, spread pairing — logic with no UI, fully testable) → then **local storage** so data exists → then the screens that create and show that data (**shelf → import → reader → editor**) → then **Drive sync** on top of a working local app → then polish.

Drive comes last on purpose: you never debug Google sign-in while you're still figuring out how the spread stack should feel, and the app is useful (and safe) even if Drive is never connected.

## MVP milestones

| Milestone | Phases | You can… |
|---|---|---|
| **MVP-1 · Local flipbook** | 00–06 | Create books of any shape, import images, adjust pages, swipe through them as a Paper-style spread stack — all in the browser |
| **MVP-2 · Drive sync** | 07 | Keep books safe in your own Google Drive and open them on another device |
| **MVP-3 · Polish** | 08 | Everyday-ready: smooth, accessible, fast with big books |

## Phases

| # | Phase | Depends on | Outcome |
|---|---|---|---|
| 00 | Scaffolding, shell & deploy | — | App runs locally and on Cloudflare Pages |
| 01 | Domain: shapes, layout, pages | 00 | Pure, tested functions for all book math |
| 02 | Local storage & image processing | 01 | Books + images persist in IndexedDB via `BookRepository` |
| 03 | Shelf & book settings | 02 | Paper-style carousel; create / edit / delete books of any shape |
| 04 | Import & PageRenderer | 02, 03 | Images become pages, drawn by the shared renderer |
| 05 | Reader (spread stack) | 01, 04 | Swipe through bowed open spreads stacked like Paper; grid + zoom |
| 06 | Page editor | 04, 05 | Adjust, reorder, spread pages; autosave |
| 07 | Google Drive sync | 02–06 | Local-first sync to the user's Drive, restore, Picker |
| 08 | Polish & hardening | all | Performance, accessibility, empty/error states |

## Open decisions (see PRD §7)
- **Reader style** — decided: Paper-style spread stack only for MVP (no page curl). Curl is a possible future option.
- **Bowed look** — 3D tilt + crease shading first; subtle warp later only if needed.
- **Spreads on mobile** — default: two halves on consecutive pages + zoom to see whole spread.
- **HEIC** — best effort; skip with a friendly message if the browser can't decode.
