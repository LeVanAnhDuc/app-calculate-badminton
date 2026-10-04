// types
import type { SavedSession } from "@/types/Storage";
// components
import SurplusRow from "@/components/SurplusRow";
import TotalCollectedRow from "@/components/TotalCollectedRow";
// others
import { formatVND } from "@/utils/format";
import { payerSummary } from "@/utils/payer";
import { durationHours, formatHours } from "@/utils/time";

const HistoryCostBreakdown = ({ session: s }: { session: SavedSession }) => (
  <div>
    <h3 className="mb-2 text-xs font-bold text-gray-400 uppercase">Chi phí</h3>
    <div className="space-y-1.5 text-sm">
      {s.input.shuttles
        .filter((l) => l.count > 0)
        .map((l) => (
          <div key={l.id} className="flex justify-between">
            <span className="text-gray-500">
              {l.name.trim() || "Tiền cầu"} ({l.count} quả ×{" "}
              {formatVND(l.price)})
            </span>
            <span className="font-semibold text-gray-900">
              {formatVND(l.count * l.price)}
            </span>
          </div>
        ))}
      <div className="flex justify-between">
        <span className="text-gray-500">Tiền sân</span>
        <span className="font-semibold text-gray-900">
          {formatVND(s.input.courtFee)}
        </span>
      </div>
      {s.input.extras.map((e) => (
        <div key={e.id} className="flex justify-between text-sm">
          {/* the amount on the right is the WHOLE `amount`,
          not one share — this is the "Chi phí" block */}
          <span className="text-gray-500">
            {e.label.trim() || "Khoản khác"} ·{" "}
            {payerSummary(s.input.players, e.playerIds, "?")}
          </span>
          <span className="font-semibold text-gray-900">
            {formatVND(e.amount)}
          </span>
        </div>
      ))}
      {s.input.mode === "hourly" && (
        <div className="flex justify-between">
          <span className="text-gray-500">Giờ thuê sân</span>
          <span className="font-semibold text-gray-900">
            {s.input.courtStart}–{s.input.courtEnd} (
            {formatHours(durationHours(s.input.courtStart, s.input.courtEnd))})
          </span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-gray-500">Chế độ tính</span>
        <span className="font-semibold text-gray-900">
          {s.input.mode === "ratio" ? "Chia theo tỉ lệ" : "Sân theo giờ"}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Hệ số nam / nữ</span>
        <span className="font-semibold text-gray-900">
          {s.input.maleRatio} / {s.input.femaleRatio}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Làm tròn</span>
        <span className="font-semibold text-gray-900">
          {s.input.rounding === "up1000" ? "Tròn lên 1.000đ" : "Giữ chính xác"}
        </span>
      </div>
      <TotalCollectedRow total={s.result.totalCollected} />
      <SurplusRow surplus={s.result.surplus} />
    </div>
  </div>
);

export default HistoryCostBreakdown;
