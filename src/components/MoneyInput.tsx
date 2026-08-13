import { useLayoutEffect, useRef, useState, type ChangeEvent } from 'react'
import { formatNumber, parseMoney } from '../lib/format'

interface Props {
  value: number
  onChange: (v: number) => void
  className?: string
  'aria-label'?: string
  id?: string
}

/** Position (in `formatted`) right after the `digitsBeforeCaret`-th digit character. */
function caretPositionForDigitCount(formatted: string, digitsBeforeCaret: number): number {
  if (digitsBeforeCaret <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      seen++
      if (seen === digitsBeforeCaret) return i + 1
    }
  }
  return formatted.length
}

export function MoneyInput({ value, onChange, className = '', id, ...rest }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingCaret, setPendingCaret] = useState<number | null>(null)
  const display = value === 0 ? '' : formatNumber(value)

  useLayoutEffect(() => {
    if (pendingCaret !== null && inputRef.current) {
      inputRef.current.setSelectionRange(pendingCaret, pendingCaret)
      setPendingCaret(null)
    }
  }, [display, pendingCaret])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const caretPos = e.target.selectionStart ?? rawValue.length
    const digitsBeforeCaret = rawValue.slice(0, caretPos).replace(/\D/g, '').length
    const newValue = parseMoney(rawValue)
    const newDisplay = newValue === 0 ? '' : formatNumber(newValue)
    setPendingCaret(caretPositionForDigitCount(newDisplay, digitsBeforeCaret))
    onChange(newValue)
  }

  return (
    <input
      ref={inputRef}
      id={id}
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder="0"
      className={`h-12 rounded-xl border border-gray-300 px-3 text-lg font-semibold text-gray-900 text-right ${className}`}
      {...rest}
    />
  )
}
