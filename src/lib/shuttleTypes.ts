import type { SavedSession } from './storage'

export interface ShuttleType {
  name: string
  price: number
}

/**
 * Cùng mô-típ với `frequent.ts`: tần suất suy ra từ `history` chứ không lưu
 * thành key localStorage riêng — schema không đổi, không cần di trú.
 */
interface Tally {
  name: string
  price: number
  /** Số buổi đã lưu có loại cầu này (trùng trong cùng một buổi chỉ tính 1). */
  count: number
  lastSeen: string
}

export const DEFAULT_SHUTTLE_TYPE_LIMIT = 8

/**
 * Xếp hạng loại cầu hay dùng để gợi ý trong sheet chọn loại cầu.
 *
 * - sắp xếp: số buổi giảm dần → buổi gần nhất → tên (cho kết quả tất định)
 * - tên & giá lấy từ buổi có `savedAt` mới nhất
 * - bỏ dòng tên rỗng và những tên đang có ở dòng khác trong buổi hiện tại
 */
export function frequentShuttleTypes(
  history: readonly SavedSession[],
  excludeNames: readonly string[],
  limit: number = DEFAULT_SHUTTLE_TYPE_LIMIT,
): ShuttleType[] {
  if (limit <= 0) return []

  const tallies = new Map<string, Tally>()

  for (const s of history) {
    const countedInThisSession = new Set<string>()
    for (const l of s.input.shuttles) {
      const name = l.name.trim()
      if (!name) continue
      const key = name.toLowerCase()
      const isFirstInSession = !countedInThisSession.has(key)
      countedInThisSession.add(key)

      const tally = tallies.get(key)
      if (!tally) {
        tallies.set(key, {
          name,
          price: l.price,
          count: isFirstInSession ? 1 : 0,
          lastSeen: s.savedAt,
        })
        continue
      }
      if (isFirstInSession) tally.count += 1
      // Lịch sử không đảm bảo đã sắp xếp — luôn so `savedAt` để lấy lần gần nhất.
      if (s.savedAt > tally.lastSeen) {
        tally.lastSeen = s.savedAt
        tally.name = name
        tally.price = l.price
      }
    }
  }

  const excluded = new Set(excludeNames.map((n) => n.trim().toLowerCase()))

  return [...tallies.entries()]
    .filter(([key]) => !excluded.has(key))
    .map(([, tally]) => tally)
    .sort(
      (a, b) =>
        b.count - a.count ||
        (a.lastSeen === b.lastSeen ? 0 : a.lastSeen < b.lastSeen ? 1 : -1) ||
        a.name.localeCompare(b.name, 'vi'),
    )
    .slice(0, limit)
    .map(({ name, price }) => ({ name, price }))
}
