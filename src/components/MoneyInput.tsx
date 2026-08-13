import { formatNumber, parseMoney } from '../lib/format'

interface Props {
  value: number
  onChange: (v: number) => void
  className?: string
  'aria-label'?: string
  id?: string
}

export function MoneyInput({ value, onChange, className = '', id, ...rest }: Props) {
  return (
    <input
      id={id}
      inputMode="numeric"
      value={value === 0 ? '' : formatNumber(value)}
      onChange={(e) => onChange(parseMoney(e.target.value))}
      placeholder="0"
      className={`h-12 rounded-xl border border-gray-300 px-3 text-lg font-semibold text-gray-900 text-right ${className}`}
      {...rest}
    />
  )
}
