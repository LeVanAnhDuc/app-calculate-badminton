import { playerNote } from './exportImage'
import { formatVND } from './format'
import type { CalcResult, Mode, Player } from './types'

/**
 * Plain-text twin of the PNG image: header + one line per player with a
 * paid mark. Deliberately excludes tổng thu / số dư / tổng chi.
 */
export function formatResultText(
  result: CalcResult,
  mode: Mode,
  dateLabel: string,
  players: Player[],
): string {
  const paidById = new Map(players.map((p) => [p.id, p.paid]))
  const lines = result.players.map((p) => {
    const mark = paidById.get(p.playerId) ? '✓' : '○'
    return `${mark} ${p.name} (${playerNote(mode, p)}): ${formatVND(p.amount)}`
  })
  return [`🏸 Tính tiền cầu lông ${dateLabel}`, ...lines].join('\n')
}
