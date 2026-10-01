// types
import type { RosterEntry } from "@/types/Storage";
// components
import CapCentred from "@/components/CapCentred";

const RosterAvatar = ({ entry }: { entry: RosterEntry }) => {
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-semibold ${
        entry.gender === "male"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-pink-100 text-pink-700"
      }`}
    >
      <CapCentred>
        {entry.name.trim().charAt(0).toUpperCase() || "?"}
      </CapCentred>
    </span>
  );
};

export default RosterAvatar;
