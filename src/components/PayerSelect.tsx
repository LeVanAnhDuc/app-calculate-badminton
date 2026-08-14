import { useState } from 'react'
import { Drawer } from 'vaul'
import type { Player } from '../lib/types'
import { GenderBadge } from './GenderBadge'

interface Props {
  players: Player[]
  value: string[] // = extra.playerIds
  onChange: (playerIds: string[]) => void
  'aria-label': string
  className?: string
}

/**
 * Summary shown on the trigger. Exported so HistoryPage (and tests) print the
 * same wording. Order always follows `players`, never the order ids were
 * ticked — the order inside playerIds is never shown anywhere.
 */
export function payerSummary(
  players: Player[],
  value: string[],
  emptyLabel = 'Chọn người trả',
): string {
  const chosen = players.filter((p) => value.includes(p.id))
  if (chosen.length === 0) return emptyLabel
  if (chosen.length === players.length) return 'Cả nhóm'
  if (chosen.length === 1) return chosen[0].name
  return `${chosen[0].name} +${chosen.length - 1}`
}

/**
 * Multi-select of who shares one extra cost: a compact trigger opens a vaul
 * bottom sheet with a checkbox per player. Modelled on TimeSelect, but with
 * apply-on-tap semantics instead of a draft committed by "Xong": every other
 * field in the app edits in place, and the user needs the result panel to move
 * with each tick to see whether they picked the right group. Drag-down /
 * overlay tap / Esc therefore KEEP the ticks and only close the sheet.
 *
 * A native <select multiple> is deliberately avoided — same reason TimeSelect
 * avoids <input type="time">: the host OS dialog is ugly and differs between
 * iOS and Android.
 */
export function PayerSelect({
  players,
  value,
  onChange,
  'aria-label': label,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const allSelected = players.length > 0 && players.every((p) => value.includes(p.id))
  const summary = payerSummary(players, value)
  const isEmpty = players.filter((p) => value.includes(p.id)).length === 0

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen(true)}
        className={`h-11 rounded-xl border border-gray-300 px-3 text-sm text-left flex items-center justify-between gap-1 ${
          isEmpty ? 'text-gray-400' : 'text-gray-900'
        } ${className}`}
      >
        <span className="truncate">{summary}</span>
        <span className="text-gray-400 shrink-0">▾</span>
      </button>

      <Drawer.Root
        open={open}
        onOpenChange={(o: boolean) => {
          // drag-down / overlay tap / Esc all land here with o=false; the ticks
          // are already committed, so this only closes the sheet
          if (!o) setOpen(false)
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40" />
          <Drawer.Content className="fixed bottom-0 inset-x-0 z-[70] rounded-t-3xl bg-white outline-none">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="max-w-lg mx-auto p-4 pb-6">
              <Drawer.Title className="font-bold text-gray-900 mb-2 text-center">
                {label}
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                Chọn một hoặc nhiều người cùng chịu khoản này — số tiền chia đều theo đầu người
              </Drawer.Description>
              {/* data-vaul-no-drag: scrolling a 12-player list must not drag the sheet down */}
              <div data-vaul-no-drag>
                <div className="border-b border-gray-100 mb-2 pb-2">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={allSelected}
                    aria-label="Cả nhóm"
                    onClick={() => onChange(allSelected ? [] : players.map((p) => p.id))}
                    className={`w-full h-12 rounded-xl px-3 flex items-center justify-between gap-2 ${
                      allSelected ? 'bg-emerald-50' : 'bg-gray-50'
                    }`}
                  >
                    <span className="font-semibold text-gray-900">
                      Cả nhóm{' '}
                      <span className="text-xs text-gray-400 font-normal">
                        {players.length} người
                      </span>
                    </span>
                    {allSelected && <span className="text-emerald-600">✓</span>}
                  </button>
                </div>
                <div className="max-h-[50vh] overflow-y-auto space-y-1.5">
                  {players.map((p) => {
                    const checked = value.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        aria-label={`${p.name} · ${p.gender === 'male' ? 'Nam' : 'Nữ'}`}
                        onClick={() =>
                          onChange(checked ? value.filter((id) => id !== p.id) : [...value, p.id])
                        }
                        className={`w-full h-12 rounded-xl px-3 flex items-center gap-2 ${
                          checked ? 'bg-emerald-50' : 'bg-gray-50'
                        }`}
                      >
                        <GenderBadge gender={p.gender} />
                        <span className="text-gray-900 truncate">{p.name}</span>
                        {checked && <span className="ml-auto text-emerald-600">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full h-12 mt-4 rounded-xl bg-emerald-600 text-white text-base font-bold"
              >
                Xong
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}
