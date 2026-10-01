// others
import { BANKS } from "@/constants/banks";

test("bank list has 40+ banks with unique 6-digit BINs", () => {
  expect(BANKS.length).toBeGreaterThanOrEqual(40);
  const bins = BANKS.map((b) => b.bin);
  expect(new Set(bins).size).toBe(bins.length);
  for (const bin of bins) expect(bin).toMatch(/^\d{6}$/);
});
