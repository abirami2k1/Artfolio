/** True when a key press belongs to a text field or an open modal, not to page navigation. */
export function isTypingOrModal(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  return (
    !!target?.closest?.('input, textarea, select, [contenteditable="true"]') ||
    !!document.querySelector('[aria-modal="true"]')
  )
}
