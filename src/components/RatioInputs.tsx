import { useRef, useState } from 'react'
import { parseRatio } from '../lib/format'

interface Props {
  maleRatio: number
  femaleRatio: number
  note?: string
  onChange: (p: { maleRatio?: number; femaleRatio?: number }) => void
}

interface FieldProps {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
}

/**
 * Ô hệ số: không đặt `type="number"` (bàn phím tiếng Việt cho dấu phẩy, mà
 * input number coi `1,5` là không hợp lệ và trả về chuỗi rỗng). Giữ chuỗi
 * người dùng đang gõ trong `draft` để `1,` không bị nuốt, chỉ báo lên trên
 * khi parse ra số dương.
 */
function RatioField({ id, label, value, onChange }: FieldProps) {
  const [draft, setDraft] = useState(() => String(value))
  const lastValue = useRef(value)

  // prop đổi từ bên ngoài (nạp lại buổi cũ) thì draft phải theo — trừ khi
  // draft đang chính là giá trị đó, tức người dùng vừa gõ ra nó
  if (lastValue.current !== value) {
    lastValue.current = value
    if (parseRatio(draft) !== value) setDraft(String(value))
  }

  return (
    <div className="flex-1">
      <label className="text-xs text-gray-500 block mb-1" htmlFor={id}>{label}</label>
      <input
        id={id}
        inputMode="decimal"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          const parsed = parseRatio(e.target.value)
          if (parsed !== null) onChange(parsed)
        }}
        onBlur={() => {
          if (parseRatio(draft) === null) setDraft(String(value))
        }}
        className="w-full h-12 rounded-xl border border-gray-300 px-3 text-lg font-semibold text-center"
      />
    </div>
  )
}

export function RatioInputs({ maleRatio, femaleRatio, note, onChange }: Props) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-4">
      <h2 className="text-base font-bold text-gray-900 mb-1">Hệ số nam / nữ</h2>
      {note && <p className="text-xs text-gray-400 mb-3">{note}</p>}
      <div className="flex gap-3 mt-2">
        <RatioField
          id="ratio-male"
          label="Nam"
          value={maleRatio}
          onChange={(v) => onChange({ maleRatio: v })}
        />
        <RatioField
          id="ratio-female"
          label="Nữ"
          value={femaleRatio}
          onChange={(v) => onChange({ femaleRatio: v })}
        />
      </div>
    </section>
  )
}
