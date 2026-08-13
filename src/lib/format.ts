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
