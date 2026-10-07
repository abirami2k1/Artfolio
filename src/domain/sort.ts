const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/** Natural, case-insensitive order: `2.png` before `10.png`, `a.png` next to `A.png`. */
export function naturalCompare(a: string, b: string): number {
  return collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0)
}

/** Sort items by a name in natural order. Returns a new array. */
export function naturalSortBy<T>(items: readonly T[], getName: (item: T) => string): T[] {
  return [...items].sort((a, b) => naturalCompare(getName(a), getName(b)))
}

export function naturalSort(fileNames: readonly string[]): string[] {
  return naturalSortBy(fileNames, (name) => name)
}
