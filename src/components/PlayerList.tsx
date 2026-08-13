import { useState, type TouchEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Drawer } from 'vaul'
import type { RosterEntry } from '../lib/storage'
import { durationHours, formatHours } from '../lib/time'
import type { Gender, Player, SessionInput } from '../lib/types'
import { TimeSelect } from './TimeSelect'

interface Props {
  input: SessionInput
  roster: RosterEntry[]
  onPatch: (p: Partial<SessionInput>) => void
  onAddPlayer: (name: string, gender: Gender) => void
  onChangeGender: (playerId: string, gender: Gender) => void
  onRenamePlayer: (playerId: string, newName: string) => void
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

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  )
}

export function PlayerList({
  input,
  roster,
  onPatch,
  onAddPlayer,
  onChangeGender,
  onRenamePlayer,
}: Props) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState('')
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

  const openEdit = (p: Player) => {
    setOpenSwipeId(null)
    setEditingId(p.id)
    setEditName(p.name)
    setEditError('')
  }

  const commitRename = (p: Player) => {
    const trimmed = editName.trim()
    if (!trimmed) {
      setEditName(p.name)
      setEditError('')
      return
    }
    const isDuplicate = input.players.some(
      (o) => o.id !== p.id && o.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (isDuplicate) {
      setEditError(`"${trimmed}" đã có trong buổi`)
      return
    }
    setEditError('')
    if (trimmed !== p.name) {
      onRenamePlayer(p.id, trimmed)
    }
  }

  const editingPlayer = input.players.find((p) => p.id === editingId) ?? null

  const closeEdit = () => {
    if (editingPlayer) commitRename(editingPlayer)
    setEditingId(null)
  }

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

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-xs text-emerald-800 space-y-1 mb-3"
      >
        <p>💡 Bấm avatar để đổi giới tính</p>
        <p>💡 Bấm tên để sửa thông tin người chơi</p>
        <p>
          <span className="md:hidden">💡 Vuốt trái để xóa</span>
          <span className="hidden md:inline">💡 Bấm nút × để xóa</span>
        </p>
      </motion.div>

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
          {(['male', 'female'] as Gender[]).map((g) => {
            const active = gender === g
            return (
              <button
                key={g}
                type="button"
                aria-pressed={active}
                onClick={() => setGender(g)}
                className={`relative h-12 px-3 text-sm font-semibold ${
                  active ? 'text-white' : 'bg-white text-gray-500'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="gender-add-pill"
                    className={`absolute inset-0 ${g === 'male' ? 'bg-emerald-600' : 'bg-pink-500'}`}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                  />
                )}
                <span className="relative z-10">{g === 'male' ? 'Nam' : 'Nữ'}</span>
              </button>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-2 mt-2"
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      <button
        type="button"
        onClick={() => add(name, gender)}
        className="w-full h-12 mt-2 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-600 font-semibold text-sm"
      >
        + Thêm người chơi
      </button>

      {input.players.length === 0 ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="text-center text-sm text-gray-400 py-4"
        >
          Chưa có người chơi nào
        </motion.p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          <AnimatePresence initial={false}>
            {input.players.map((p) => {
              const isOpen = openSwipeId === p.id
              return (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                <div className="relative overflow-hidden">
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
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          aria-label={`Đổi giới tính ${p.name}`}
                          title="Đổi giới tính"
                          onClick={() =>
                            onChangeGender(p.id, p.gender === 'male' ? 'female' : 'male')
                          }
                        >
                          <GenderBadge gender={p.gender} />
                        </button>
                        <button
                          type="button"
                          className="text-left min-w-0"
                          onClick={() => openEdit(p)}
                        >
                          <span className="font-medium text-gray-900 block truncate">{p.name}</span>
                          {input.mode === 'hourly' && (
                            <span
                              className={`text-xs ${
                                p.startTime === null
                                  ? 'text-gray-400'
                                  : 'font-semibold text-emerald-700'
                              }`}
                            >
                              {timeLabel(p)}
                            </span>
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {input.mode === 'ratio' && (
                          <motion.button
                            type="button"
                            aria-pressed={p.halfSession}
                            aria-label={`½ buổi ${p.name}`}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updatePlayer(p.id, { halfSession: !p.halfSession })}
                            className={`h-9 px-2.5 rounded-full text-xs font-semibold transition-colors duration-200 ${
                              p.halfSession
                                ? 'bg-emerald-600 text-white'
                                : 'border border-gray-200 text-gray-400'
                            }`}
                          >
                            {p.halfSession ? '½ buổi ✓' : '½ buổi'}
                          </motion.button>
                        )}
                        <button
                          type="button"
                          aria-label={`Sửa ${p.name}`}
                          title="Sửa"
                          onClick={() => openEdit(p)}
                          className="hidden md:flex md:w-10 md:h-10 items-center justify-center text-gray-400 hover:bg-gray-100 rounded-lg"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          aria-label={`Xóa ${p.name}`}
                          onClick={() => removePlayer(p.id)}
                          className="hidden md:flex md:w-10 md:h-10 items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-2xl leading-none"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.li>
            )
          })}
          </AnimatePresence>
        </ul>
      )}
      {input.players.length > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          {input.mode === 'hourly'
            ? 'Bấm vào tên để sửa thông tin người chơi (kể cả giờ chơi)'
            : 'Bấm vào tên để sửa thông tin người chơi'}
        </p>
      )}

      <Drawer.Root
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) closeEdit()
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl bg-white outline-none">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="max-w-lg mx-auto p-4 pb-8">
              <Drawer.Title className="font-bold text-gray-900 mb-3">
                Sửa người chơi
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                Chỉnh sửa tên, giới tính và giờ chơi
              </Drawer.Description>
              {editingPlayer && (
                <div className="flex flex-col gap-2">
                  <div>
                    <input
                      aria-label={`Tên của ${editingPlayer.name}`}
                      value={editName}
                      onChange={(e) => {
                        setEditName(e.target.value)
                        setEditError('')
                      }}
                      onBlur={() => commitRename(editingPlayer)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                      }}
                      className="w-full h-11 rounded-xl border border-gray-300 px-3 text-base"
                    />
                    {editError && <p className="text-sm text-red-500 mt-1">{editError}</p>}
                  </div>
                  <div className="flex rounded-xl border border-gray-300 overflow-hidden">
                    <button
                      type="button"
                      aria-pressed={editingPlayer.gender === 'male'}
                      aria-label={`Đặt Nam cho ${editingPlayer.name}`}
                      onClick={() => onChangeGender(editingPlayer.id, 'male')}
                      className={`relative flex-1 h-11 text-sm font-semibold ${
                        editingPlayer.gender === 'male' ? 'text-white' : 'bg-white text-gray-500'
                      }`}
                    >
                      {editingPlayer.gender === 'male' && (
                        <motion.div
                          layoutId="gender-edit-pill"
                          className="absolute inset-0 bg-emerald-600"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                        />
                      )}
                      <span className="relative z-10">Nam</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={editingPlayer.gender === 'female'}
                      aria-label={`Đặt Nữ cho ${editingPlayer.name}`}
                      onClick={() => onChangeGender(editingPlayer.id, 'female')}
                      className={`relative flex-1 h-11 text-sm font-semibold ${
                        editingPlayer.gender === 'female' ? 'text-white' : 'bg-white text-gray-500'
                      }`}
                    >
                      {editingPlayer.gender === 'female' && (
                        <motion.div
                          layoutId="gender-edit-pill"
                          className="absolute inset-0 bg-pink-500"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                        />
                      )}
                      <span className="relative z-10">Nữ</span>
                    </button>
                  </div>
                  {input.mode === 'hourly' && (
                    <div className="flex gap-2 items-center">
                      <TimeSelect
                        nested
                        aria-label={`Giờ vào của ${editingPlayer.name}`}
                        value={editingPlayer.startTime ?? input.courtStart}
                        onChange={(v) =>
                          updatePlayer(editingPlayer.id, {
                            startTime: v,
                            endTime: editingPlayer.endTime ?? input.courtEnd,
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-gray-400">→</span>
                      <TimeSelect
                        nested
                        aria-label={`Giờ ra của ${editingPlayer.name}`}
                        value={editingPlayer.endTime ?? input.courtEnd}
                        onChange={(v) =>
                          updatePlayer(editingPlayer.id, {
                            endTime: v,
                            startTime: editingPlayer.startTime ?? input.courtStart,
                          })
                        }
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updatePlayer(editingPlayer.id, { startTime: null, endTime: null })
                        }
                        className="h-11 px-3 rounded-xl bg-white border border-emerald-300 text-emerald-700 text-xs font-semibold whitespace-nowrap"
                      >
                        Cả buổi
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="w-full h-11 mt-1 rounded-xl bg-emerald-600 text-white text-sm font-bold"
                  >
                    Xong
                  </button>
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </section>
  )
}
