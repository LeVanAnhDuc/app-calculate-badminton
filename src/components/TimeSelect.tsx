import { useState } from 'react'
import { Drawer } from 'vaul'
import Picker from 'react-mobile-picker'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

interface Props {
  value: string // "HH:mm"
  onChange: (value: string) => void
  'aria-label': string
  className?: string
  /**
   * Set when this picker is opened from inside another vaul <Drawer/> (e.g.
   * PlayerList's edit sheet) — uses vaul's Drawer.NestedRoot so the two
   * sheets compose instead of colliding.
   */
  nested?: boolean
}

/**
 * A 24h time picker: a compact button showing the current "HH:mm" opens an
 * iOS-style wheel picker (react-mobile-picker) inside a vaul bottom sheet.
 * Never falls back to the host OS's native 12h AM/PM <input type="time">.
 * Reads/writes the same "HH:mm" string format used everywhere else — no
 * storage or calc changes needed.
 */
export function TimeSelect({ value, onChange, 'aria-label': label, className = '', nested }: Props) {
  const [open, setOpen] = useState(false)
  const [hh, mm] = value.split(':')
  const minuteOptions = MINUTES.includes(mm) ? MINUTES : [...MINUTES, mm].sort()
  const [pick, setPick] = useState({ hour: hh, minute: mm })

  const openSheet = () => {
    setPick({ hour: hh, minute: mm })
    setOpen(true)
  }

  const commit = () => {
    onChange(`${pick.hour}:${pick.minute}`)
    setOpen(false)
  }

  const Root = nested ? Drawer.NestedRoot : Drawer.Root

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={openSheet}
        className={`h-12 rounded-xl border border-gray-300 font-semibold text-lg ${className}`}
      >
        {hh}:{mm}
      </button>

      <Root
        open={open}
        onOpenChange={(o: boolean) => {
          // drag-down / overlay tap / Esc all land here with o=false — no
          // onChange call, so the previous value is kept (cancel semantics)
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
                Chọn giờ và phút, sau đó bấm Xong để xác nhận
              </Drawer.Description>
              {/* data-vaul-no-drag: wheel drags must not move/close the drawer */}
              <div data-vaul-no-drag>
                <Picker value={pick} onChange={setPick} height={180} itemHeight={40} wheelMode="natural">
                <Picker.Column name="hour" data-testid="time-wheel-hour">
                  {HOURS.map((h) => (
                    <Picker.Item key={h} value={h}>
                      {({ selected }: { selected: boolean }) => (
                        <div
                          className={
                            selected
                              ? 'text-lg font-bold text-emerald-600'
                              : 'text-base text-gray-400'
                          }
                        >
                          {h}
                        </div>
                      )}
                    </Picker.Item>
                  ))}
                </Picker.Column>
                <div className="flex items-center font-bold text-gray-400">:</div>
                <Picker.Column name="minute" data-testid="time-wheel-minute">
                  {minuteOptions.map((m) => (
                    <Picker.Item key={m} value={m}>
                      {({ selected }: { selected: boolean }) => (
                        <div
                          className={
                            selected
                              ? 'text-lg font-bold text-emerald-600'
                              : 'text-base text-gray-400'
                          }
                        >
                          {m}
                        </div>
                      )}
                    </Picker.Item>
                  ))}
                </Picker.Column>
                </Picker>
              </div>
              <button
                type="button"
                onClick={commit}
                className="w-full h-12 mt-4 rounded-xl bg-emerald-600 text-white text-base font-bold"
              >
                Xong
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Root>
    </>
  )
}
