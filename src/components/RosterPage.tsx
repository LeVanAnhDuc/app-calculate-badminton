import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { motion } from 'motion/react'
import { Drawer } from 'vaul'
import type { RosterEntry } from '../lib/storage'
import type { Gender } from '../lib/types'
import { groupByLetter, matchesQuery } from '../lib/alphabet'
import { insertAt, toastUndo } from '../lib/undo'
import { CapCentred } from './CapCentred'
import { DeleteButton } from './DeleteButton'
import { ArrowLeftIcon, CloseIcon, PencilIcon, PlusIcon } from './icons'
import { SwipeToDelete } from './SwipeToDelete'

interface Props {
  roster: RosterEntry[]
  onBack: () => void
  // takes an updater too, so undoing a delete re-inserts into the roster as
  // it is at that moment rather than a snapshot from before the toast
  onChange: Dispatch<SetStateAction<RosterEntry[]>>
}

function Avatar({ entry }: { entry: RosterEntry }) {
  return (
    <span
      aria-hidden="true"
      className={`w-10 h-10 rounded-full text-base font-semibold flex items-center justify-center shrink-0 ${
        entry.gender === 'male' ? 'bg-emerald-100 text-emerald-700' : 'bg-pink-100 text-pink-700'
      }`}
    >
      <CapCentred>{entry.name.trim().charAt(0).toUpperCase() || '?'}</CapCentred>
    </span>
  )
}

