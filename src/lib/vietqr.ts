/**
 * Sinh chuỗi VietQR chuẩn EMVCo merchant-presented (NAPAS IBFT to account).
 * Payload là chuỗi TLV: ID(2 số) + LEN(2 số) + VALUE, kết bằng CRC-16.
 * Hoàn toàn thuần — không phụ thuộc UI/DOM, chạy offline.
 */

export interface VietQRInput {
  bankBin: string // BIN NAPAS 6 số, vd "970422" (MB)
  accountNo: string // số tài khoản người thu
  amount: number // VND, số nguyên; 0 → QR tĩnh (bỏ field 54, người trả tự nhập)
  memo: string // nội dung CK (được normalize bên trong)
}

function tlv(id: string, value: string): string {
  return id + String(value.length).padStart(2, '0') + value
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — 4 ký tự hex in hoa. */
export function crc16(s: string): string {
  let crc = 0xffff
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Bỏ dấu tiếng Việt và ký tự lạ — nhiều app ngân hàng hiển thị sai ký tự
 * có dấu trong nội dung CK. Giữ chữ, số, khoảng trắng và / . - ; tối đa 50 ký tự.
 */
export function normalizeMemo(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritics from NFD
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9 /.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50)
    .trim()
}

/** "Cau long DD/MM Ten" — nội dung CK chuẩn của app. */
export function buildMemo(date: Date, playerName: string): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return normalizeMemo(`Cau long ${dd}/${mm} ${playerName}`)
}

export function buildVietQRPayload({ bankBin, accountNo, amount, memo }: VietQRInput): string {
  const beneficiary = tlv('00', bankBin) + tlv('01', accountNo)
  const merchantInfo = tlv('00', 'A000000727') + tlv('01', beneficiary) + tlv('02', 'QRIBFTTA')
  const cleanMemo = normalizeMemo(memo)
  const hasAmount = amount > 0

  let body = tlv('00', '01') + tlv('01', hasAmount ? '12' : '11') + tlv('38', merchantInfo) + tlv('53', '704')
  if (hasAmount) body += tlv('54', String(Math.round(amount)))
  body += tlv('58', 'VN')
  if (cleanMemo) body += tlv('62', tlv('08', cleanMemo))
  body += '6304'
  return body + crc16(body)
}
