import { useState } from 'react'
import type { RosterEntry } from '../lib/storage'
import { durationHours, formatHours } from '../lib/time'
import type { Gender, Player, SessionInput } from '../lib/types'

interface Props {
  input: SessionInput
  roster: RosterEntry[]
  onPatch: (p: Partial<SessionInput>) => void
  onAddPlayer: (name: string, gender: Gender) => void
}

export function PlayerList({ input, roster, onPatch, onAddPlayer }: Props) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const males = input.players.filter((p) => p.gender === 'male').length
  const females = input.players.length - males

  const inSession = (n: string) =>
    input.players.some((p) => p.name.toLowerCase() === n.trim().toLowerCase())

  const suggestions = name.trim()
    ? roster.filter(
        (r) => r.name.toLowerCase().startsWith(name.trim().toLowerCase()) && !inSession(r.name),
      )
    : []

  const add = (n: string, g: Gender) => {
    const trimmed = n.trim()
    if (!trimmed) return
    if (inSession(trimmed)) {
      setError(`"${trimmed}" đã có trong buổi`)
      return
    }
    setError('')
    setName('')
    onAddPlayer(trimmed, g)
  }

  const updatePlayer = (id: string, patch: Partial<Player>) =>
    onPatch({ players: input.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) })

  const removePlayer = (id: string) =>
    onPatch({ players: input.players.filter((p) => p.id !== id) })

  const timeLabel = (p: Player) => {
    const s = p.startTime ?? input.courtStart
    const e = p.endTime ?? input.courtEnd
    const full = p.startTime === null && p.endTime === null
    return `${s}–${e} · ${full ? 'cả buổi' : formatHours(durationHours(s, e))}`
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-bold text-gray-900">Người chơi</h2>
        <span className="text-xs font-semibold text-white bg-emerald-600 rounded-full px-2.5 py-1">
          {males} nam · {females} nữ
        </span>
      </div>

      <div className="flex gap-2">
        <input
          placeholder="Tên người chơi"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && add(name, gender)}
          className="flex-1 min-w-0 h-12 rounded-xl border border-gray-300 px-3 text-base"
        />
        <div className="flex rounded-xl border border-gray-300 overflow-hidden shrink-0">
          {(['male', 'female'] as Gender[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`h-12 px-3 text-sm font-semibold ${
                gender === g ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500'
              }`}
            >
              {g === 'male' ? 'Nam' : 'Nữ'}
            </button>
          ))}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {suggestions.slice(0, 6).map((r) => (
            <button
              key={r.name}
              type="button"
              onClick={() => add(r.name, r.gender)}
              className="h-9 px-3 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium"
            >
              {r.name} · {r.gender === 'male' ? 'Nam' : 'Nữ'}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      <button
        type="button"
        onClick={() => add(name, gender)}
        className="w-full h-12 mt-2 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-600 font-semibold text-sm"
      >
        + Thêm người chơi
      </button>

      <ul className="mt-3 divide-y divide-gray-100">
        {input.players.map((p) => (
          <li key={p.id} className="py-2.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="flex items-center gap-2 text-left"
                onClick={() =>
                  input.mode === 'hourly' && setExpandedId(expandedId === p.id ? null : p.id)
                }
              >
                <span
                  className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center ${
                    p.gender === 'male'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-pink-100 text-pink-700'
                  }`}
                >
                  {p.gender === 'male' ? 'N' : 'Nữ'}
                </span>
                <span>
                  <span className="font-medium text-gray-900 block">{p.name}</span>
                  {input.mode === 'hourly' && (
                    <span
                      className={`text-xs ${
                        p.startTime === null ? 'text-gray-400' : 'font-semibold text-emerald-700'
                      }`}
                    >
                      {timeLabel(p)}
                    </span>
                  )}
                </span>
              </button>
              <div className="flex items-center gap-1">
                {input.mode === 'ratio' && (
                  <button
                    type="button"
                    aria-label={`½ buổi ${p.name}`}
                    onClick={() => updatePlayer(p.id, { halfSession: !p.halfSession })}
                    className={`h-8 px-2.5 rounded-full text-xs font-semibold ${
                      p.halfSession
                        ? 'bg-emerald-600 text-white'
                        : 'border border-gray-200 text-gray-400'
                    }`}
                  >
                    {p.halfSession ? '½ buổi ✓' : '½ buổi'}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Xóa ${p.name}`}
                  onClick={() => removePlayer(p.id)}
                  className="w-8 h-8 text-gray-300 text-xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            {input.mode === 'hourly' && expandedId === p.id && (
              <div className="flex gap-2 items-center mt-2">
                <input
                  type="time"
                  aria-label={`Giờ vào của ${p.name}`}
                  value={p.startTime ?? input.courtStart}
                  onChange={(e) =>
                    updatePlayer(p.id, {
                      startTime: e.target.value,
                      endTime: p.endTime ?? input.courtEnd,
                    })
                  }
                  className="flex-1 h-11 rounded-xl border border-emerald-300 bg-white px-2 text-base font-semibold text-center"
                />
                <span className="text-gray-400">→</span>
                <input
                  type="time"
                  aria-label={`Giờ ra của ${p.name}`}
                  value={p.endTime ?? input.courtEnd}
                  onChange={(e) =>
                    updatePlayer(p.id, {
                      endTime: e.target.value,
                      startTime: p.startTime ?? input.courtStart,
                    })
                  }
                  className="flex-1 h-11 rounded-xl border border-emerald-300 bg-white px-2 text-base font-semibold text-center"
                />
                <button
                  type="button"
                  onClick={() => updatePlayer(p.id, { startTime: null, endTime: null })}
                  className="h-11 px-3 rounded-xl bg-white border border-emerald-300 text-emerald-700 text-xs font-semibold whitespace-nowrap"
                >
                  Cả buổi
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {input.mode === 'hourly' && (
        <p className="text-xs text-gray-400 mt-2">
          Bấm vào tên để sửa giờ chơi của người đến muộn / về sớm
        </p>
      )}
    </section>
  )
}
