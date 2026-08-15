import QRCode from 'qrcode'
import { findBank } from './banks'
import {
  EMERALD_600,
  GRAY_400,
  GRAY_500,
  GRAY_900,
  SCALE,
  formatDateLabel,
  formatFilenameDate,
} from './exportImage'
import { formatVND } from './format'
import { canvasToPngFile, type ShareOutcome } from './shareResult'
import type { CollectorAccount } from './storage'
import { buildMemo, buildVietQRPayload, normalizeMemo } from './vietqr'

export interface QRCardInput {
  playerName: string
  amount: number
  memoDate: Date
  account: CollectorAccount
}

// Hẹp hơn ảnh kết quả 800px — thẻ một người vừa khung chat Zalo/Messenger hơn.
const WIDTH = 600
const HEADER_H = 76
const QR_SIZE = 320
const QR_TOP = HEADER_H + 112
const FOOTER_H = 44

/** "qr-duc-2026-08-15.png" — tên đã bỏ dấu, nối bằng gạch nối. */
export function qrCardFilename(playerName: string, date: Date): string {
  const slug = normalizeMemo(playerName)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  // tên rỗng sau khi làm sạch (vd toàn emoji) → không để lại gạch nối đúp
  return `qr-${slug ? `${slug}-` : ''}${formatFilenameDate(date)}.png`
}

/** Thẻ QR dọc của MỘT người chơi, vẽ tay trên canvas. */
export async function renderQRCard(input: QRCardInput): Promise<HTMLCanvasElement> {
  const { playerName, amount, memoDate, account } = input
  const memo = buildMemo(memoDate, playerName)
  const payload = buildVietQRPayload({
    bankBin: account.bankBin,
    accountNo: account.accountNo,
    amount,
    memo,
  })

  const memoY = QR_TOP + QR_SIZE + 32
  const bankY = memoY + 24
  // Thẻ không có tên chủ TK thấp hơn đúng 22px — điểm test được mà không cần canvas thật.
  const nameY = account.accountName ? bankY + 22 : bankY
  const height = nameY + 20 + FOOTER_H

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH * SCALE
  canvas.height = height * SCALE
  canvas.style.width = `${WIDTH}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.scale(SCALE, SCALE)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, WIDTH, height)

  // header bar
  ctx.fillStyle = EMERALD_600
  ctx.fillRect(0, 0, WIDTH, HEADER_H)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 24px sans-serif'
  ctx.fillText('🏸 Tính tiền cầu lông', WIDTH / 2, 34)
  ctx.font = '15px sans-serif'
  ctx.fillText(formatDateLabel(memoDate), WIDTH / 2, 58)

  ctx.fillStyle = GRAY_900
  ctx.font = 'bold 30px sans-serif'
  ctx.fillText(playerName, WIDTH / 2, HEADER_H + 44)

  ctx.fillStyle = EMERALD_600
  ctx.font = 'bold 38px sans-serif'
  ctx.fillText(formatVND(amount), WIDTH / 2, HEADER_H + 90)

  // QR đã kèm sẵn số tiền + nội dung CK
  const qrCanvas = document.createElement('canvas')
  await QRCode.toCanvas(qrCanvas, payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: QR_SIZE * SCALE,
  })
  ctx.drawImage(qrCanvas, (WIDTH - QR_SIZE) / 2, QR_TOP, QR_SIZE, QR_SIZE)

  // các dòng đối chiếu bằng mắt, phòng khi app ngân hàng không hiện rõ
  ctx.fillStyle = GRAY_500
  ctx.font = '16px sans-serif'
  ctx.fillText(memo, WIDTH / 2, memoY)

  const bankLabel = findBank(account.bankBin)?.shortName ?? account.bankBin
  ctx.font = '15px sans-serif'
  ctx.fillText(`${bankLabel} · ${account.accountNo}`, WIDTH / 2, bankY)
  if (account.accountName) ctx.fillText(account.accountName, WIDTH / 2, nameY)

  ctx.fillStyle = GRAY_400
  ctx.font = '13px sans-serif'
  ctx.fillText('Chia bằng app Tính tiền cầu lông', WIDTH / 2, height - FOOTER_H / 2 + 4)

  return canvas
}

/** Tải thẻ về máy — nhánh dự phòng khi máy không share được file. */
async function downloadQRCard(input: QRCardInput): Promise<void> {
  const canvas = await renderQRCard(input)
  const filename = qrCardFilename(input.playerName, input.memoDate)
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 'image/png')
}

/** Dựng thẻ → PNG → share sheet của máy, không được thì tải về. */
export async function sharePlayerQR(input: QRCardInput): Promise<ShareOutcome> {
  let file: File
  try {
    // canvasToPngFile dùng toDataURL đồng bộ: iOS Safari huỷ user-activation
    // khi await toBlob, còn vài ms dựng QR thì vẫn nằm trong hạn mức.
    const canvas = await renderQRCard(input)
    file = canvasToPngFile(canvas, qrCardFilename(input.playerName, input.memoDate))
  } catch {
    try {
      await downloadQRCard(input)
    } catch {
      // cả hai đường dựng đều hỏng (vd canvas bị chặn) — hết cách
    }
    return 'downloaded'
  }
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Tính tiền cầu lông' })
      return 'shared'
    } catch (e) {
      if ((e as { name?: string } | null)?.name === 'AbortError') return 'cancelled'
      // lỗi thật (quyền, v.v.) — rơi xuống nhánh tải về
    }
  }
  await downloadQRCard(input)
  return 'downloaded'
}
