import { useRef, useState } from 'react'
import { AnimatePresence, motion, Reorder } from 'motion/react'
import { Drawer } from 'vaul'
import type { RosterEntry } from '../lib/storage'
import { durationHours, formatHours } from '../lib/time'
import type { Gender, Player, SessionInput } from '../lib/types'
import { useEdgeAutoScroll } from '../lib/useEdgeAutoScroll'
import { Avatar } from './Avatar'
import { GenderBadge } from './GenderBadge'
import { CloseIcon, PlusIcon, SearchIcon } from './icons'
import { PlayerRow } from './PlayerRow'
import { TimeSelect } from './TimeSelect'

interface Props {
  input: SessionInput
  roster: RosterEntry[]
  /**
   * Những người hay gặp, đã xếp hạng & lọc sẵn bởi App (suy ra từ lịch sử).
   * Component này chỉ hiển thị — không nhận `history` thô.
   */
  frequent: RosterEntry[]
  onPatch: (p: Partial<SessionInput>) => void
  onAddPlayer: (name: string, gender: Gender) => void
  /**
   * Only reports which player to drop — the removal itself (and the "Hoàn
   * tác" toast that can put it back) is owned by App, so undo can re-insert
   * into the freshest list instead of a snapshot captured here.
   */
  onRemovePlayer: (playerId: string) => void
  onChangeGender: (playerId: string, gender: Gender) => void
  onRenamePlayer: (playerId: string, newName: string) => void
}

