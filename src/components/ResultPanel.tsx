import { useState } from 'react'
import { formatNumber, formatVND } from '../lib/format'
import { formatHours } from '../lib/time'
import type { CalcResult, Mode } from '../lib/types'
import { EyeButton } from './EyeButton'

export function SurplusRow({ surplus }: { surplus: number }) {
  const [shown, setShown] = useState(false)
  const sign = surplus >= 0 ? '+' : '−'
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">Số dư (để dành mua cầu)</span>
      <span className="flex items-center gap-1">
        <span className="font-semibold text-emerald-600 tracking-wider">
          {shown ? `${sign}${formatVND(Math.abs(surplus))}` : '•••••'}
        </span>
        <EyeButton shown={shown} onToggle={() => setShown(!shown)} />
      </span>
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
  return (
    <section className="bg-white rounded-2xl shadow-sm p-4 border-2 border-emerald-100">
      <h2 className="text-base font-bold text-gray-900 mb-3">Kết quả</h2>

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
              <li
                key={p.playerId}
                className="flex justify-between items-center bg-gray-50 rounded-xl px-3 py-2.5"
              >
                <div>
                  <span className="font-medium text-gray-900 block">
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
                <span className="font-bold text-gray-900">{formatVND(p.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tổng thu</span>
              <span className="font-semibold text-gray-900">{formatVND(result.totalCollected)}</span>
            </div>
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
    </section>
  )
}
