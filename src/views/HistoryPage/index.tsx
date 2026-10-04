// types
import type { SavedSession } from "@/types/Storage";
// components
import HistoryHeader from "./mains/HistoryHeader";
import HistorySessionList from "./mains/HistorySessionList";

const HistoryPage = ({
  history,
  onBack,
  onDelete,
  onTogglePaid,
  onReuse
}: {
  history: SavedSession[];
  onBack: () => void;
  onDelete: (id: string) => void;
  onTogglePaid: (sessionId: string, playerId: string) => void;
  onReuse: (s: SavedSession) => void;
}) => {
  const now = new Date();
  const thisMonth = history.filter((s) => {
    const d = new Date(s.savedAt);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;

  return (
    <div className="min-h-dvh bg-gray-100">
      {/* pb gộp 2rem + safe-area: hai utility padding-bottom trên cùng element
          sẽ đè nhau theo thứ tự CSS nên gộp thành một class */}
      <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-gray-50 pb-[calc(2rem+env(safe-area-inset-bottom))] md:max-w-none md:bg-gray-100 md:pb-0">
        <HistoryHeader
          count={history.length}
          thisMonth={thisMonth}
          onBack={onBack}
        />
        <HistorySessionList
          history={history}
          onDelete={onDelete}
          onTogglePaid={onTogglePaid}
          onReuse={onReuse}
        />
      </div>
    </div>
  );
};

export default HistoryPage;
