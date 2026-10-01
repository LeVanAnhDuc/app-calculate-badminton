// others
import { findBank } from "@/utils/banks";

test("findBank resolves well-known BINs", () => {
  expect(findBank("970436")?.shortName).toBe("Vietcombank");
  expect(findBank("970422")?.shortName).toBe("MB Bank");
  expect(findBank("000000")).toBeUndefined();
});
