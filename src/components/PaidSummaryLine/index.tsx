// libs
import { useState } from "react";
// types
import type { Player, PlayerResult } from "@/types/Session";
// components
import EyeButton from "@/components/EyeButton";
// others
import { formatVND } from "@/utils/format";
import { paidCount, unpaidAmount } from "@/utils/settlement";

const PaidSummaryLine = ({
  players,
  results
}: {
  players: Player[];
  results: PlayerResult[];
}) => {
  const [shown, setShown] = useState(false);
  const n = players.length;
  const x = paidCount(players);
  if (n > 0 && x === n) {
    return <p className="text-sm text-emerald-600">✓ Đã thu đủ</p>;
  }
  const unpaid = unpaidAmount(players, results);
  // The count stays visible — it is not money, and hiding it would empty the
  // line of meaning. Only the amount is masked, like TotalCollectedRow above.
  // Kept as one inline sentence (no wrapper span around the whole text) so that
  // getByText(/còn thiếu/) still resolves to a single element.
  return (
    <p className="text-sm text-gray-500">
      Đã thu {x}/{n} · còn thiếu{" "}
      <span className="font-semibold tracking-wider text-amber-600">
        {shown ? formatVND(unpaid) : "•••••"}
      </span>
      <span className="inline-flex align-middle">
        <EyeButton
          shown={shown}
          onToggle={() => setShown(!shown)}
          shownLabel="Ẩn số tiền còn thiếu"
          hiddenLabel="Hiện số tiền còn thiếu"
        />
      </span>
    </p>
  );
};

export default PaidSummaryLine;
