interface Props {
  maleRatio: number
  femaleRatio: number
  note?: string
  onChange: (p: { maleRatio?: number; femaleRatio?: number }) => void
}

export function RatioInputs({ maleRatio, femaleRatio, note, onChange }: Props) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-4">
      <h2 className="text-base font-bold text-gray-900 mb-1">Hệ số nam / nữ</h2>
      {note && <p className="text-xs text-gray-400 mb-3">{note}</p>}
      <div className="flex gap-3 mt-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1" htmlFor="ratio-male">Nam</label>
          <input
            id="ratio-male"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0.1"
            value={maleRatio}
            onChange={(e) => onChange({ maleRatio: Number(e.target.value) })}
            className="w-full h-12 rounded-xl border border-gray-300 px-3 text-lg font-semibold text-center"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1" htmlFor="ratio-female">Nữ</label>
          <input
            id="ratio-female"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0.1"
            value={femaleRatio}
            onChange={(e) => onChange({ femaleRatio: Number(e.target.value) })}
            className="w-full h-12 rounded-xl border border-gray-300 px-3 text-lg font-semibold text-center"
          />
        </div>
      </div>
    </section>
  )
}
