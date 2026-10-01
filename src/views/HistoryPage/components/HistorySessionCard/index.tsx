// types
import type { SavedSession } from "@/types/Storage";
// components
import CopyTextButton from "@/components/CopyTextButton";
import { TrashIcon } from "@/components/Icons";
import ShareImageButton from "@/components/ShareImageButton";
import SwipeToDelete from "@/components/SwipeToDelete";
import HistoryCostBreakdown from "../HistoryCostBreakdown";
import HistoryPlayerPayments from "../HistoryPlayerPayments";
// others
import { formatVND } from "@/utils/format";
import { sessionDate } from "@/utils/date";
import { paidCount } from "@/utils/settlement";

const HistorySessionCard = ({
  session: s,
  expanded,
  swipeOpen,
  onToggleExpanded,
  onSwipeOpenChange,
  onDelete,
  onTogglePaid,
  onShowQR,
  onReuse
}: {
  session: SavedSession;
  expanded: boolean;
  swipeOpen: boolean;
  onToggleExpanded: () => void;
  onSwipeOpenChange: (open: boolean) => void;
  onDelete: () => void;
  onTogglePaid: (playerId: string) => void;
  onShowQR: (playerId: string) => void;
  onReuse: () => void;
}) => {
  const males = s.input.players.filter((p) => p.gender === "male").length;
  const females = s.input.players.length - males;
  const unpaidPlayerCount = s.input.players.length - paidCount(s.input.players);
  return (
    <section className={expanded ? "md:col-span-2" : ""}>
      <SwipeToDelete
        testId={`history-swipe-row-${s.id}`}
        label={`Xóa nhanh buổi ${sessionDate(s.savedAt)}`}
        isOpen={swipeOpen}
        onOpenChange={onSwipeOpenChange}
        onDelete={onDelete}
        className="rounded-2xl"
        surfaceClassName={`bg-white rounded-2xl shadow-sm ${
          expanded ? "border-2 border-emerald-200" : ""
        }`}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between p-4 text-left"
          onClick={onToggleExpanded}
        >
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {sessionDate(s.savedAt)}
            </h2>
            <p className="mt-0.5 flex items-center gap-2 text-sm text-gray-500">
              <span>
                {s.input.players.length} người · {males} nam, {females} nữ
              </span>
              {unpaidPlayerCount > 0 && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600">
                  ⚠ {unpaidPlayerCount} chưa trả
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <div className="text-base font-bold text-emerald-600">
              {formatVND(s.result.totalCost)}
            </div>
            <div className="text-xs text-gray-400">
              {expanded ? "▲ thu gọn" : "▼ chi tiết"}
            </div>
          </div>
        </button>

        {expanded && (
          <>
            <div className="grid grid-cols-1 gap-4 border-t border-gray-100 p-4 md:grid-cols-2">
              <HistoryCostBreakdown session={s} />
              <HistoryPlayerPayments
                session={s}
                onTogglePaid={onTogglePaid}
                onShowQR={onShowQR}
              />
            </div>
            <div className="space-y-2 border-t border-gray-100 p-4">
              <div className="flex gap-2">
                <ShareImageButton
                  result={s.result}
                  mode={s.input.mode}
                  players={s.input.players}
                  date={new Date(s.savedAt)}
                  variant="wide"
                />
                <CopyTextButton
                  result={s.result}
                  mode={s.input.mode}
                  players={s.input.players}
                  date={new Date(s.savedAt)}
                  variant="wide"
                />
              </div>
              <div className="space-y-2 md:flex md:gap-2 md:space-y-0">
                <button
                  type="button"
                  onClick={onReuse}
                  className="h-12 w-full rounded-xl bg-emerald-600 text-sm font-semibold text-white md:flex-1"
                >
                  Dùng lại danh sách này cho buổi mới
                </button>
                {/* trên mobile thao tác xóa là vuốt trái cả thẻ, nên
              hàng nút không còn nút xóa nào */}
                <button
                  type="button"
                  onClick={onDelete}
                  className="hidden h-12 items-center justify-center gap-2 rounded-xl border border-red-200 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 md:flex md:w-auto md:px-4"
                >
                  <TrashIcon />
                  Xóa buổi này
                </button>
              </div>
            </div>
          </>
        )}
      </SwipeToDelete>
    </section>
  );
};

export default HistorySessionCard;
