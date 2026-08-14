import QRCode from 'qrcode'
import { formatVND } from './format'
import { loadCollectorAccount, type CollectorAccount } from './storage'
import { formatHours } from './time'
import type { CalcResult, ExtraShare, Mode, Player, PlayerResult } from './types'
import { buildMemo, buildVietQRPayload } from './vietqr'

const SCALE = 2
const WIDTH = 800
const PADDING = 24
const HEADER_HEIGHT = 90
const ROW_HEIGHT = 64 // still exactly two lines of text (name y+28, note y+48)
const EXTRA_LINE_HEIGHT = 20 // = the name → note gap (48 − 28)
const EXTRA_INDENT = 12 // matches the web's pl-3
const FOOTER_HEIGHT = 44
const PAID_ICON_WIDTH = 22
const QR_COLS = 3
const QR_SIZE = 180
const QR_CELL_W = (WIDTH - PADDING * 2) / QR_COLS
const QR_CELL_H = QR_SIZE + 60 // QR + name + amount lines
const QR_TITLE_H = 56

/** Rows grow with the number of itemised extras instead of being fixed. */
function rowHeight(p: PlayerResult): number {
  return ROW_HEIGHT + p.extras.length * EXTRA_LINE_HEIGHT
}

/** One itemised extra as a single line — shared with shareResult.ts. */
export function extraShareLine(x: ExtraShare): string {
  const who = x.sharedCount > 1 ? ` (chung, ${x.sharedCount} người)` : ''
  return `· ${x.label}${who} ${formatVND(x.share)}`
}

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

export interface QRItem {
  name: string
  amount: number
  payload: string
}

/** QR cho người CHƯA trả — không có tài khoản người thu thì không có QR nào. */
export function buildQRItems(
  result: CalcResult,
  players: Player[],
  account: CollectorAccount | null,
  date: Date,
): QRItem[] {
  if (!account) return []
  const paidById = new Map(players.map((p) => [p.id, p.paid]))
  return result.players
    .filter((p) => !(paidById.get(p.playerId) ?? false))
    .map((p) => ({
      name: p.name,
      amount: p.amount,
      payload: buildVietQRPayload({
        bankBin: account.bankBin,
        accountNo: account.accountNo,
        amount: p.amount,
        memo: buildMemo(date, p.name),
      }),
    }))
}

export function qrSectionHeight(count: number): number {
  if (count === 0) return 0
  return QR_TITLE_H + Math.ceil(count / QR_COLS) * QR_CELL_H
}

export function playerNote(mode: Mode, p: CalcResult['players'][number]): string {
  const genderLabel = p.gender === 'male' ? 'Nam' : 'Nữ'
  const base =
    mode === 'ratio' && p.halfSession
      ? `${genderLabel} · ½ buổi`
      : mode === 'hourly' && p.hours !== null
        ? `${genderLabel} · ${formatHours(p.hours)}`
        : genderLabel
  // Each extra already has its own line → do not repeat the total here. The
  // suffix survives only for v1.4.0 data (extrasTotal but no extras).
  return p.extras.length === 0 && p.extrasTotal > 0
    ? `${base} · + ${formatVND(p.extrasTotal)} phát sinh`
    : base
}

/**
 * Draws the shareable result image on a hand-drawn canvas (no chart/image
 * libraries). Deliberately excludes tổng thu / số dư / tổng chi — only
 * per-player amounts are shown.
 */
export async function renderResultImage(
  result: CalcResult,
  mode: Mode,
  dateLabel: string,
  players: Player[],
  qrItems: QRItem[] = [],
): Promise<HTMLCanvasElement> {
  const paidById = new Map(players.map((p) => [p.id, p.paid]))
  const height =
    HEADER_HEIGHT +
    result.players.reduce((s, p) => s + rowHeight(p), 0) +
    qrSectionHeight(qrItems.length) +
    FOOTER_HEIGHT

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

  // player rows — y accumulates each row's OWN height
  let y = HEADER_HEIGHT
  result.players.forEach((p, i) => {
    const h = rowHeight(p)
    if (i % 2 === 1) {
      ctx.fillStyle = GRAY_50
      ctx.fillRect(0, y, WIDTH, h) // the zebra stripe covers the whole tall row
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

    // same font/colour as the note line; bottom padding is preserved: the last
    // baseline sits at 48 + 20n and the row ends at 64 + 20n → still 16px
    p.extras.forEach((x, k) => {
      ctx.fillText(extraShareLine(x), nameX + EXTRA_INDENT, y + 48 + (k + 1) * EXTRA_LINE_HEIGHT)
    })

    ctx.textAlign = 'right'
    ctx.fillStyle = GRAY_900
    ctx.font = 'bold 20px sans-serif'
    // deliberately keyed off the ORIGINAL ROW_HEIGHT so the amount stays level
    // with the name instead of drifting to the middle of a tall row
    ctx.fillText(formatVND(p.amount), WIDTH - PADDING, y + ROW_HEIGHT / 2 + 7)
    y += h
  })

  // QR section — "Quét QR để trả tiền" (unpaid players only). `y` is the
  // accumulated bottom of the variable-height player rows.
  if (qrItems.length > 0) {
    const sectionY = y
    ctx.textAlign = 'left'
    ctx.fillStyle = GRAY_900
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText('Quét QR để trả tiền', PADDING, sectionY + 34)
    for (let i = 0; i < qrItems.length; i++) {
      const item = qrItems[i]
      const col = i % QR_COLS
      const row = Math.floor(i / QR_COLS)
      const cellX = PADDING + col * QR_CELL_W
      const cellY = sectionY + QR_TITLE_H + row * QR_CELL_H
      const qrCanvas = document.createElement('canvas')
      await QRCode.toCanvas(qrCanvas, item.payload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: QR_SIZE * SCALE,
      })
      ctx.drawImage(qrCanvas, cellX + (QR_CELL_W - QR_SIZE) / 2, cellY, QR_SIZE, QR_SIZE)
      ctx.textAlign = 'center'
      ctx.fillStyle = GRAY_900
      ctx.font = 'bold 16px sans-serif'
      ctx.fillText(item.name, cellX + QR_CELL_W / 2, cellY + QR_SIZE + 20)
      ctx.font = '15px sans-serif'
      ctx.fillStyle = GRAY_500
      ctx.fillText(formatVND(item.amount), cellX + QR_CELL_W / 2, cellY + QR_SIZE + 40)
    }
  }

  // footer
  ctx.textAlign = 'center'
  ctx.fillStyle = GRAY_400
  ctx.font = '13px sans-serif'
  ctx.fillText('Chia bằng app Tính tiền cầu lông', WIDTH / 2, height - FOOTER_HEIGHT / 2 + 4)

  return canvas
}

export async function downloadResultImage(
  result: CalcResult,
  mode: Mode,
  players: Player[],
  date: Date = new Date(),
): Promise<void> {
  const qrItems = buildQRItems(result, players, loadCollectorAccount(), date)
  const canvas = await renderResultImage(result, mode, formatDateLabel(date), players, qrItems)
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
