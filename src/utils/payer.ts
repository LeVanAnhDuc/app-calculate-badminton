// types
import type { Player } from "@/types/Session";

/**
 * Summary shown on the trigger. Exported so HistoryPage (and tests) print the
 * same wording. Order always follows `players`, never the order ids were
 * ticked — the order inside playerIds is never shown anywhere.
 */
export function payerSummary(
  players: Player[],
  value: string[],
  emptyLabel = "Chọn người trả"
): string {
  const chosen = players.filter((p) => value.includes(p.id));
  if (chosen.length === 0) return emptyLabel;
  if (chosen.length === players.length) return "Cả nhóm";
  if (chosen.length === 1) return chosen[0].name;
  return `${chosen[0].name} +${chosen.length - 1}`;
}
