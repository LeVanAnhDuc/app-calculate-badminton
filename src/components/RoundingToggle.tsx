import { motion } from 'motion/react'
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
        {(Object.keys(LABELS) as Rounding[]).map((r) => {
          const active = r === rounding
          return (
            <button
              key={r}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(r)}
              className={`relative h-11 rounded-lg text-sm font-semibold ${
                active ? 'text-white' : 'text-gray-500'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="rounding-pill"
                  className="absolute inset-0 rounded-lg bg-emerald-600"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                />
              )}
              <span className="relative z-10">{LABELS[r]}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
