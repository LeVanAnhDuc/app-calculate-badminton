import { formatVND } from './format'
import { formatHours } from './time'
import type { CalcResult, Mode, Player } from './types'

const SCALE = 2
const WIDTH = 800
const PADDING = 24
const HEADER_HEIGHT = 90
const ROW_HEIGHT = 64
const FOOTER_HEIGHT = 44
const PAID_ICON_WIDTH = 22

const EMERALD_600 = '#059669'
const GRAY_50 = '#f9fafb'
const GRAY_300 = '#d1d5db'
const GRAY_400 = '#9ca3af'
const GRAY_500 = '#6b7280'
const GRAY_900 = '#111827'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** "13/08/2026" — used as the human-readable date printed inside the image */
export function formatDateLabel(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`
}

/** "2026-08-13" — used for the downloaded filename */
export function formatFilenameDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function playerNote(mode: Mode, p: CalcResult['players'][number]): string {
  const genderLabel = p.gender === 'male' ? 'Nam' : 'Nữ'
  if (mode === 'ratio' && p.halfSession) return `${genderLabel} · ½ buổi`
  if (mode === 'hourly' && p.hours !== null) return `${genderLabel} · ${formatHours(p.hours)}`
  return genderLabel
}

/**
 * Draws the shareable result image on a hand-drawn canvas (no chart/image
 * libraries). Deliberately excludes tổng thu / số dư / tổng chi — only
 * per-player amounts are shown.
 */
export function renderResultImage(
  result: CalcResult,
  mode: Mode,
  dateLabel: string,
  players: Player[],
): HTMLCanvasElement {
  const paidById = new Map(players.map((p) => [p.id, p.paid]))
  const rowCount = result.players.length
  const height = HEADER_HEIGHT + rowCount * ROW_HEIGHT + FOOTER_HEIGHT

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH * SCALE
  canvas.height = height * SCALE
  canvas.style.width = `${WIDTH}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.scale(SCALE, SCALE)

  // background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, WIDTH, height)

  // header bar
  ctx.fillStyle = EMERALD_600
  ctx.fillRect(0, 0, WIDTH, HEADER_HEIGHT)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 26px sans-serif'
  ctx.fillText('🏸 Tính tiền cầu lông', PADDING, 40)
  ctx.font = '16px sans-serif'
  ctx.fillText(dateLabel, PADDING, 68)

  // player rows
  result.players.forEach((p, i) => {
    const y = HEADER_HEIGHT + i * ROW_HEIGHT
    if (i % 2 === 1) {
      ctx.fillStyle = GRAY_50
      ctx.fillRect(0, y, WIDTH, ROW_HEIGHT)
    }

    const paid = paidById.get(p.playerId) ?? false
    ctx.textAlign = 'left'
    ctx.fillStyle = paid ? EMERALD_600 : GRAY_300
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText(paid ? '✓' : '○', PADDING, y + 28)

    const nameX = PADDING + PAID_ICON_WIDTH
    ctx.fillStyle = GRAY_900
    ctx.font = 'bold 20px sans-serif'
    ctx.fillText(p.name, nameX, y + 28)

    ctx.fillStyle = GRAY_500
    ctx.font = '14px sans-serif'
    ctx.fillText(playerNote(mode, p), nameX, y + 48)

    ctx.textAlign = 'right'
    ctx.fillStyle = GRAY_900
    ctx.font = 'bold 20px sans-serif'
    ctx.fillText(formatVND(p.amount), WIDTH - PADDING, y + ROW_HEIGHT / 2 + 7)
  })

  // footer
  ctx.textAlign = 'center'
  ctx.fillStyle = GRAY_400
  ctx.font = '13px sans-serif'
  ctx.fillText('Chia bằng app Tính tiền cầu lông', WIDTH / 2, height - FOOTER_HEIGHT / 2 + 4)

  return canvas
}

export function downloadResultImage(
  result: CalcResult,
  mode: Mode,
  players: Player[],
  date: Date = new Date(),
): void {
  const canvas = renderResultImage(result, mode, formatDateLabel(date), players)
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tinh-tien-cau-long-${formatFilenameDate(date)}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 'image/png')
}
