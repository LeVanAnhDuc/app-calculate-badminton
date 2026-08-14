import { useEffect, useRef, useState } from 'react'
import { extrasTotal, shuttleTotal } from '../lib/calc'
import { formatVND } from '../lib/format'
import type { ShuttleType } from '../lib/shuttleTypes'
import { durationHours, formatHours } from '../lib/time'
import type { ExtraCost, SessionInput, ShuttleLine } from '../lib/types'
import { uid } from '../lib/uid'
import { DeleteButton } from './DeleteButton'
import { MoneyInput } from './MoneyInput'
import { SwipeToDelete } from './SwipeToDelete'
import { PayerSelect } from './PayerSelect'
import { ShuttleTypeSelect } from './ShuttleTypeSelect'
import { TimeSelect } from './TimeSelect'

interface Props {
  input: SessionInput
  /** Loại cầu hay dùng, đã xếp hạng sẵn bởi App (suy ra từ lịch sử). */
  shuttleTypes: ShuttleType[]
  onPatch: (p: Partial<SessionInput>) => void
}

export function CostForm({ input, shuttleTypes, onPatch }: Props) {
  const courtHours = durationHours(input.courtStart, input.courtEnd)
  const extras = input.extras
  const noPlayers = input.players.length === 0

  // chỉ một hàng được mở khay xóa tại một thời điểm, chung cho cả hai danh sách
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)

  // focus the label field of the row that was just appended
  const [focusId, setFocusId] = useState<string | null>(null)
  const labelRefs = useRef<Record<string, HTMLInputElement | null>>({})
  useEffect(() => {
    if (focusId === null) return
    labelRefs.current[focusId]?.focus()
    setFocusId(null)
  }, [focusId])

  const shuttles = input.shuttles

  const patchShuttle = (id: string, patch: Partial<ShuttleLine>) =>
    onPatch({ shuttles: shuttles.map((l) => (l.id === id ? { ...l, ...patch } : l)) })

  const addShuttle = () =>
    onPatch({ shuttles: [...shuttles, { id: uid(), name: '', count: 0, price: 0 }] })

  // xóa một dòng không undo được — gõ lại mất hai giây, giống dòng phát sinh
  const removeShuttle = (id: string) => onPatch({ shuttles: shuttles.filter((l) => l.id !== id) })

  const patchExtra = (id: string, patch: Partial<ExtraCost>) =>
    onPatch({ extras: extras.map((e) => (e.id === id ? { ...e, ...patch } : e)) })

  const addExtra = () => {
    if (noPlayers) return
    // deliberately only the FIRST player, not the whole group: defaulting to
    // "Cả nhóm" would silently spread a hastily typed racket rental across
    // everyone with no signal. Mis-assigning to An is visible at a glance in
    // the result panel.
    const extra: ExtraCost = { id: uid(), label: '', amount: 0, playerIds: [input.players[0].id] }
    onPatch({ extras: [...extras, extra] })
    setFocusId(extra.id)
  }

  // deleting one row is not undoable on purpose — it is retyped in two seconds;
  // undo is reserved for deleting a player or a whole session
  const removeExtra = (id: string) => onPatch({ extras: extras.filter((e) => e.id !== id) })

  return (
    <section className="bg-white rounded-2xl shadow-sm p-4">
      <h2 className="text-base font-bold text-gray-900 mb-1">Chi phí</h2>
      <p className="text-xs text-gray-400 mb-2">
        <span className="md:hidden">💡 Vuốt trái một dòng để xóa</span>
        <span className="hidden md:inline">💡 Bấm nút thùng rác đỏ để xóa một dòng</span>
      </p>
      <ul className="space-y-2">
        {shuttles.map((l, i) => {
          const label = l.name.trim() || 'loại cầu'
          return (
            <li key={l.id}>
              <SwipeToDelete
                testId={`shuttle-swipe-row-${l.id}`}
                label={`Xóa nhanh ${label}`}
                isOpen={openSwipeId === l.id}
                onOpenChange={(open) => setOpenSwipeId(open ? l.id : null)}
                onDelete={() => removeShuttle(l.id)}
                className="rounded-xl"
                surfaceClassName="bg-white flex gap-2 items-center"
              >
              <ShuttleTypeSelect
                aria-label={`Loại cầu ${i + 1}`}
                value={l.name}
                suggestions={shuttleTypes.filter(
                  (t) =>
                    !shuttles.some(
                      (o) => o.id !== l.id && o.name.trim().toLowerCase() === t.name.toLowerCase(),
                    ),
                )}
                onChange={(name, price) =>
                  patchShuttle(l.id, price === undefined ? { name } : { name, price })
                }
                className="flex-1 min-w-0"
              />
              <input
                aria-label={`Số quả của ${label}`}
                inputMode="numeric"
                value={l.count === 0 ? '' : l.count}
                placeholder="0"
                onChange={(ev) =>
                  patchShuttle(l.id, { count: Number(ev.target.value.replace(/\D/g, '') || 0) })
                }
                className="w-14 h-11 rounded-xl border border-gray-300 px-2 text-base font-semibold text-gray-900 text-center"
              />
              <MoneyInput
                aria-label={`Giá / quả của ${label}`}
                value={l.price}
                onChange={(v) => patchShuttle(l.id, { price: v })}
                className="w-24 h-11! text-base!"
              />
              <DeleteButton label={`Xóa ${label}`} onClick={() => removeShuttle(l.id)} />
              </SwipeToDelete>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        onClick={addShuttle}
        className="w-full h-11 mt-2 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-600 font-semibold text-sm"
      >
        + Thêm loại cầu
      </button>
      <div className="flex justify-between items-center mt-2 px-1">
        <span className="text-sm text-gray-500">Tiền cầu</span>
        <span className="text-sm font-semibold text-gray-900">{formatVND(shuttleTotal(input))}</span>
      </div>
      <div className="mt-3">
        <label className="text-xs text-gray-500 block mb-1" htmlFor="court-fee">Tiền sân</label>
        <MoneyInput
          id="court-fee"
          aria-label="Tiền sân"
          value={input.courtFee}
          onChange={(v) => onPatch({ courtFee: v })}
          className="w-full"
        />
      </div>
      {input.mode === 'hourly' && (
        <div className="mt-3">
          <label className="text-xs text-gray-500 block mb-1">Giờ thuê sân</label>
          <div className="flex gap-2 items-center">
            <TimeSelect
              aria-label="Giờ bắt đầu"
              value={input.courtStart}
              onChange={(v) => onPatch({ courtStart: v })}
              className="flex-1"
            />
            <span className="text-gray-400">→</span>
            <TimeSelect
              aria-label="Giờ kết thúc"
              value={input.courtEnd}
              onChange={(v) => onPatch({ courtEnd: v })}
              className="flex-1"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            = {formatHours(courtHours)} · người chơi mặc định theo giờ này
          </p>
        </div>
      )}
      <div className="mt-4">
        <h3 className="text-xs text-gray-500">Chi phí phát sinh khác</h3>
        <p className="text-xs text-gray-400">Chọn ai cùng chịu — chia đều theo đầu người</p>
        {extras.length > 0 && (
          <ul className="mt-2 space-y-2">
            {/* two lines per row: on a 390px viewport a single line left the
                label field under 100px wide, so "Quấn cán" already overflowed */}
            {extras.map((e) => (
              <li key={e.id}>
                <SwipeToDelete
                  testId={`extra-swipe-row-${e.id}`}
                  label={`Xóa nhanh khoản ${e.label || 'khác'}`}
                  isOpen={openSwipeId === e.id}
                  onOpenChange={(open) => setOpenSwipeId(open ? e.id : null)}
                  onDelete={() => removeExtra(e.id)}
                  className="rounded-xl"
                  surfaceClassName="rounded-xl bg-gray-50 p-2 space-y-2"
                >
                <input
                  ref={(el) => {
                    labelRefs.current[e.id] = el
                  }}
                  aria-label="Tên khoản phát sinh"
                  placeholder="Tên khoản (nước, thuê vợt…)"
                  value={e.label}
                  onChange={(ev) => patchExtra(e.id, { label: ev.target.value })}
                  className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm text-gray-900"
                />
                <div className="flex gap-2 h-11">
                  <MoneyInput
                    aria-label={`Số tiền của ${e.label || 'khoản khác'}`}
                    value={e.amount}
                    onChange={(v) => patchExtra(e.id, { amount: v })}
                    className="w-32 h-11! text-base!"
                  />
                  <PayerSelect
                    players={input.players}
                    value={e.playerIds}
                    onChange={(playerIds) => patchExtra(e.id, { playerIds })}
                    aria-label={`Người trả khoản ${e.label || 'khác'}`}
                    className="flex-1 min-w-0"
                  />
                  <DeleteButton
                    label={`Xóa khoản ${e.label || 'khác'}`}
                    onClick={() => removeExtra(e.id)}
                  />
                </div>
                </SwipeToDelete>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={noPlayers}
          onClick={addExtra}
          className="w-full h-11 mt-2 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-600 font-semibold text-sm disabled:border-gray-200 disabled:text-gray-300"
        >
          + Thêm khoản
        </button>
        {noPlayers && (
          <p className="text-xs text-gray-400 mt-1">Thêm người chơi trước để gán khoản phát sinh</p>
        )}
      </div>
      {extras.length > 0 && (
        <div className="flex justify-between items-center mt-2 px-1">
          <span className="text-sm text-gray-500">Phát sinh</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatVND(extrasTotal(input))}
          </span>
        </div>
      )}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
        <span className="text-sm font-bold text-gray-900">TỔNG CHI</span>
        <span className="text-xl font-bold text-emerald-600">
          {formatVND(shuttleTotal(input) + input.courtFee + extrasTotal(input))}
        </span>
      </div>
    </section>
  )
}
