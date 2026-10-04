// types
import type { SavedSession } from "@/types/Storage";
// components
import QRSheet from "@/components/QRSheet";

const HistoryQRSheet = ({
  history,
  target,
  onClose,
  onTogglePaid
}: {
  history: SavedSession[];
  target: { sessionId: string; playerId: string } | null;
  onClose: () => void;
  onTogglePaid: (sessionId: string, playerId: string) => void;
}) => {
  if (target === null) return null;
  const s = history.find((x) => x.id === target.sessionId);
  const pr = s?.result.players.find((p) => p.playerId === target.playerId);
  if (!s || !pr) return null;
  const paid =
    s.input.players.find((pl) => pl.id === pr.playerId)?.paid ?? false;
  return (
    <QRSheet
      open
      onClose={onClose}
      playerName={pr.name}
      amount={pr.amount}
      memoDate={new Date(s.savedAt)}
      paid={paid}
      onTogglePaid={() => onTogglePaid(s.id, pr.playerId)}
    />
  );
};

export default HistoryQRSheet;
