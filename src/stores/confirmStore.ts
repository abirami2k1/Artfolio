import { create } from 'zustand'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void
}

interface ConfirmState {
  pending: PendingConfirm | null
  ask: (options: ConfirmOptions) => Promise<boolean>
  settle: (confirmed: boolean) => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  pending: null,
  ask: (options) => {
    get().pending?.resolve(false)
    return new Promise<boolean>((resolve) => set({ pending: { ...options, resolve } }))
  },
  settle: (confirmed) => {
    get().pending?.resolve(confirmed)
    set({ pending: null })
  },
}))

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().ask(options)
}
