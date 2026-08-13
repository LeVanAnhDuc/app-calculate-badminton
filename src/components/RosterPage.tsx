import { useState, type TouchEvent } from 'react'
import { motion } from 'motion/react'
import { Drawer } from 'vaul'
import type { RosterEntry } from '../lib/storage'
import type { Gender } from '../lib/types'

interface Props {
  roster: RosterEntry[]
  onBack: () => void
  onChange: (roster: RosterEntry[]) => void
}

const SWIPE_OPEN_PX = 80
const SWIPE_THRESHOLD_PX = 40

function GenderBadge({ gender }: { gender: Gender }) {
  return (
    <span
      className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
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

export function RosterPage({ roster, onBack, onChange }: Props) {
  const [addName, setAddName] = useState('')
  const [addGender, setAddGender] = useState<Gender>('male')
  const [addError, setAddError] = useState('')

  const [editingName, setEditingName] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState('')

  const [openSwipeName, setOpenSwipeName] = useState<string | null>(null)
  const [swipe, setSwipe] = useState<{ name: string; startX: number; deltaX: number } | null>(
    null,
  )

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
    onChange([...roster, { name: trimmed, gender: addGender }])
  }

  const requestDelete = (name: string) => {
    if (!window.confirm(`Xóa "${name}" khỏi danh bạ?`)) return
    setOpenSwipeName(null)
    onChange(roster.filter((r) => r.name !== name))
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

  const rowTranslate = (name: string) => {
    if (swipe && swipe.name === name) return swipe.deltaX
    return openSwipeName === name ? -SWIPE_OPEN_PX : 0
  }

  const handleTouchStart = (name: string) => (e: TouchEvent) => {
    setSwipe({ name, startX: e.touches[0].clientX, deltaX: 0 })
  }

  const handleTouchMove = (name: string) => (e: TouchEvent) => {
    setSwipe((s) => {
      if (!s || s.name !== name) return s
      const dx = e.touches[0].clientX - s.startX
      return { ...s, deltaX: Math.min(0, Math.max(dx, -SWIPE_OPEN_PX)) }
    })
  }

  const handleTouchEnd = (name: string) => () => {
    setSwipe((s) => {
      if (!s || s.name !== name) return s
      setOpenSwipeName(s.deltaX <= -SWIPE_THRESHOLD_PX ? name : null)
      return null
    })
  }

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center">
      <div className="w-full max-w-[390px] md:max-w-5xl bg-gray-50 min-h-screen pb-8">
        <header className="bg-emerald-600 px-4 pt-8 pb-6 rounded-b-3xl md:rounded-none">
          <div className="flex items-center gap-3 md:max-w-5xl md:mx-auto">
            <button
              type="button"
              aria-label="Quay lại"
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center text-xl shrink-0"
            >
              ←
            </button>
            <div>
              <h1 className="text-white text-xl font-bold">Danh bạ người chơi</h1>
              <p className="text-emerald-100 text-sm">{roster.length} người đã lưu</p>
            </div>
          </div>
        </header>

        <main className="px-4 mt-4 space-y-4 md:max-w-5xl md:mx-auto">
          <section className="bg-white rounded-2xl shadow-sm p-4">
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
              className="w-full h-12 mt-2 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-600 font-semibold text-sm"
            >
              + Thêm vào danh bạ
            </button>
          </section>

          {roster.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              Danh bạ chưa có ai — thêm người chơi ở trên hoặc trong buổi chơi.
            </p>
          ) : (
            // Plain (non-animated) rows: entries are keyed by name, and a
            // rename changes that name — animating mount/unmount on rename
            // would misrepresent a rename as delete+add, so rows update
            // in place instead.
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roster.map((entry) => {
                const isOpen = openSwipeName === entry.name
                return (
                  <li key={entry.name}>
                    <div className="relative overflow-hidden rounded-xl">
                      <button
                        type="button"
                        aria-label={`Xóa nhanh ${entry.name}`}
                        onClick={() => requestDelete(entry.name)}
                        className="absolute inset-y-0 right-0 w-20 bg-red-500 text-white text-sm font-semibold flex items-center justify-center"
                      >
                        Xóa
                      </button>
                      <div
                        data-testid={`roster-swipe-row-${entry.name}`}
                        className="relative bg-white rounded-xl shadow-sm p-3 flex items-center justify-between gap-2 transition-transform duration-150 ease-out"
                        style={{ transform: `translateX(${rowTranslate(entry.name)}px)` }}
                        onTouchStart={handleTouchStart(entry.name)}
                        onTouchMove={handleTouchMove(entry.name)}
                        onTouchEnd={handleTouchEnd(entry.name)}
                        onClickCapture={(e) => {
                          if (isOpen) {
                            setOpenSwipeName(null)
                            e.stopPropagation()
                          }
                        }}
                      >
                        <button
                          type="button"
                          className="flex items-center gap-2 min-w-0 text-left"
                          onClick={() => openEdit(entry)}
                        >
                          <GenderBadge gender={entry.gender} />
                          <span className="font-medium text-gray-900 truncate">{entry.name}</span>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            aria-label={`Sửa ${entry.name}`}
                            title="Sửa"
                            onClick={() => openEdit(entry)}
                            className="hidden md:flex md:w-10 md:h-10 items-center justify-center text-gray-400 hover:bg-gray-100 rounded-lg"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            aria-label={`Xóa ${entry.name}`}
                            onClick={() => requestDelete(entry.name)}
                            className="hidden md:flex md:w-10 md:h-10 items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-2xl leading-none"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <p className="text-center text-xs text-gray-400 pt-2">
            Danh bạ tự bổ sung khi bạn thêm người chơi mới trong buổi
          </p>
        </main>
      </div>

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