export function PlayerList({
  input,
  roster,
  frequent,
  onPatch,
  onAddPlayer,
  onRemovePlayer,
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
  const [isDragging, setIsDragging] = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEdgeAutoScroll(isDragging)

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

  // Chip chỉ hiện khi chưa gõ gì — gõ vào thì gợi ý "Từ danh bạ" tiếp quản.
  const showFrequent = trimmedName === '' && frequent.length > 0

  const rosterMatch = trimmedName
    ? (roster.find((r) => r.name.toLowerCase() === trimmedName.toLowerCase()) ?? null)
    : null
  const showNewHint = trimmedName !== '' && rosterMatch === null && !inSession(trimmedName)
  const showRosterHint = rosterMatch !== null
  const alreadyInSession = trimmedName !== '' && inSession(trimmedName)

  // Nút "Hủy" kiểu iOS: hiện khi ô đang được dùng, kể cả lúc mới focus mà chưa gõ.
  const showCancel = focused || trimmedName !== ''

  const genderLabel = (g: Gender) => (g === 'male' ? 'Nam' : 'Nữ')

  /**
   * Gợi ý từ danh bạ và hai hàng "thêm người mới" nằm chung một khối bo góc
   * kiểu iOS, nên phải biết hàng nào là hàng cuối để bỏ đường kẻ ngăn — gộp
   * sẵn thành một mảng thay vì render hai đoạn rời rồi đoán.
   *
   * Hai hàng "người mới" chỉ dành cho mobile: desktop vẫn có cặp [Nam][Nữ] và
   * nút "+ Thêm người chơi" nên không cần chúng.
   */
  const resultRows = [
    ...suggestions.slice(0, 6).map((r) => ({
      key: `roster-${r.name}`,
      name: r.name,
      gender: r.gender,
      isNew: false,
      label: `${r.name} · ${genderLabel(r.gender)}`,
    })),
    ...(showNewHint
      ? (['male', 'female'] as Gender[]).map((g) => ({
          key: `new-${g}`,
          name: trimmedName,
          gender: g,
          isNew: true,
          label: `Thêm "${trimmedName}" là người mới · ${genderLabel(g)}`,
        }))
      : []),
  ]

  const resetSearch = () => {
    setName('')
    setError('')
  }

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

  const removePlayer = (id: string) => {
    setOpenSwipeId(null)
    onRemovePlayer(id)
  }

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
        <p>💡 Kéo ⠿ để sắp xếp thứ tự</p>
        <p>
          <span className="md:hidden">💡 Vuốt trái để xóa</span>
          <span className="hidden md:inline">💡 Bấm nút thùng rác đỏ để xóa</span>
        </p>
      </motion.div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1 min-w-0">
          {/* Kính lúp chỉ có ở mobile — desktop vẫn là ô nhập kèm [Nam][Nữ] như cũ. */}
          <span className="md:hidden absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            placeholder="Tìm hoặc thêm tên"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => e.key === 'Enter' && add(name, gender)}
            className="w-full h-12 rounded-full border border-transparent bg-gray-100 pl-10 pr-11 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40 md:rounded-xl md:border-gray-300 md:bg-white md:px-3"
          />
          {trimmedName !== '' && (
            <button
              type="button"
              aria-label="Xóa chữ đã gõ"
              // giữ focus lại cho ô nhập: mất focus thì bàn phím mobile sập
              // xuống rồi lại bật lên, và nút "Hủy" nhấp nháy theo
              onMouseDown={(e) => e.preventDefault()}
              onClick={resetSearch}
              className="md:hidden absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-400 text-white flex items-center justify-center"
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {showCancel && (
            <motion.button
              key="cancel-search"
              type="button"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                resetSearch()
                setFocused(false)
                inputRef.current?.blur()
              }}
              className="md:hidden shrink-0 h-12 px-1 text-sm font-semibold text-emerald-600 whitespace-nowrap"
            >
              Hủy
            </motion.button>
          )}
        </AnimatePresence>

        <div className="hidden md:flex rounded-xl border border-gray-300 overflow-hidden shrink-0">
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

      {/* Mobile đã có hai hàng "Thêm ... là người mới" nói đúng điều này rồi. */}
      {showNewHint && (
        <p className="hidden md:block text-xs text-emerald-700 mt-1.5 px-1">
          ✨ Người mới — sẽ được thêm vào danh bạ
        </p>
      )}
      {showRosterHint && (
        <p className="text-xs text-gray-400 mt-1.5 px-1">
          📇 Có trong danh bạ — bấm thẻ gợi ý để thêm đúng giới tính
        </p>
      )}
      {alreadyInSession && (
        <p className="md:hidden text-xs text-gray-400 mt-1.5 px-1">
          👥 "{trimmedName}" đang có trong buổi rồi
        </p>
      )}

      <AnimatePresence>
        {resultRows.length > 0 && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-2 mt-2"
          >
            {suggestions.length > 0 && (
              <p className="text-xs font-semibold text-gray-400 px-1 uppercase tracking-wide md:normal-case md:tracking-normal">
                Từ danh bạ
              </p>
            )}
            {/* Mobile: một khối bo góc, các hàng ngăn nhau bằng kẻ mảnh thụt vào
                ngang chỗ chữ. Desktop: bung lại thành từng thẻ viền rời như cũ. */}
            <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white md:gap-2 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent">
              {resultRows.map((row, i) => (
                <button
                  key={row.key}
                  type="button"
                  aria-label={row.label}
                  onClick={() => add(row.name, row.gender)}
                  className={`w-full h-12 flex items-center gap-3 pl-3 text-left bg-white hover:bg-gray-50 md:gap-2 md:rounded-xl md:border md:border-gray-200 ${
                    row.isNew ? 'md:hidden' : ''
                  }`}
                >
                  {row.isNew ? (
                    // Tô theo giới tính chứ không dùng một màu "thêm" chung: hai
                    // hàng chỉ khác nhau ở giới tính nên phải nhìn là thấy ngay.
                    <span
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        row.gender === 'male'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-pink-100 text-pink-700'
                      }`}
                    >
                      <PlusIcon size={18} />
                    </span>
                  ) : (
                    <>
                      <span className="md:hidden">
                        <Avatar name={row.name} gender={row.gender} />
                      </span>
                      <span className="hidden md:inline-flex">
                        <GenderBadge gender={row.gender} />
                      </span>
                    </>
                  )}
                  <span
                    className={`flex-1 min-w-0 h-full flex items-center gap-2 pr-3 md:border-b-0 ${
                      i === resultRows.length - 1 ? '' : 'border-b border-gray-100'
                    }`}
                  >
                    <span
                      className={`flex-1 min-w-0 truncate font-medium ${
                        row.isNew ? 'text-emerald-700' : 'text-gray-900'
                      }`}
                    >
                      {row.isNew ? `Thêm "${row.name}" là người mới` : row.name}
                    </span>
                    <span
                      className={`text-xs shrink-0 ${
                        row.isNew
                          ? `font-semibold ${row.gender === 'male' ? 'text-emerald-600' : 'text-pink-500'}`
                          : 'text-gray-400'
                      }`}
                    >
                      {genderLabel(row.gender)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFrequent && (
          <motion.div
            key="frequent"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-2 mt-2"
          >
            <p className="text-xs font-semibold text-gray-400 px-1 uppercase tracking-wide md:normal-case md:tracking-normal">
              Hay chơi cùng
            </p>
            {/* Mobile: rail cuộn ngang kiểu Share Sheet — avatar tròn, tên ở dưới,
                một hàng cố định thay vì 3–4 hàng chip xuống dòng. `-mx-4 px-4` cho
                dải chạy sát mép thẻ, chip bị cắt ở mép phải là tín hiệu còn nữa.
                Desktop: vẫn là chip chữ xuống dòng như cũ. */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 pb-1 md:flex-wrap md:gap-2 md:overflow-visible md:mx-0 md:px-0 md:pb-0">
              {frequent.map((r) => (
                <button
                  key={r.name}
                  type="button"
                  aria-label={`Thêm ${r.name} · ${genderLabel(r.gender)}`}
                  onClick={() => add(r.name, r.gender)}
                  className="shrink-0 snap-start w-[72px] py-1 rounded-2xl flex flex-col items-center gap-1.5 active:bg-gray-100 md:w-auto md:h-12 md:py-0 md:rounded-full md:flex-row md:gap-2 md:border md:border-gray-200 md:bg-white md:hover:bg-gray-50 md:pl-2 md:pr-4"
                >
                  <span className="md:hidden">
                    <Avatar name={r.name} gender={r.gender} className="w-12 h-12 text-sm" />
                  </span>
                  <span className="hidden md:inline-flex">
                    <GenderBadge gender={r.gender} />
                  </span>
                  <span className="w-full truncate px-0.5 text-center text-[11px] leading-tight text-gray-600 md:w-auto md:px-0 md:text-sm md:font-medium md:text-gray-900">
                    {r.name}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      {/* Mobile thêm người ngay từ hàng gợi ý (kể cả tên mới), nên nút này chỉ
          còn cần cho desktop — nơi giới tính chọn ở cặp [Nam][Nữ] bên cạnh ô nhập. */}
      <button
        type="button"
        onClick={() => add(name, gender)}
        className="hidden md:block w-full h-12 mt-2 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-600 font-semibold text-sm"
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
        <Reorder.Group
          axis="y"
          values={input.players}
          onReorder={(players: Player[]) => onPatch({ players })}
          className="mt-3 divide-y divide-gray-100"
        >
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
                onDraggingChange={setIsDragging}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
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
