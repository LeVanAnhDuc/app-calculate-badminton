// libs
import { Fragment, useEffect, useState } from "react";
// types
import type { SavedSession } from "@/types/Storage";
// components
import HistoryQRSheet from "../../components/HistoryQRSheet";
import HistorySessionCard from "../../components/HistorySessionCard";
// others
import { monthKey, monthLabel } from "@/utils/date";

const HistorySessionList = ({
  history,
  onDelete,
  onTogglePaid,
  onReuse
}: {
  history: SavedSession[];
  onDelete: (id: string) => void;
  onTogglePaid: (sessionId: string, playerId: string) => void;
  onReuse: (s: SavedSession) => void;
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [qrTarget, setQrTarget] = useState<{
    sessionId: string;
    playerId: string;
  } | null>(null);

  // cards never auto-expand; this only guards against a deleted card
  // staying "expanded" once it no longer exists in history
  useEffect(() => {
    if (expandedId !== null && !history.some((s) => s.id === expandedId)) {
      setExpandedId(null);
    }
  }, [history, expandedId]);

  return (
    <main className="mt-4 space-y-3 px-4 md:mx-auto md:grid md:max-w-5xl md:grid-cols-2 md:items-start md:gap-3 md:space-y-0">
      {history.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-400 md:col-span-2">
          Chưa có buổi nào được lưu — quay lại màn hình chính và bấm "Lưu buổi
          này".
        </p>
      )}
      {history.length > 0 && (
        <p className="text-center text-xs text-gray-400 md:col-span-2">
          <span className="md:hidden">💡 Vuốt trái một buổi để xóa</span>
          <span className="hidden md:inline">
            💡 Mở chi tiết rồi bấm nút Xóa buổi này
          </span>
        </p>
      )}
      {history.map((s, i) => {
        const expanded = expandedId === s.id;
        const showMonthHeader =
          i === 0 || monthKey(s.savedAt) !== monthKey(history[i - 1].savedAt);
        return (
          <Fragment key={s.id}>
            {showMonthHeader && (
              <h2 className="mt-2 text-sm font-bold tracking-wide text-gray-500 uppercase first:mt-0 md:col-span-2">
                {monthLabel(s.savedAt)}
              </h2>
            )}
            <HistorySessionCard
              session={s}
              expanded={expanded}
              swipeOpen={openSwipeId === s.id}
              onToggleExpanded={() => setExpandedId(expanded ? null : s.id)}
              onSwipeOpenChange={(open) => setOpenSwipeId(open ? s.id : null)}
              onDelete={() => onDelete(s.id)}
              onTogglePaid={(playerId) => onTogglePaid(s.id, playerId)}
              onShowQR={(playerId) =>
                setQrTarget({ sessionId: s.id, playerId })
              }
              onReuse={() => onReuse(s)}
            />
          </Fragment>
        );
      })}
      <HistoryQRSheet
        history={history}
        target={qrTarget}
        onClose={() => setQrTarget(null)}
        onTogglePaid={onTogglePaid}
      />
      <p className="pt-3 text-center text-xs text-gray-400 md:col-span-2">
        Dữ liệu lưu trên máy của bạn (localStorage)
        <br />
        Tự động giữ tối đa 500 buổi gần nhất — buổi cũ hơn sẽ được xóa dần
      </p>
    </main>
  );
};

export default HistorySessionList;
