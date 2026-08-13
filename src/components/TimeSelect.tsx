const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

interface Props {
  value: string // "HH:mm"
  onChange: (value: string) => void
  'aria-label': string
  className?: string
}

/**
 * A 24h time picker built from two native <select>s (hour / 5-minute steps),
 * so it never falls back to the host OS's 12h AM/PM native `<input type="time">`
 * rendering. Reads/writes the same "HH:mm" string format used everywhere else.
 */
export function TimeSelect({ value, onChange, 'aria-label': label, className = '' }: Props) {
  const [hh, mm] = value.split(':')
  const minuteOptions = MINUTES.includes(mm) ? MINUTES : [...MINUTES, mm].sort()

  return (
    <fieldset
      aria-label={label}
      className={`flex items-center gap-1 border-0 p-0 m-0 ${className}`}
    >
      <select
        aria-label={`${label} (giờ)`}
        value={hh}
        onChange={(e) => onChange(`${e.target.value}:${mm}`)}
        className="h-12 rounded-xl border border-gray-300 font-semibold text-center px-1 flex-1"
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="font-semibold text-gray-400">:</span>
      <select
        aria-label={`${label} (phút)`}
        value={mm}
        onChange={(e) => onChange(`${hh}:${e.target.value}`)}
        className="h-12 rounded-xl border border-gray-300 font-semibold text-center px-1 flex-1"
      >
        {minuteOptions.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </fieldset>
  )
}
