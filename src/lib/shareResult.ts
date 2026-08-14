import {
  downloadResultImage,
  formatDateLabel,
  formatFilenameDate,
  playerNote,
  renderResultImage,
} from './exportImage'
import { formatVND } from './format'
import type { CalcResult, Mode, Player } from './types'

/**
 * Plain-text twin of the PNG image: header + one line per player with a
 * paid mark. Deliberately excludes tổng thu / số dư / tổng chi.
 */
export function formatResultText(
  result: CalcResult,
  mode: Mode,
  dateLabel: string,
  players: Player[],
): string {
  const paidById = new Map(players.map((p) => [p.id, p.paid]))
  const lines = result.players.map((p) => {
    const mark = paidById.get(p.playerId) ? '✓' : '○'
    return `${mark} ${p.name} (${playerNote(mode, p)}): ${formatVND(p.amount)}`
  })
  return [`🏸 Tính tiền cầu lông ${dateLabel}`, ...lines].join('\n')
}

/**
 * Synchronous canvas → File. toBlob is async and iOS Safari can drop the
 * user-activation while awaiting it, which makes navigator.share throw —
 * so decode a data URL instead.
 */
export function canvasToPngFile(canvas: HTMLCanvasElement, filename: string): File {
  const base64 = canvas.toDataURL('image/png').split(',')[1]
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new File([bytes], filename, { type: 'image/png' })
}

export type ShareOutcome = 'shared' | 'cancelled' | 'downloaded'

export async function shareResultImage(
  result: CalcResult,
  mode: Mode,
  players: Player[],
  date: Date = new Date(),
): Promise<ShareOutcome> {
  const canvas = renderResultImage(result, mode, formatDateLabel(date), players)
  const file = canvasToPngFile(canvas, `tinh-tien-cau-long-${formatFilenameDate(date)}.png`)
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Tính tiền cầu lông' })
      return 'shared'
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return 'cancelled'
      // real failure (permissions, etc.) — fall through to download
    }
  }
  downloadResultImage(result, mode, players, date)
  return 'downloaded'
}

export async function copyResultText(
  result: CalcResult,
  mode: Mode,
  players: Player[],
  date: Date = new Date(),
): Promise<boolean> {
  const text = formatResultText(result, mode, formatDateLabel(date), players)
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
