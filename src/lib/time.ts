export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function durationHours(start: string, end: string): number {
  let diff = toMinutes(end) - toMinutes(start)
  if (diff < 0) diff += 24 * 60
  return diff / 60
}

export function formatHours(h: number): string {
  const s = Number.isInteger(h) ? String(h) : h.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
  return `${s} giờ`
}
