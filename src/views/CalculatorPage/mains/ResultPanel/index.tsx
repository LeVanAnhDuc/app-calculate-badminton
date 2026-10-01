// libs
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
// types
import type { CalcResult, Mode, Player, SessionInput } from "@/types/Session";
// components
import QRSheet from "@/components/QRSheet";
import CopyTextButton from "@/components/CopyTextButton";
import ShareImageButton from "@/components/ShareImageButton";
import SurplusRow from "@/components/SurplusRow";
import TotalCollectedRow from "@/components/TotalCollectedRow";
import PaidSummaryLine from "@/components/PaidSummaryLine";
import { MaximizeIcon } from "@/components/Icons";
import ResultPlayerRow from "../../components/ResultPlayerRow";
import FullscreenResult from "../../components/FullscreenResult";
// others
import { formatHours } from "@/utils/time";

const NO_PLAYERS_ERROR = "Cần ít nhất 1 người chơi";

const ResultPanel = ({
  result,
  mode,
  errors,
  players,
  onSave,
  onNewSession,
  onPatch,
  saveDisabled
}: {
  result: CalcResult | null;
  mode: Mode;
  errors: string[];
  players: Player[];
  onSave: () => void;
  onNewSession: () => void;
  onPatch: (patch: Partial<SessionInput>) => void;
  saveDisabled?: boolean;
}) => {
  const [fullscreen, setFullscreen] = useState(false);
  const [qrPlayerId, setQrPlayerId] = useState<string | null>(null);
  const isEmptyPlayers = errors.length === 1 && errors[0] === NO_PLAYERS_ERROR;
  const handleTogglePaid = (playerId: string) => {
    onPatch({
      players: players.map((pl) =>
        pl.id === playerId ? { ...pl, paid: !pl.paid } : pl
      )
    });
  };
  const qrResult =
    result?.players.find((p) => p.playerId === qrPlayerId) ?? null;

  return (
    <section className="rounded-2xl border-2 border-emerald-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">Kết quả</h2>
        {result !== null && (
          <div className="flex items-center gap-2">
            <ShareImageButton result={result} mode={mode} players={players} />
            <CopyTextButton result={result} mode={mode} players={players} />
            <button
              type="button"
              aria-label="Xem toàn màn hình"
              title="Xem toàn màn hình"
              onClick={() => setFullscreen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
            >
              <MaximizeIcon />
            </button>
          </div>
        )}
      </div>

      {result !== null && (
        <div className="mb-3">
          <PaidSummaryLine players={players} results={result.players} />
        </div>
      )}

      {result === null ? (
        isEmptyPlayers ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center py-8 text-center"
          >
            <span className="mb-2 text-5xl" role="img" aria-label="Cầu lông">
              🏸
            </span>
            <p className="font-semibold text-gray-700">
              Chưa có ai trong buổi này
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Thêm người chơi ở mục bên trên để bắt đầu chia tiền
            </p>
          </motion.div>
        ) : (
          <ul className="space-y-1">
            {errors.map((e) => (
              <li key={e} className="text-sm text-amber-600">
                {e}
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          {mode === "hourly" && result.emptyHours > 0 && (
            <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-600">
              Có {formatHours(result.emptyHours)} sân thuê không ai chơi — phần
              này được chia đều.
            </p>
          )}
          <ul className="space-y-2">
            {result.players.map((p) => (
              <ResultPlayerRow
                key={p.playerId}
                p={p}
                mode={mode}
                paid={players.find((pl) => pl.id === p.playerId)?.paid ?? false}
                onTogglePaid={() => handleTogglePaid(p.playerId)}
                onShowQR={() => setQrPlayerId(p.playerId)}
              />
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3">
            <TotalCollectedRow total={result.totalCollected} />
            <SurplusRow surplus={result.surplus} />
          </div>
        </>
      )}

      <button
        type="button"
        disabled={result === null || saveDisabled}
        onClick={onSave}
        className="mt-4 h-14 w-full rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-md disabled:bg-gray-300"
      >
        Lưu buổi này
      </button>

      <button
        type="button"
        onClick={onNewSession}
        className="mt-2 h-12 w-full rounded-xl border border-gray-300 font-semibold text-gray-600"
      >
        Buổi mới
      </button>

      <AnimatePresence>
        {fullscreen && result !== null && (
          <FullscreenResult
            result={result}
            mode={mode}
            players={players}
            onTogglePaid={handleTogglePaid}
            onShowQR={(playerId) => setQrPlayerId(playerId)}
            onClose={() => setFullscreen(false)}
            escDisabled={qrPlayerId !== null}
          />
        )}
      </AnimatePresence>

      {qrResult !== null && (
        <QRSheet
          open
          onClose={() => setQrPlayerId(null)}
          playerName={qrResult.name}
          amount={qrResult.amount}
          memoDate={new Date()}
          paid={
            players.find((pl) => pl.id === qrResult.playerId)?.paid ?? false
          }
          onTogglePaid={() => handleTogglePaid(qrResult.playerId)}
        />
      )}
    </section>
  );
};

export default ResultPanel;
