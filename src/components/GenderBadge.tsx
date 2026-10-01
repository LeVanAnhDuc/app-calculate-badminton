import type { Gender } from "../lib/types";
import { CapCentred } from "./CapCentred";

export function GenderBadge({ gender }: { gender: Gender }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        gender === "male"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-pink-100 text-pink-700"
      }`}
    >
      <CapCentred>{gender === "male" ? "N" : "Nữ"}</CapCentred>
    </span>
  );
}
