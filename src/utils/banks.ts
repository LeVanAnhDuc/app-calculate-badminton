// types
import type { Bank } from "@/types/Bank";
// others
import { BANKS } from "@/constants/banks";

export function findBank(bin: string): Bank | undefined {
  return BANKS.find((b) => b.bin === bin);
}
