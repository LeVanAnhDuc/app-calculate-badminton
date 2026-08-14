import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { downloadResultImage } from '../lib/exportImage'
import { formatNumber, formatVND } from '../lib/format'
import { paidCount, unpaidAmount } from '../lib/settlement'
import { formatHours } from '../lib/time'
import type { CalcResult, Mode, Player, PlayerResult, SessionInput } from '../lib/types'
import { EyeButton } from './EyeButton'
import { PaidToggle } from './PaidToggle'
import { QRSheet } from './QRSheet'

interface HiddenAmountRowProps {
  label: string
  text: string
  valueClassName: string
  shownLabel: string
  hiddenLabel: string
}

function HiddenAmountRow({ label, text, valueClassName, shownLabel, hiddenLabel }: HiddenAmountRowProps) {
  const [shown, setShown] = useState(false)
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="flex items-center gap-1">
        <span className={`font-semibold tracking-wider ${valueClassName}`}>
          {shown ? text : '•••••'}
        </span>
        <EyeButton
          shown={shown}
          onToggle={() => setShown(!shown)}
          shownLabel={shownLabel}
          hiddenLabel={hiddenLabel}
        />
      </span>
    </div>
  )
}

export function SurplusRow({ surplus }: { surplus: number }) {
  const sign = surplus >= 0 ? '+' : '−'
  const colorClass = surplus >= 0 ? 'text-emerald-600' : 'text-red-500'
  return (
    <HiddenAmountRow
      label="Số dư (để dành mua cầu)"
      text={`${sign}${formatVND(Math.abs(surplus))}`}
      valueClassName={colorClass}
      shownLabel="Ẩn số dư"
      hiddenLabel="Hiện số dư"
    />
  )
}

export function TotalCollectedRow({ total }: { total: number }) {
  return (
    <HiddenAmountRow
      label="Tổng thu"
      text={formatVND(total)}
      valueClassName="text-gray-900"
      shownLabel="Ẩn tổng thu"
      hiddenLabel="Hiện tổng thu"
    />
  )
}

export function PaidSummaryLine({
  players,
  results,
}: {
  players: Player[]
  results: PlayerResult[]
}) {
  const n = players.length
  const x = paidCount(players)
  if (n > 0 && x === n) {
    return <p className="text-sm text-emerald-600">✓ Đã thu đủ</p>
  }
  const unpaid = unpaidAmount(players, results)
  return (
    <p className="text-sm text-gray-500">
      Đã thu {x}/{n} · còn thiếu <span className="text-amber-600">{formatVND(unpaid)}</span>
    </p>
  )
}

function QRIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  )
}

