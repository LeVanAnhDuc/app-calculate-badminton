import { useEffect, useState } from 'react'
import { formatNumber, formatVND } from '../lib/format'
import { formatHours } from '../lib/time'
import type { CalcResult, Mode, PlayerResult } from '../lib/types'
import { EyeButton } from './EyeButton'

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

function PlayerRow({ p, mode, large }: { p: PlayerResult; mode: Mode; large?: boolean }) {
  return (
    <li className="flex justify-between items-center bg-gray-50 rounded-xl px-3 py-2.5">
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
      <span className={`font-bold text-gray-900 ${large ? 'text-xl' : ''}`}>{formatVND(p.amount)}</span>
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

function FullscreenResult({
  result,
  mode,
  onClose,
}: {
  result: CalcResult
  mode: Mode
  onClose: () => void
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto">
      <div className="sticky top-0 bg-gray-50 border-b border-gray-100 flex items-center justify-between px-4 py-4">
        <h2 className="text-lg font-bold text-gray-900">Kết quả</h2>
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
      <div className="max-w-lg mx-auto py-6 px-4">
        {mode === 'hourly' && result.emptyHours > 0 && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-2">
            Có {formatHours(result.emptyHours)} sân thuê không ai chơi — phần này được chia đều.
          </p>
        )}
        <ul className="space-y-2">
          {result.players.map((p) => (
            <PlayerRow key={p.playerId} p={p} mode={mode} large />
          ))}
        </ul>
        <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
          <TotalCollectedRow total={result.totalCollected} />
          <SurplusRow surplus={result.surplus} />
        </div>
      </div>
    </div>
  )
}

interface Props {
  result: CalcResult | null
  mode: Mode
  errors: string[]
  onSave: () => void
}

export function ResultPanel({ result, mode, errors, onSave }: Props) {
  const [fullscreen, setFullscreen] = useState(false)

  return (
    <section className="bg-white rounded-2xl shadow-sm p-4 border-2 border-emerald-100">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-bold text-gray-900">Kết quả</h2>
        {result !== null && (
          <button
            type="button"
            aria-label="Xem toàn màn hình"
            title="Xem toàn màn hình"
            onClick={() => setFullscreen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
          >
            <MaximizeIcon />
          </button>
        )}
      </div>

      {result === null ? (
        <ul className="space-y-1">
          {errors.map((e) => (
            <li key={e} className="text-sm text-amber-600">
              {e}
            </li>
          ))}
        </ul>
      ) : (
        <>
          {mode === 'hourly' && result.emptyHours > 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-2">
              Có {formatHours(result.emptyHours)} sân thuê không ai chơi — phần này được chia đều.
            </p>
          )}
          <ul className="space-y-2">
            {result.players.map((p) => (
              <PlayerRow key={p.playerId} p={p} mode={mode} />
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
        disabled={result === null}
        onClick={onSave}
        className="w-full h-14 mt-4 rounded-2xl bg-emerald-600 text-white text-base font-bold shadow-md disabled:bg-gray-300"
      >
        Lưu buổi này
      </button>

      {fullscreen && result !== null && (
        <FullscreenResult result={result} mode={mode} onClose={() => setFullscreen(false)} />
      )}
    </section>
  )
}
