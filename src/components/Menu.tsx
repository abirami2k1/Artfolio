import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export interface MenuItem {
  label: string
  onSelect(): void
  destructive?: boolean
}

interface MenuProps {
  label: string
  items: MenuItem[]
  trigger: ReactNode
  triggerClassName?: string
}

/** Button that opens a small list of actions; closes on choice, outside click or Esc. */
function Menu({ label, items, trigger, triggerClassName }: MenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function onKeyDown(event: KeyboardEvent) {
    if (!open) return
    const menuItems = [
      ...(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
    ]
    const index = menuItems.indexOf(document.activeElement as HTMLElement)
    if (event.key === 'Escape') setOpen(false)
    else if (event.key === 'ArrowDown') menuItems[(index + 1) % menuItems.length]?.focus()
    else if (event.key === 'ArrowUp')
      menuItems[(index - 1 + menuItems.length) % menuItems.length]?.focus()
    else return
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          ref={listRef}
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full z-30 mt-2 min-w-44 rounded-xl bg-paper p-1.5 shadow-lg ring-1 ring-ink/10"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface focus:bg-surface focus:outline-none ${item.destructive ? 'text-accent' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default Menu
