import { useEffect, useRef, useState } from 'react'
import { extrasTotal, shuttleTotal } from '../lib/calc'
import { formatVND } from '../lib/format'
import { durationHours, formatHours } from '../lib/time'
import type { ExtraCost, SessionInput } from '../lib/types'
import { uid } from '../lib/uid'
import { MoneyInput } from './MoneyInput'
import { TimeSelect } from './TimeSelect'

interface Props {
  input: SessionInput
  onPatch: (p: Partial<SessionInput>) => void
}

export function CostForm({ input, onPatch }: Props) {
  const courtHours = durationHours(input.courtStart, input.courtEnd)
  const extras = input.extras
  const noPlayers = input.players.length === 0

  // focus the label field of the row that was just appended
  const [focusId, setFocusId] = useState<string | null>(null)
  const labelRefs = useRef<Record<string, HTMLInputElement | null>>({})
  useEffect(() => {
    if (focusId === null) return
    labelRefs.current[focusId]?.focus()
    setFocusId(null)
  }, [focusId])

  const patchExtra = (id: string, patch: Partial<ExtraCost>) =>
    onPatch({ extras: extras.map((e) => (e.id === id ? { ...e, ...patch } : e)) })

  const addExtra = () => {
    if (noPlayers) return
    const extra: ExtraCost = { id: uid(), label: '', amount: 0, playerId: input.players[0].id }
    onPatch({ extras: [...extras, extra] })
    setFocusId(extra.id)
  }

  // deleting one row is not undoable on purpose — it is retyped in two seconds;
  // undo is reserved for deleting a player or a whole session
  const removeExtra = (id: string) => onPatch({ extras: extras.filter((e) => e.id !== id) })

  return (
    <section className="bg-white rounded-2xl shadow-sm p-4">
      <h2 className="text-base font-bold text-gray-900 mb-3">Chi phí</h2>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1" htmlFor="shuttle-count">Số quả cầu</label>
          <input
            id="shuttle-count"
            inputMode="numeric"
            value={input.shuttleCount === 0 ? '' : input.shuttleCount}
            placeholder="0"
            onChange={(e) =>
              onPatch({ shuttleCount: Number(e.target.value.replace(/\D/g, '') || 0) })
            }
            className="w-full h-12 rounded-xl border border-gray-300 px-3 text-lg font-semibold text-gray-900 text-center"
          />
        </div>
        <div className="pb-3 text-gray-400 font-bold">×</div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1" htmlFor="shuttle-price">Giá / quả</label>
          <MoneyInput
            id="shuttle-price"
            aria-label="Giá / quả"
            value={input.shuttlePrice}
            onChange={(v) => onPatch({ shuttlePrice: v })}
            className="w-full"
          />
        </div>
      </div>
      <div className="flex justify-between items-center mt-2 px-1">
        <span className="text-sm text-gray-500">Tiền cầu</span>
        <span className="text-sm font-semibold text-gray-900">{formatVND(shuttleTotal(input))}</span>
      </div>
      <div className="mt-3">
        <label className="text-xs text-gray-500 block mb-1" htmlFor="court-fee">Tiền sân</label>
        <MoneyInput
          id="court-fee"
          aria-label="Tiền sân"
          value={input.courtFee}
          onChange={(v) => onPatch({ courtFee: v })}
          className="w-full"
        />
      </div>
      {input.mode === 'hourly' && (
        <div className="mt-3">
          <label className="text-xs text-gray-500 block mb-1">Giờ thuê sân</label>
          <div className="flex gap-2 items-center">
            <TimeSelect
              aria-label="Giờ bắt đầu"
              value={input.courtStart}
              onChange={(v) => onPatch({ courtStart: v })}
              className="flex-1"
            />
            <span className="text-gray-400">→</span>
            <TimeSelect
              aria-label="Giờ kết thúc"
              value={input.courtEnd}
              onChange={(v) => onPatch({ courtEnd: v })}
              className="flex-1"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            = {formatHours(courtHours)} · người chơi mặc định theo giờ này
          </p>
        </div>
      )}
      <div className="mt-4">
        <h3 className="text-xs text-gray-500">Chi phí phát sinh khác</h3>
        <p className="text-xs text-gray-400">Chỉ người được chọn trả khoản này</p>
        {extras.length > 0 && (
          <ul className="mt-2 space-y-2">
            {extras.map((e) => (
              <li key={e.id} className="flex gap-2 h-11">
                <input
                  ref={(el) => {
                    labelRefs.current[e.id] = el
                  }}
                  aria-label="Tên khoản phát sinh"
                  placeholder="Tên khoản (nước, thuê vợt…)"
                  value={e.label}
                  onChange={(ev) => patchExtra(e.id, { label: ev.target.value })}
                  className="flex-1 min-w-0 h-11 rounded-xl border border-gray-300 px-3 text-sm text-gray-900"
                />
                <MoneyInput
                  aria-label={`Số tiền của ${e.label || 'khoản khác'}`}
                  value={e.amount}
                  onChange={(v) => patchExtra(e.id, { amount: v })}
                  className="w-28 h-11! text-base!"
                />
                <select
                  aria-label="Người trả khoản này"
                  value={e.playerId}
                  onChange={(ev) => patchExtra(e.id, { playerId: ev.target.value })}
                  className="w-28 h-11 rounded-xl border border-gray-300 px-2 text-sm text-gray-900"
                >
                  {input.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={`Xóa khoản ${e.label || 'khác'}`}
                  onClick={() => removeExtra(e.id)}
                  className="w-9 h-9 shrink-0 self-center text-gray-400 text-xl leading-none"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={noPlayers}
          onClick={addExtra}
          className="w-full h-11 mt-2 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-600 font-semibold text-sm disabled:border-gray-200 disabled:text-gray-300"
        >
          + Thêm khoản
        </button>
        {noPlayers && (
          <p className="text-xs text-gray-400 mt-1">Thêm người chơi trước để gán khoản phát sinh</p>
        )}
      </div>
      {extras.length > 0 && (
        <div className="flex justify-between items-center mt-2 px-1">
          <span className="text-sm text-gray-500">Phát sinh</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatVND(extrasTotal(input))}
          </span>
        </div>
      )}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
        <span className="text-sm font-bold text-gray-900">TỔNG CHI</span>
        <span className="text-xl font-bold text-emerald-600">
          {formatVND(shuttleTotal(input) + input.courtFee + extrasTotal(input))}
        </span>
      </div>
    </section>
  )
}
