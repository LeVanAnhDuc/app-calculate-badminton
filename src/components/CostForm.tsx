import { shuttleTotal } from '../lib/calc'
import { formatVND } from '../lib/format'
import { durationHours, formatHours } from '../lib/time'
import type { SessionInput } from '../lib/types'
import { MoneyInput } from './MoneyInput'
import { TimeSelect } from './TimeSelect'

interface Props {
  input: SessionInput
  onPatch: (p: Partial<SessionInput>) => void
}

export function CostForm({ input, onPatch }: Props) {
  const courtHours = durationHours(input.courtStart, input.courtEnd)
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
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
        <span className="text-sm font-bold text-gray-900">TỔNG CHI</span>
        <span className="text-xl font-bold text-emerald-600">
          {formatVND(shuttleTotal(input) + input.courtFee)}
        </span>
      </div>
    </section>
  )
}
