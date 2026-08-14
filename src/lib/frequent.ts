import type { RosterEntry, SavedSession } from './storage'
import type { Gender } from './types'

/**
 * Tần suất được suy ra từ `history` chứ không lưu thành trường riêng trong
 * `RosterEntry` — nhờ vậy schema localStorage không đổi và không cần di trú.
 */
interface Tally {
  /** Tên hiển thị: ưu tiên cách viết trong danh bạ, nếu không thì lần gần nhất trong lịch sử. */
  name: string
  gender: Gender
  /** Số buổi đã lưu có người này (trùng tên trong cùng một buổi chỉ tính 1). */
  count: number
  /** `savedAt` (ISO) của lần xuất hiện gần nhất; '' nếu chỉ có trong danh bạ. */
  lastSeen: string
}

export const DEFAULT_FREQUENT_LIMIT = 8

/**
 * Xếp hạng những người hay gặp để hiện thành chip bấm-một-phát-là-thêm.
 *
 * - đếm số buổi đã lưu có tên đó (không phân biệt hoa/thường)
 * - sắp xếp: số buổi giảm dần → buổi gần nhất → tên (cho kết quả tất định)
 * - bỏ những người đã có trong buổi đang nhập
 * - giới tính lấy từ danh bạ nếu có, nếu không thì lần xuất hiện gần nhất
 * - người trong danh bạ nhưng chưa từng xuất hiện vẫn được xếp, nhưng ở cuối
 */
export function frequentPlayers(
  history: readonly SavedSession[],
  roster: readonly RosterEntry[],
  currentPlayers: readonly { name: string }[],
  limit: number = DEFAULT_FREQUENT_LIMIT,
): RosterEntry[] {
  if (limit <= 0) return []

  const tallies = new Map<string, Tally>()

  for (const session of history) {
    const countedInThisSession = new Set<string>()
    for (const p of session.input.players) {
      const name = p.name.trim()
      if (!name) continue
      const key = name.toLowerCase()
      const isFirstInSession = !countedInThisSession.has(key)
      countedInThisSession.add(key)

      const tally = tallies.get(key)
      if (!tally) {
        tallies.set(key, {
          name,
          gender: p.gender,
          count: isFirstInSession ? 1 : 0,
          lastSeen: session.savedAt,
        })
        continue
      }
      if (isFirstInSession) tally.count += 1
      // Lịch sử không đảm bảo đã sắp xếp — luôn so `savedAt` để lấy lần gần nhất.
      if (session.savedAt > tally.lastSeen) {
        tally.lastSeen = session.savedAt
        tally.gender = p.gender
        tally.name = name
      }
    }
  }

  // Danh bạ là nguồn chính xác nhất cho tên & giới tính hiện tại.
  for (const entry of roster) {
    const name = entry.name.trim()
    if (!name) continue
    const key = name.toLowerCase()
    const tally = tallies.get(key)
    if (tally) {
      tally.name = name
      tally.gender = entry.gender
    } else {
      tallies.set(key, { name, gender: entry.gender, count: 0, lastSeen: '' })
    }
  }

  const inSession = new Set(currentPlayers.map((p) => p.name.trim().toLowerCase()))

  return [...tallies.entries()]
    .filter(([key]) => !inSession.has(key))
    .map(([, tally]) => tally)
    .sort(
      (a, b) =>
        b.count - a.count ||
        (a.lastSeen === b.lastSeen ? 0 : a.lastSeen < b.lastSeen ? 1 : -1) ||
        a.name.localeCompare(b.name, 'vi'),
    )
    .slice(0, limit)
    .map(({ name, gender }) => ({ name, gender }))
}