function PlayerRow({
  p,
  mode,
  large,
  paid,
  onTogglePaid,
  onShowQR,
}: {
  p: PlayerResult
  mode: Mode
  large?: boolean
  paid: boolean
  onTogglePaid: () => void
  onShowQR: () => void
}) {
  return (
    <li
      className={`flex justify-between items-center rounded-xl px-3 py-2.5 transition-colors duration-200 ${
        paid ? 'bg-emerald-50' : 'bg-gray-50'
      }`}
    >
      <div>
        <span className={`font-medium text-gray-900 block ${large ? 'text-lg' : ''}`}>
          {p.name}{' '}
          <span className="text-xs text-gray-400">
            ({p.gender === 'male' ? 'Nam' : 'Nữ'}
            {mode === 'ratio' && p.halfSession ? ' · ½ buổi' : ''}
            {mode === 'hourly' && p.hours !== null ? ` · ${formatHours(p.hours)}` : ''})
          </span>
        </span>
        {mode === 'hourly' && (
          <span className="text-xs text-gray-400">
            sân {formatNumber(p.courtShare)} + cầu {formatNumber(p.shuttleShare)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Mã QR cho ${p.name}`}
          title={`Mã QR cho ${p.name}`}
          onClick={onShowQR}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
        >
          <QRIcon />
        </button>
        <PaidToggle paid={paid} name={p.name} onToggle={onTogglePaid} />
        <span className={`font-bold text-gray-900 ${large ? 'text-xl' : ''}`}>{formatVND(p.amount)}</span>
      </div>
    </li>
  )
}

function MaximizeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  )
}

function DownloadImageButton({
  result,
  mode,
  players,
}: {
  result: CalcResult
  mode: Mode
  players: Player[]
}) {
  const handleDownload = () => {
    downloadResultImage(result, mode, players)
    toast.success('Đã tải ảnh kết quả')
  }
  return (
    <button
      type="button"
      aria-label="Tải ảnh kết quả"
      title="Tải ảnh kết quả"
      onClick={handleDownload}
      className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
    >
      <DownloadIcon />
    </button>
  )
}

function FullscreenResult({
  result,
  mode,
  players,
  onTogglePaid,
  onShowQR,
  onClose,
}: {
  result: CalcResult
  mode: Mode
  players: Player[]
  onTogglePaid: (playerId: string) => void
  onShowQR: (playerId: string) => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Portaled to <body>: the panel lives inside an md:sticky column whose
  // stacking context would otherwise let z-10 elements elsewhere paint on top.
  return createPortal(
    <motion.div
      data-testid="fullscreen-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.97 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.97 }}
        transition={{ duration: 0.2 }}
      >
        <div className="sticky top-0 bg-gray-50 border-b border-gray-100 flex items-center justify-between px-4 py-4">
          <h2 className="text-lg font-bold text-gray-900">Kết quả</h2>
          <div className="flex items-center gap-1">
            <DownloadImageButton result={result} mode={mode} players={players} />
            <button
              type="button"
              aria-label="Đóng"
              title="Đóng"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
        <div className="max-w-lg md:max-w-3xl mx-auto py-6 px-4">
          {mode === 'hourly' && result.emptyHours > 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-2">
              Có {formatHours(result.emptyHours)} sân thuê không ai chơi — phần này được chia đều.
            </p>
          )}
          <div className="mb-2">
            <PaidSummaryLine players={players} results={result.players} />
          </div>
          <ul data-testid="fullscreen-player-grid" className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {result.players.map((p) => (
              <PlayerRow
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
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
            <TotalCollectedRow total={result.totalCollected} />
            <SurplusRow surplus={result.surplus} />
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

interface Props {
  result: CalcResult | null
  mode: Mode
  errors: string[]
  players: Player[]
  onSave: () => void
  onNewSession: () => void
  onPatch: (patch: Partial<SessionInput>) => void
  saveDisabled?: boolean
}

const NO_PLAYERS_ERROR = 'Cần ít nhất 1 người chơi'

export function ResultPanel({
  result,
  mode,
  errors,
  players,
  onSave,
  onNewSession,
  onPatch,
  saveDisabled,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false)
  const [qrPlayerId, setQrPlayerId] = useState<string | null>(null)
  const isEmptyPlayers = errors.length === 1 && errors[0] === NO_PLAYERS_ERROR
  const handleTogglePaid = (playerId: string) => {
    onPatch({ players: players.map((pl) => (pl.id === playerId ? { ...pl, paid: !pl.paid } : pl)) })
  }
  const qrResult = result?.players.find((p) => p.playerId === qrPlayerId) ?? null

  return (
    <section className="bg-white rounded-2xl shadow-sm p-4 border-2 border-emerald-100">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-bold text-gray-900">Kết quả</h2>
        {result !== null && (
          <div className="flex items-center gap-1">
            <DownloadImageButton result={result} mode={mode} players={players} />
            <button
              type="button"
              aria-label="Xem toàn màn hình"
              title="Xem toàn màn hình"
              onClick={() => setFullscreen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
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
            className="flex flex-col items-center text-center py-8"
          >
            <span className="text-5xl mb-2" role="img" aria-label="Cầu lông">
              🏸
            </span>
            <p className="font-semibold text-gray-700">Chưa có ai trong buổi này</p>
            <p className="text-sm text-gray-400 mt-1">
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
          {mode === 'hourly' && result.emptyHours > 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-2">
              Có {formatHours(result.emptyHours)} sân thuê không ai chơi — phần này được chia đều.
            </p>
          )}
          <ul className="space-y-2">
            {result.players.map((p) => (
              <PlayerRow
                key={p.playerId}
                p={p}
                mode={mode}
                paid={players.find((pl) => pl.id === p.playerId)?.paid ?? false}
                onTogglePaid={() => handleTogglePaid(p.playerId)}
                onShowQR={() => setQrPlayerId(p.playerId)}
              />
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
            <TotalCollectedRow total={result.totalCollected} />
            <SurplusRow surplus={result.surplus} />
          </div>
        </>
      )}

      <button
        type="button"
        disabled={result === null || saveDisabled}
        onClick={onSave}
        className="w-full h-14 mt-4 rounded-2xl bg-emerald-600 text-white text-base font-bold shadow-md disabled:bg-gray-300"
      >
        Lưu buổi này
      </button>

      <button
        type="button"
        onClick={onNewSession}
        className="w-full h-12 mt-2 rounded-xl border border-gray-300 text-gray-600 font-semibold"
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
          paid={players.find((pl) => pl.id === qrResult.playerId)?.paid ?? false}
          onTogglePaid={() => handleTogglePaid(qrResult.playerId)}
        />
      )}
    </section>
  )
}
