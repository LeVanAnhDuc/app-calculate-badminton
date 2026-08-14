import type { Player, PlayerResult } from './types'

/** Số người đã đánh dấu trả tiền. */
export function paidCount(players: Player[]): number {
  return players.filter((p) => p.paid).length
}

/** Tổng số tiền còn thiếu — amount của những người có paid === false, khớp theo playerId. */
export function unpaidAmount(players: Player[], results: PlayerResult[]): number {
  const unpaidIds = new Set(players.filter((p) => !p.paid).map((p) => p.id))
  return results
    .filter((r) => unpaidIds.has(r.playerId))
    .reduce((sum, r) => sum + r.amount, 0)
}
