import { useState, type TouchEvent } from 'react'
import type { RosterEntry } from '../lib/storage'
import { durationHours, formatHours } from '../lib/time'
import type { Gender, Player, SessionInput } from '../lib/types'

interface Props {
  input: SessionInput
  roster: RosterEntry[]
  onPatch: (p: Partial<SessionInput>) => void
  onAddPlayer: (name: string, gender: Gender) => void
  onChangeGender: (playerId: string) => void
}

const SWIPE_OPEN_PX = 80
const SWIPE_THRESHOLD_PX = 40

function GenderBadge({ gender }: { gender: Gender }) {
  return (
    <span
      className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
        gender === 'male' ? 'bg-emerald-100 text-emerald-700' : 'bg-pink-100 text-pink-700'
      }`}
    >
      {gender === 'male' ? 'N' : 'Nữ'}
    </span>
  )
}

export function PlayerList({ input, roster, onPatch, onAddPlayer, onChangeGender }: Props) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)
  const [swipe, setSwipe] = useState<{ id: string; startX: number; deltaX: number } | null>(null)

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

  const rowTranslate = (id: string) => {
    if (swipe && swipe.id === id) return swipe.deltaX
    return openSwipeId === id ? -SWIPE_OPEN_PX : 0
  }

  const handleTouchStart = (id: string) => (e: TouchEvent) => {
    setSwipe({ id, startX: e.touches[0].clientX, deltaX: 0 })
  }

  const handleTouchMove = (id: string) => (e: TouchEvent) => {
    setSwipe((s) => {
      if (!s || s.id !== id) return s
      const dx = e.touches[0].clientX - s.startX
      return { ...s, deltaX: Math.min(0, Math.max(dx, -SWIPE_OPEN_PX)) }
    })
  }

  const handleTouchEnd = (id: string) => () => {
    setSwipe((s) => {
      if (!s || s.id !== id) return s
      setOpenSwipeId(s.deltaX <= -SWIPE_THRESHOLD_PX ? id : null)
      return null
    })
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
        <div className="flex flex-col gap-2 mt-2">
          {suggestions.slice(0, 6).map((r) => (
            <button
              key={r.name}
              type="button"
              aria-label={`${r.name} · ${r.gender === 'male' ? 'Nam' : 'Nữ'}`}
              onClick={() => add(r.name, r.gender)}
              className="w-full h-12 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center gap-2 px-3 text-left"
            >
              <GenderBadge gender={r.gender} />
              <span className="font-medium text-gray-900 flex-1">{r.name}</span>
              <span className="text-xs text-gray-400">{r.gender === 'male' ? 'Nam' : 'Nữ'}</span>
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
        {input.players.map((p) => {
          const isOpen = openSwipeId === p.id
          return (
            <li key={p.id} className="relative overflow-hidden">
              <button
                type="button"
                aria-label={`Xóa nhanh ${p.name}`}
                onClick={() => removePlayer(p.id)}
                className="absolute inset-y-0 right-0 w-20 bg-red-500 text-white text-sm font-semibold flex items-center justify-center"
              >
                Xóa
              </button>
              <div
                data-testid={`swipe-row-${p.id}`}
                className="relative bg-white py-2.5 transition-transform duration-150 ease-out"
                style={{ transform: `translateX(${rowTranslate(p.id)}px)` }}
                onTouchStart={handleTouchStart(p.id)}
                onTouchMove={handleTouchMove(p.id)}
                onTouchEnd={handleTouchEnd(p.id)}
                onClickCapture={(e) => {
                  if (isOpen) {
                    setOpenSwipeId(null)
                    e.stopPropagation()
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Đổi giới tính ${p.name}`}
                      title="Đổi giới tính"
                      onClick={() => onChangeGender(p.id)}
                    >
                      <GenderBadge gender={p.gender} />
                    </button>
                    <button
                      type="button"
                      className="text-left"
                      onClick={() =>
                        input.mode === 'hourly' && setExpandedId(expandedId === p.id ? null : p.id)
                      }
                    >
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
                    </button>
                  </div>
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
                      className="w-8 h-8 md:w-10 md:h-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-2xl leading-none"
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
              </div>
            </li>
          )
        })}
      </ul>
      {input.mode === 'hourly' && (
        <p className="text-xs text-gray-400 mt-2">
          Bấm vào tên để sửa giờ chơi của người đến muộn / về sớm
        </p>
      )}
    </section>
  )
}
