const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

/** Human-readable size, e.g. 1536 → "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1)
  const value = bytes / 1024 ** exponent
  const digits = exponent === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${Number(value.toFixed(digits))} ${UNITS[exponent]}`
}

/** "1 page", "12 pages". */
export function pageCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'page' : 'pages'}`
}
