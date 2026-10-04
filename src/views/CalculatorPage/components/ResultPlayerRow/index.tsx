// types
import type { Mode, PlayerResult } from "@/types/Session";
// components
import PaidToggle from "@/components/PaidToggle";
import { QRIcon } from "@/components/Icons";
// others
import { formatNumber, formatVND } from "@/utils/format";
import { formatHours } from "@/utils/time";

const ResultPlayerRow = ({
  p,
  mode,
  large,
  paid,
  onTogglePaid,
  onShowQR
}: {
  p: PlayerResult;
  mode: Mode;
  large?: boolean;
  paid: boolean;
  onTogglePaid: () => void;
  onShowQR: () => void;
}) => {
  return (
    <li
      className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors duration-200 ${
        paid ? "bg-emerald-50" : "bg-gray-50"
      }`}
    >
      <div>
        <span
          className={`block font-medium text-gray-900 ${large ? "text-lg" : ""}`}
        >
          {p.name}{" "}
          <span className="text-xs text-gray-400">
            ({p.gender === "male" ? "Nam" : "Nữ"}
            {mode === "ratio" && p.halfSession ? " · ½ buổi" : ""}
            {mode === "hourly" && p.hours !== null
              ? ` · ${formatHours(p.hours)}`
              : ""}
            )
          </span>
        </span>
        {mode === "hourly" && (
          <span className="block text-xs text-gray-400">
            sân {formatNumber(p.courtShare)} + cầu{" "}
            {formatNumber(p.shuttleShare)}
          </span>
        )}
        {/* extras listed one line each; a session saved by v1.4.0 has only the
            total, so it falls back to the single "+ phát sinh N" line */}
        {p.extras.length > 0 ? (
          p.extras.map((x, i) => (
            <span key={i} className="block pl-3 text-xs text-amber-600">
              · {x.label}
              {x.sharedCount > 1 ? ` (chung, ${x.sharedCount} người)` : ""}{" "}
              {formatNumber(x.share)}
            </span>
          ))
        ) : p.extrasTotal > 0 ? (
          <span className="block text-xs text-amber-600">
            + phát sinh {formatNumber(p.extrasTotal)}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Mã QR cho ${p.name}`}
          title={`Mã QR cho ${p.name}`}
          onClick={onShowQR}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
        >
          <QRIcon />
        </button>
        <PaidToggle paid={paid} name={p.name} onToggle={onTogglePaid} />
        <span className={`font-bold text-gray-900 ${large ? "text-xl" : ""}`}>
          {formatVND(p.amount)}
        </span>
      </div>
    </li>
  );
};

export default ResultPlayerRow;
