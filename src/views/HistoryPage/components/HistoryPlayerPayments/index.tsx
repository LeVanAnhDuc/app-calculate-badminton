// types
import type { SavedSession } from "@/types/Storage";
// components
import { QRIcon } from "@/components/Icons";
import PaidSummaryLine from "@/components/PaidSummaryLine";
import PaidToggle from "@/components/PaidToggle";
// others
import { formatVND } from "@/utils/format";
import { formatHours } from "@/utils/time";

const HistoryPlayerPayments = ({
  session: s,
  onTogglePaid,
  onShowQR
}: {
  session: SavedSession;
  onTogglePaid: (playerId: string) => void;
  onShowQR: (playerId: string) => void;
}) => (
  <div>
    <h3 className="mb-2 text-xs font-bold text-gray-400 uppercase">
      Mỗi người trả
    </h3>
    <div className="mb-2">
      <PaidSummaryLine players={s.input.players} results={s.result.players} />
    </div>
    <ul className="grid grid-cols-1 gap-1.5 text-sm md:grid-cols-2">
      {s.result.players.map((p) => {
        const paid =
          s.input.players.find((pl) => pl.id === p.playerId)?.paid ?? false;
        return (
          <li
            key={p.playerId}
            className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors duration-200 ${
              paid ? "bg-emerald-50" : "bg-gray-50"
            }`}
          >
            <span className="flex items-center gap-2 text-gray-900">
              <PaidToggle
                paid={paid}
                name={p.name}
                onToggle={() => onTogglePaid(p.playerId)}
              />
              <span>
                {p.name}{" "}
                <span className="text-xs text-gray-400">
                  ({p.gender === "male" ? "Nam" : "Nữ"}
                  {s.input.mode === "ratio" && p.halfSession ? " · ½ buổi" : ""}
                  {p.hours !== null ? ` · ${formatHours(p.hours)}` : ""}
                  {/* itemised extras get their own lines below, so
                  the suffix is kept only for v1.4.0 sessions */}
                  {p.extras.length === 0 && p.extrasTotal > 0
                    ? ` · +${formatVND(p.extrasTotal)} phát sinh`
                    : ""}
                  )
                </span>
                {p.extras.map((x, k) => (
                  <span key={k} className="block pl-3 text-xs text-gray-400">
                    · {x.label}
                    {x.sharedCount > 1
                      ? ` (chung, ${x.sharedCount} người)`
                      : ""}{" "}
                    {formatVND(x.share)}
                  </span>
                ))}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Mã QR cho ${p.name}`}
                title={`Mã QR cho ${p.name}`}
                onClick={() => onShowQR(p.playerId)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <QRIcon />
              </button>
              <span className="font-bold">{formatVND(p.amount)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  </div>
);

export default HistoryPlayerPayments;
