// Every tunable in Folio lives here. Change a number here, not in a component.

/** Page shapes offered when creating a book. Ratios are width:height in the book's natural orientation. */
export const BOOK_PRESETS = [
  { id: 'a-series', label: 'Portrait A (1:1.414)', ratioW: 1, ratioH: 1.414 },
  { id: 'letter', label: 'US Letter', ratioW: 8.5, ratioH: 11 },
  { id: 'square', label: 'Square', ratioW: 1, ratioH: 1 },
  { id: 'picture', label: 'Picture book 10×8', ratioW: 10, ratioH: 8 },
] as const

/** Preset id used when the user types their own ratio. */
export const CUSTOM_PRESET_ID = 'custom'

/** Defaults for a newly created book. */
export const BOOK_DEFAULTS = {
  title: 'Untitled book',
  presetId: 'a-series',
  displaySize: 'large',
  coverColor: '#C2593A',
  paperColor: '#FBF8F2',
  showTitle: true,
} as const

/** Share of the viewport (each axis) the open book may fill. */
export const DISPLAY_SIZES = { fit: 0.92, large: 0.8, medium: 0.65 } as const

/** At or above this viewport width (px) the reader shows two-page spreads… */
export const SPREAD_BREAKPOINT_PX = 768
/** …but only when the viewport is at least this wide relative to its height. */
export const SPREAD_MIN_VIEWPORT_ASPECT = 1

/** Limits for the per-page image transform (scale multiplies the fit size). */
export const TRANSFORM_LIMITS = {
  minScale: 0.1,
  maxScale: 8,
  /** Share of the page's content box (each axis) the image must keep covering when dragged. */
  minVisibleFraction: 0.1,
} as const

/** Image processing on import. */
export const IMAGE_LIMITS = {
  displayMaxPx: 2400,
  thumbMaxPx: 320,
  quality: 0.85,
  mime: 'image/webp',
} as const

/** Files accepted for import. HEIC is attempted, but only some browsers can decode it. */
export const IMPORT_FORMATS = {
  mimes: ['image/jpeg', 'image/png', 'image/webp'],
  extensions: ['jpg', 'jpeg', 'png', 'webp'],
  heicMimes: ['image/heic', 'image/heif'],
  heicExtensions: ['heic', 'heif'],
} as const

/** Page grid (reader route, until the stack/grid toggle in Phase 05). */
export const PAGE_GRID = { thumbWidthPx: 160 } as const

/** Shelf carousel feel. */
export const SHELF_SETTINGS = {
  neighborScale: 0.85, // size of non-selected covers relative to the selected one
  neighborOffset: 0.62, // horizontal step between covers, as a share of the cover box width
  coverBox: { widthShare: 0.5, heightShare: 0.5, maxWidthPx: 440 }, // box the selected cover fits in
  visibleNeighbors: 2, // covers drawn on each side of the selected one
  neighborOpacity: 0.9, // opacity of the nearest neighbors; further ones fade out
  flickVelocity: 0.4, // release speed (px/ms) that moves one book even below half a step
  wheelStepPx: 60, // accumulated wheel delta that moves one book
  overscroll: 0.3, // how far (in books) a drag may stretch past the first or last book
  spring: { stiffness: 260, damping: 30 },
} as const

/** Closed-book page-edge thickness, as a share of cover height. */
export const BOOK_THICKNESS = { minShare: 0.02, maxShare: 0.08, perPageShare: 0.0006 } as const

/** Swatches offered for cover colors. */
export const COVER_COLORS = [
  '#C2593A', // terracotta
  '#2F4858', // ink blue
  '#5B7553', // moss
  '#D9A441', // ochre
  '#8E4162', // plum
  '#E8DCC8', // linen
  '#2B2724', // charcoal
] as const

/** Reader spread-stack feel. */
export const STACK_SETTINGS = {
  visibleLayers: 4, // spreads drawn on each side of the current one
  layerOffsetPx: 14, // how far each back layer peeks out
  layerScaleStep: 0.03, // each back layer slightly smaller
  restBowDeg: 6, // tilt of each half toward the spine at rest
  dragBowDeg: 18, // extra bend while dragging
  swipeThreshold: 0.35, // share of width to complete a move
  spring: { stiffness: 300, damping: 32 },
} as const

/** Delay after the last edit before the open book is written to storage. */
export const AUTOSAVE_DEBOUNCE_MS = 800

/** Google Drive sync timing. */
export const SYNC_SETTINGS = {
  pushDebounceMs: 3000,
  retryBackoffMs: [2000, 5000, 15000],
} as const
