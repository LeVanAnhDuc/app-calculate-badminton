export function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n))
}

export function formatVND(n: number): string {
  return `${formatNumber(n)}đ`
}

export function parseMoney(s: string): number {
  const digits = s.replace(/\D/g, '')
  return digits ? Number(digits) : 0
}

/**
 * Đọc hệ số nam/nữ người dùng gõ. Bàn phím số tiếng Việt cho dấu phẩy nên
 * `,` và `.` đều là dấu thập phân. Trả `null` khi chuỗi chưa thành số dương
 * hợp lệ (rỗng, `1,`, `abc`, `1,5,5`, `0`) để nơi gọi biết mà chưa cập nhật.
 */
export function parseRatio(s: string): number | null {
  const cleaned = s.replace(/,/g, '.').replace(/[^\d.]/g, '')
  if (!/^(\d+(\.\d+)?|\.\d+)$/.test(cleaned)) return null
  const n = Number(cleaned)
  return n > 0 ? n : null
}
