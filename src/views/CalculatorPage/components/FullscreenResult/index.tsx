// libs
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
// types
import type { CalcResult, Mode, Player } from "@/types/Session";
// components
import { CloseIcon } from "@/components/Icons";
import CopyTextButton from "@/components/CopyTextButton";
import ShareImageButton from "@/components/ShareImageButton";
import SurplusRow from "@/components/SurplusRow";
import TotalCollectedRow from "@/components/TotalCollectedRow";
import PaidSummaryLine from "@/components/PaidSummaryLine";
import ResultPlayerRow from "../ResultPlayerRow";
// others
import { formatHours } from "@/utils/time";

const FullscreenResult = ({
  result,
  mode,
  players,
  onTogglePaid,
  onShowQR,
  onClose,
  escDisabled
}: {
  result: CalcResult;
  mode: Mode;
  players: Player[];
  onTogglePaid: (playerId: string) => void;
  onShowQR: (playerId: string) => void;
  onClose: () => void;
  escDisabled: boolean;
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !escDisabled) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, escDisabled]);

  // Portaled to <body>: the panel lives inside an md:sticky column whose
  // stacking context would otherwise let z-10 elements elsewhere paint on top.
  return createPortal(
    <motion.div
      data-testid="fullscreen-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-50"
    >
      <motion.div
        initial={{ scale: 0.97 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.97 }}
        transition={{ duration: 0.2 }}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-4">
          <h2 className="text-lg font-bold text-gray-900">Kết quả</h2>
          <div className="flex items-center gap-2">
            <ShareImageButton result={result} mode={mode} players={players} />
            <CopyTextButton result={result} mode={mode} players={players} />
            <button
              type="button"
              aria-label="Đóng"
              title="Đóng"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <CloseIcon size={18} />
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-lg px-4 py-6 md:max-w-3xl">
          {mode === "hourly" && result.emptyHours > 0 && (
            <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-600">
              Có {formatHours(result.emptyHours)} sân thuê không ai chơi — phần
              này được chia đều.
            </p>
          )}
          <div className="mb-2">
            <PaidSummaryLine players={players} results={result.players} />
          </div>
          <ul
            data-testid="fullscreen-player-grid"
            className="grid grid-cols-1 gap-2 md:grid-cols-2"
          >
            {result.players.map((p) => (
              <ResultPlayerRow
                key={p.playerId}
                p={p}
                mode={mode}
                large
                paid={players.find((pl) => pl.id === p.playerId)?.paid ?? false}
                onTogglePaid={() => onTogglePaid(p.playerId)}
                onShowQR={() => onShowQR(p.playerId)}
              />
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3">
            <TotalCollectedRow total={result.totalCollected} />
            <SurplusRow surplus={result.surplus} />
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

export default FullscreenResult;
