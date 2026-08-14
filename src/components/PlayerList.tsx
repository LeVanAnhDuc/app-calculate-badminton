import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Drawer } from 'vaul'
import type { RosterEntry } from '../lib/storage'
import { durationHours, formatHours } from '../lib/time'
import type { Gender, Player, SessionInput } from '../lib/types'
import { GenderBadge } from './GenderBadge'
import { PlayerRow } from './PlayerRow'
import { TimeSelect } from './TimeSelect'

interface Props {
  input: SessionInput
  roster: RosterEntry[]
  onPatch: (p: Partial<SessionInput>) => void
  onAddPlayer: (name: string, gender: Gender) => void
  onChangeGender: (playerId: string, gender: Gender) => void
  onRenamePlayer: (playerId: string, newName: string) => void
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

  const males = input.players.filter((p) => p.gender === 'male').length
  const females = input.players.length - males

  const inSession = (n: string) =>
    input.players.some((p) => p.name.toLowerCase() === n.trim().toLowerCase())

  const trimmedName = name.trim()

  const suggestions = trimmedName
    ? roster.filter(
        (r) => r.name.toLowerCase().startsWith(trimmedName.toLowerCase()) && !inSession(r.name),
      )
    : []

  const rosterMatch = trimmedName
    ? (roster.find((r) => r.name.toLowerCase() === trimmedName.toLowerCase()) ?? null)
    : null
  const showNewHint = trimmedName !== '' && rosterMatch === null && !inSession(trimmedName)
  const showRosterHint = rosterMatch !== null

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

      {showNewHint && (
        <p className="text-xs text-emerald-700 mt-1.5 px-1">
          ✨ Người mới — sẽ được thêm vào danh bạ
        </p>
      )}
      {showRosterHint && (
        <p className="text-xs text-gray-400 mt-1.5 px-1">
          📇 Có trong danh bạ — bấm thẻ gợi ý để thêm đúng giới tính
        </p>
      )}

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
            <p className="text-xs font-semibold text-gray-400 px-1">Từ danh bạ</p>
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
            {input.players.map((p) => (
              <PlayerRow
                key={p.id}
                player={p}
                mode={input.mode}
                timeLabel={timeLabel(p)}
                isSwipeOpen={openSwipeId === p.id}
                onSwipeOpenChange={setOpenSwipeId}
                onRemove={removePlayer}
                onChangeGender={onChangeGender}
                onEdit={openEdit}
                onToggleHalf={(pl) => updatePlayer(pl.id, { halfSession: !pl.halfSession })}
              />
            ))}
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