function SearchIcon() {
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
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export function RosterPage({ roster, onBack, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [addName, setAddName] = useState('')
  const [addGender, setAddGender] = useState<Gender>('male')
  const [addError, setAddError] = useState('')

  const [editingName, setEditingName] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState('')

  const [openSwipeName, setOpenSwipeName] = useState<string | null>(null)

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const railRef = useRef<HTMLDivElement | null>(null)

  const groups = useMemo(
    () => groupByLetter(roster.filter((entry) => matchesQuery(entry.name, query))),
    [roster, query],
  )
  const letters = groups.map((g) => g.letter)
  const showRail = query.trim() === '' && letters.length > 1

  const openAdd = () => {
    setAddName('')
    setAddError('')
    setAdding(true)
  }

  const addEntry = () => {
    const trimmed = addName.trim()
    if (!trimmed) return
    const isDuplicate = roster.some((r) => r.name.toLowerCase() === trimmed.toLowerCase())
    if (isDuplicate) {
      setAddError(`"${trimmed}" đã có trong danh bạ`)
      return
    }
    setAddError('')
    setAddName('')
    setAdding(false)
    // a name hidden by the current search would look like nothing happened
    setQuery('')
    onChange([...roster, { name: trimmed, gender: addGender }])
  }

  const requestDelete = (name: string) => {
    const index = roster.findIndex((r) => r.name === name)
    if (index === -1) return
    const removed = roster[index]
    setOpenSwipeName(null)
    onChange((r) => r.filter((entry) => entry.name !== name))
    toastUndo(`Đã xóa "${name}" khỏi danh bạ`, () =>
      onChange((r) => insertAt(r, index, removed)),
    )
  }

  const editingEntry = roster.find((r) => r.name === editingName) ?? null

  const openEdit = (entry: RosterEntry) => {
    setOpenSwipeName(null)
    setEditingName(entry.name)
    setEditName(entry.name)
    setEditError('')
  }

  const commitRename = () => {
    if (!editingEntry) return
    const trimmed = editName.trim()
    if (!trimmed) {
      setEditName(editingEntry.name)
      setEditError('')
      return
    }
    const isDuplicate = roster.some(
      (r) => r !== editingEntry && r.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (isDuplicate) {
      setEditError(`"${trimmed}" đã có trong danh bạ`)
      return
    }
    setEditError('')
    if (trimmed !== editingEntry.name) {
      onChange(roster.map((r) => (r === editingEntry ? { ...r, name: trimmed } : r)))
      setEditingName(trimmed)
    }
  }

  const changeEditingGender = (gender: Gender) => {
    if (!editingEntry) return
    onChange(roster.map((r) => (r === editingEntry ? { ...r, gender } : r)))
  }

  const closeEdit = () => {
    commitRename()
    setEditingName(null)
  }

  // jsdom has no scrollIntoView, and older mobile browsers ignore the options
  const jumpTo = (letter: string) => {
    sectionRefs.current[letter]?.scrollIntoView?.({ block: 'start' })
  }

  // dragging a finger down the rail scrubs through the sections, like iOS
  const scrubTo = (clientY: number) => {
    const rail = railRef.current
    if (!rail || letters.length === 0) return
    const { top, height } = rail.getBoundingClientRect()
    if (height === 0) return
    const index = Math.floor(((clientY - top) / height) * letters.length)
    jumpTo(letters[Math.min(letters.length - 1, Math.max(0, index))])
  }

  return (
    <div className="bg-gray-100 min-h-dvh flex justify-center">
      {/* pb gộp 2rem + safe-area: hai utility padding-bottom trên cùng element
          sẽ đè nhau theo thứ tự CSS nên gộp thành một class */}
      <div className="w-full max-w-[430px] md:max-w-2xl bg-[#F2F2F7] min-h-dvh pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <header className="bg-emerald-600 px-4 pt-8 pb-4 rounded-b-3xl md:rounded-none">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Quay lại"
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0"
            >
              <ArrowLeftIcon />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-xl font-bold">Danh bạ người chơi</h1>
              <p className="text-emerald-100 text-sm">{roster.length} người đã lưu</p>
            </div>
            <button
              type="button"
              aria-label="Thêm vào danh bạ"
              onClick={openAdd}
              className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0"
            >
              <PlusIcon />
            </button>
          </div>

          {roster.length > 0 && (
            <div className="relative mt-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100">
                <SearchIcon />
              </span>
              <input
                type="search"
                aria-label="Tìm trong danh bạ"
                placeholder="Tìm kiếm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-10 rounded-xl bg-emerald-700/60 pl-9 pr-9 text-base text-white placeholder:text-emerald-200 outline-none"
              />
              {query !== '' && (
                <button
                  type="button"
                  aria-label="Xóa từ khóa tìm kiếm"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-emerald-100 flex items-center justify-center"
                >
                  <CloseIcon size={16} />
                </button>
              )}
            </div>
          )}
        </header>

        <main className="relative mt-3">
          {roster.length > 0 && (
            <p className="text-center text-xs text-gray-400 pb-2">
              <span className="md:hidden">💡 Vuốt trái để xóa</span>
              <span className="hidden md:inline">💡 Bấm nút thùng rác đỏ để xóa</span>
            </p>
          )}
          {roster.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8 px-4">
              Danh bạ chưa có ai — bấm + để thêm, hoặc thêm người chơi trong buổi.
            </p>
          ) : groups.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8 px-4">
              Không tìm thấy ai tên "{query.trim()}"
            </p>
          ) : (
            // Plain (non-animated) rows: entries are keyed by name, and a
            // rename changes that name — animating mount/unmount on rename
            // would misrepresent a rename as delete+add, so rows update
            // in place instead.
            groups.map((group) => (
              <section
                key={group.letter}
                ref={(el) => {
                  sectionRefs.current[group.letter] = el
                }}
              >
                <h2 className="sticky top-0 z-10 px-4 py-1 text-[13px] font-semibold uppercase tracking-wide text-gray-500 bg-[#F2F2F7]/90 backdrop-blur-sm">
                  {group.letter}
                </h2>
                <ul className="mx-4 bg-white rounded-xl shadow-sm overflow-hidden">
                  {group.items.map((entry, i) => {
                    const isOpen = openSwipeName === entry.name
                    const isLast = i === group.items.length - 1
                    return (
                      <li key={entry.name}>
                        <SwipeToDelete
                          testId={`roster-swipe-row-${entry.name}`}
                          label={`Xóa nhanh ${entry.name}`}
                          isOpen={isOpen}
                          onOpenChange={(open) => setOpenSwipeName(open ? entry.name : null)}
                          onDelete={() => requestDelete(entry.name)}
                          surfaceClassName={`bg-white flex items-center ${
                            isLast
                              ? ''
                              : 'after:absolute after:bottom-0 after:left-16 after:right-0 after:h-px after:bg-gray-200'
                          }`}
                        >
                          <button
                            type="button"
                            className="flex-1 flex items-center gap-3 min-w-0 text-left pl-3 pr-2 py-2.5"
                            onClick={() => openEdit(entry)}
                          >
                            <Avatar entry={entry} />
                            <span className="font-medium text-gray-900 truncate">
                              {entry.name}
                            </span>
                            <span className="sr-only">
                              {entry.gender === 'male' ? 'Nam' : 'Nữ'}
                            </span>
                          </button>
                          <div className="flex items-center gap-1 shrink-0 pr-2">
                            <button
                              type="button"
                              aria-label={`Sửa ${entry.name}`}
                              title="Sửa"
                              onClick={() => openEdit(entry)}
                              className="hidden md:flex md:w-10 md:h-10 items-center justify-center text-gray-400 hover:bg-gray-100 rounded-lg"
                            >
                              <PencilIcon />
                            </button>
                            <DeleteButton
                              label={`Xóa ${entry.name}`}
                              onClick={() => requestDelete(entry.name)}
                            />
                            <span className="md:hidden text-gray-300">
                              <ChevronIcon />
                            </span>
                          </div>
                        </SwipeToDelete>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))
          )}

          {showRail && (
            <div
              ref={railRef}
              data-testid="roster-index-rail"
              onTouchStart={(e) => scrubTo(e.touches[0].clientY)}
              onTouchMove={(e) => scrubTo(e.touches[0].clientY)}
              // fixed so it stays put while the list scrolls; on wide screens
              // the calc parks it just outside the centered column (max-w-2xl
              // = 672px, so its edge sits 50vw - 336px from the window edge)
              // instead of letting it drift off to the window edge.
              // right-1 (4px) thay vì right-0.5: 2px vừa đè lên mũi ">" của
              // hàng (danh sách có mx-4) vừa lọt vùng vuốt-để-back của Android.
              // Nền mờ để chữ không chồng lên nội dung phía dưới.
              className="fixed right-1 md:right-[calc(50vw-360px)] top-1/2 -translate-y-1/2 z-20 flex flex-col items-center select-none touch-none bg-white/70 backdrop-blur-sm rounded-full py-1"
            >
              {letters.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  aria-label={`Tới nhóm ${letter}`}
                  onClick={() => jumpTo(letter)}
                  // 44x28 chứ không 44x44: 26 chữ cái xếp dọc không thể mỗi chữ
                  // cao 44px trong màn 844px. Thao tác chính của rail là vuốt
                  // (onTouchStart/onTouchMove ở trên), bấm từng chữ chỉ là phụ —
                  // đây là đánh đổi có chủ ý. -my-1.5 giữ nguyên khoảng cách
                  // hiển thị giữa các chữ dù ô chạm cao hơn.
                  className="w-11 h-7 -my-1.5 text-[11px] font-semibold leading-none text-emerald-600"
                >
                  {letter}
                </button>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-gray-400 pt-6 px-4">
            Danh bạ tự bổ sung khi bạn thêm người chơi mới trong buổi
          </p>
        </main>
      </div>

      <Drawer.Root open={adding} onOpenChange={setAdding}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl bg-white outline-none">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="max-w-lg mx-auto p-4 pb-8">
              <Drawer.Title className="font-bold text-gray-900 mb-3">
                Thêm người vào danh bạ
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                Nhập tên và giới tính để lưu vào danh bạ
              </Drawer.Description>
              <div className="flex gap-2">
                <input
                  placeholder="Tên người chơi"
                  value={addName}
                  onChange={(e) => {
                    setAddName(e.target.value)
                    setAddError('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && addEntry()}
                  className="flex-1 min-w-0 h-12 rounded-xl border border-gray-300 px-3 text-base"
                />
                <div className="flex rounded-xl border border-gray-300 overflow-hidden shrink-0">
                  {(['male', 'female'] as Gender[]).map((g) => {
                    const active = addGender === g
                    return (
                      <button
                        key={g}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setAddGender(g)}
                        className={`relative h-12 px-3 text-sm font-semibold ${
                          active ? 'text-white' : 'bg-white text-gray-500'
                        }`}
                      >
                        {active && (
                          <motion.div
                            layoutId="roster-gender-add-pill"
                            className={`absolute inset-0 ${
                              g === 'male' ? 'bg-emerald-600' : 'bg-pink-500'
                            }`}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                          />
                        )}
                        <span className="relative z-10">{g === 'male' ? 'Nam' : 'Nữ'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              {addError && <p className="text-sm text-red-500 mt-2">{addError}</p>}
              <button
                type="button"
                onClick={addEntry}
                className="w-full h-12 mt-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
              >
                + Thêm vào danh bạ
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <Drawer.Root
        open={editingName !== null}
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
                Sửa người chơi trong danh bạ
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                Chỉnh sửa tên và giới tính trong danh bạ
              </Drawer.Description>
              {editingEntry && (
                <div className="flex flex-col gap-2">
                  <div>
                    <input
                      aria-label={`Tên của ${editingEntry.name}`}
                      value={editName}
                      onChange={(e) => {
                        setEditName(e.target.value)
                        setEditError('')
                      }}
                      onBlur={commitRename}
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
                      aria-pressed={editingEntry.gender === 'male'}
                      aria-label={`Đặt Nam cho ${editingEntry.name}`}
                      onClick={() => changeEditingGender('male')}
                      className={`relative flex-1 h-11 text-sm font-semibold ${
                        editingEntry.gender === 'male' ? 'text-white' : 'bg-white text-gray-500'
                      }`}
                    >
                      {editingEntry.gender === 'male' && (
                        <motion.div
                          layoutId="roster-gender-edit-pill"
                          className="absolute inset-0 bg-emerald-600"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                        />
                      )}
                      <span className="relative z-10">Nam</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={editingEntry.gender === 'female'}
                      aria-label={`Đặt Nữ cho ${editingEntry.name}`}
                      onClick={() => changeEditingGender('female')}
                      className={`relative flex-1 h-11 text-sm font-semibold ${
                        editingEntry.gender === 'female' ? 'text-white' : 'bg-white text-gray-500'
                      }`}
                    >
                      {editingEntry.gender === 'female' && (
                        <motion.div
                          layoutId="roster-gender-edit-pill"
                          className="absolute inset-0 bg-pink-500"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                        />
                      )}
                      <span className="relative z-10">Nữ</span>
                    </button>
                  </div>
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
    </div>
  )
}
