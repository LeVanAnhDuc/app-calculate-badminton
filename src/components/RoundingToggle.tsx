import type { Rounding } from '../lib/types'

const LABELS: Record<Rounding, string> = {
  up1000: 'Làm tròn lên 1.000đ',
  exact: 'Giữ chính xác',
}

export function RoundingToggle({
  rounding,
  onChange,
}: {
  rounding: Rounding
  onChange: (r: Rounding) => void
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-4">
      <h2 className="text-base font-bold text-gray-900 mb-3">Làm tròn</h2>
      <div className="grid grid-cols-2 bg-gray-100 rounded-xl p-1">
        {(Object.keys(LABELS) as Rounding[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={`h-11 rounded-lg text-sm font-semibold ${
              r === rounding ? 'bg-emerald-600 text-white' : 'text-gray-500'
            }`}
          >
            {LABELS[r]}
          </button>
        ))}
      </div>
    </section>
  )
}
