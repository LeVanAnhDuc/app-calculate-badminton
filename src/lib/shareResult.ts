import {
  buildQRItems,
  downloadResultImage,
  extraShareLine,
  formatDateLabel,
  formatFilenameDate,
  playerNote,
  renderResultImage,
} from './exportImage'
import { formatVND } from './format'
import { loadCollectorAccount } from './storage'
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
  const lines = result.players.flatMap((p) => {
    const mark = paidById.get(p.playerId) ? '✓' : '○'
    return [
      `${mark} ${p.name} (${playerNote(mode, p)}): ${formatVND(p.amount)}`,
      // v1.4.0 sessions have no extras → no child lines, and playerNote still
      // carries the "· + N phát sinh" suffix, so the text is byte-identical
      ...p.extras.map((x) => `   ${extraShareLine(x)}`),
    ]
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
  let file: File
  try {
    // The QR grid rides along in the shared image too. renderResultImage is
    // async (QR rasterization), which spends a slice of the user-activation
    // window before navigator.share — QR drawing is a few ms, well inside
    // Safari's transient-activation budget, unlike the toBlob wait above.
    const qrItems = buildQRItems(result, players, loadCollectorAccount(), date)
    const canvas = await renderResultImage(result, mode, formatDateLabel(date), players, qrItems)
    file = canvasToPngFile(canvas, `tinh-tien-cau-long-${formatFilenameDate(date)}.png`)
  } catch {
    try {
      await downloadResultImage(result, mode, players, date)
    } catch {
      // both render paths failed (e.g. canvas blocked) — nothing else to try
    }
    return 'downloaded'
  }
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Tính tiền cầu lông' })
      return 'shared'
    } catch (e) {
      if ((e as { name?: string } | null)?.name === 'AbortError') return 'cancelled'
      // real failure (permissions, etc.) — fall through to download
    }
  }
  await downloadResultImage(result, mode, players, date)
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
