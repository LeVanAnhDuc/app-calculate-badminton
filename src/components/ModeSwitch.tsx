import type { Mode } from '../lib/types'

const LABELS: Record<Mode, string> = { ratio: 'Chia theo tỉ lệ', hourly: 'Sân theo giờ' }

export function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="grid grid-cols-2 bg-white rounded-2xl shadow-sm p-1">
      {(Object.keys(LABELS) as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`h-12 rounded-xl text-sm font-semibold ${
            m === mode ? 'bg-emerald-600 text-white' : 'text-gray-500'
          }`}
        >
          {LABELS[m]}
        </button>
      ))}
    </div>
  )
}
