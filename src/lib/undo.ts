import { toast } from 'sonner'

/**
 * Re-inserts `item` back into `list` at `index`.
 *
 * The list may have changed since the item was removed, so the index is
 * clamped to the current length — an item whose old slot no longer exists
 * lands at the end instead of being dropped.
 */
export function insertAt<T>(list: T[], index: number, item: T): T[] {
  const at = Math.max(0, Math.min(index, list.length))
  return [...list.slice(0, at), item, ...list.slice(at)]
}

/**
 * Shows a toast with a "Hoàn tác" action instead of asking for confirmation
 * up front — the destructive action already happened and can be taken back
 * for as long as the toast is on screen.
 */
export function toastUndo(message: string, onUndo: () => void) {
  return toast(message, {
    duration: 6000,
    action: {
      label: 'Hoàn tác',
      onClick: onUndo,
    },
  })
}
