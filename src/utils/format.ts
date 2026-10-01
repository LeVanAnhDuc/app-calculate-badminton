export function formatNumber(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

export function formatVND(n: number): string {
  return `${formatNumber(n)}đ`;
}

export function parseMoney(s: string): number {
  const digits = s.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

/**
 * Đọc hệ số nam/nữ người dùng gõ. Bàn phím số tiếng Việt cho dấu phẩy nên
 * `,` và `.` đều là dấu thập phân. Trả `null` khi chuỗi chưa thành số dương
 * hợp lệ (rỗng, `1,`, `abc`, `1,5,5`, `0`) để nơi gọi biết mà chưa cập nhật.
 */
export function parseRatio(s: string): number | null {
  const cleaned = s.replace(/,/g, ".").replace(/[^\d.]/g, "");
  if (!/^(\d+(\.\d+)?|\.\d+)$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n > 0 ? n : null;
}

/** Position (in `formatted`) right after the `digitsBeforeCaret`-th digit character. */
export function caretPositionForDigitCount(
  formatted: string,
  digitsBeforeCaret: number
): number {
  if (digitsBeforeCaret <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      seen++;
      if (seen === digitsBeforeCaret) return i + 1;
    }
  }
  return formatted.length;
}

/** "6705a1f3e8b2c41d9a7c9f2e" → "6705a1f3…7c9f2e"; id ngắn thì giữ nguyên. */
export function shortenId(id: string): string {
  return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
}
