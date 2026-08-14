import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Drawer } from 'vaul'
import { formatVND } from '../lib/format'
import type { ShuttleType } from '../lib/shuttleTypes'

interface Props {
  value: string
  /** `price` chỉ có khi người dùng chọn một gợi ý; gõ tay thì để nguyên giá. */
  onChange: (name: string, price?: number) => void
  /** Đã xếp hạng & lọc sẵn bởi cha — component này chỉ hiển thị. */
  suggestions: ShuttleType[]
  'aria-label': string
  className?: string
}

/**
 * Chọn loại cầu theo mô-típ `TimeSelect`: một nút hiển thị giá trị mở bottom
 * sheet (vaul) thay vì `<select>` native. Trong sheet: gõ tên tự do, chip loại
 * hay dùng khi ô còn trống, danh sách lọc theo tiền tố khi đã gõ. Kéo xuống /
 * bấm overlay / Esc = hủy, giữ nguyên giá trị cũ.
 */
export function ShuttleTypeSelect({
  value,
  onChange,
  suggestions,
  'aria-label': label,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)

  const openSheet = () => {
    setDraft(value)
    setOpen(true)
  }

  const trimmed = draft.trim()
  const matches = trimmed
    ? suggestions.filter((s) => s.name.toLowerCase().startsWith(trimmed.toLowerCase()))
    : []
  const showChips = trimmed === '' && suggestions.length > 0

  const pick = (s: ShuttleType) => {
    onChange(s.name, s.price)
    setOpen(false)
  }

  const commit = () => {
    onChange(trimmed)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={openSheet}
        className={`h-11 rounded-xl border border-gray-300 px-3 text-sm text-left truncate ${
          value ? 'text-gray-900 font-medium' : 'text-gray-400'
        } ${className}`}
      >
        {value || 'Chọn loại cầu'}
      </button>

      <Drawer.Root open={open} onOpenChange={(o: boolean) => !o && setOpen(false)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40" />
          <Drawer.Content className="fixed bottom-0 inset-x-0 z-[70] rounded-t-3xl bg-white outline-none">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="max-w-lg mx-auto p-4 pb-8">
              <Drawer.Title className="font-bold text-gray-900 mb-3 text-center">
                {label}
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                Gõ tên loại cầu hoặc chọn một loại đã dùng trước đó
              </Drawer.Description>
              <input
                autoFocus
                aria-label="Tên loại cầu"
                placeholder="Tên loại cầu (Hải Yến, Ba Sao…)"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && commit()}
                className="w-full h-12 rounded-xl border border-gray-300 px-3 text-base text-gray-900"
              />

              <AnimatePresence>
                {matches.length > 0 && (
                  <motion.div
                    key="matches"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-2 mt-3"
                  >
                    <p className="text-xs font-semibold text-gray-400 px-1">Đã dùng trước đó</p>
                    {matches.map((s) => (
                      <button
                        key={s.name}
                        type="button"
                        aria-label={`Chọn ${s.name} · ${formatVND(s.price)}`}
                        onClick={() => pick(s)}
                        className="w-full h-12 rounded-xl border border-gray-200 bg-white flex items-center gap-2 px-3 text-left"
                      >
                        <span className="font-medium text-gray-900 flex-1 truncate">{s.name}</span>
                        <span className="text-xs text-gray-400">{formatVND(s.price)}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {showChips && (
                <div className="flex flex-col gap-2 mt-3">
                  <p className="text-xs font-semibold text-gray-400 px-1">Hay dùng</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s.name}
                        type="button"
                        aria-label={`Chọn ${s.name} · ${formatVND(s.price)}`}
                        onClick={() => pick(s)}
                        className="h-11 rounded-full border border-gray-200 bg-white flex items-center gap-2 px-4"
                      >
                        <span className="text-sm font-medium text-gray-900">{s.name}</span>
                        <span className="text-xs text-gray-400">{formatVND(s.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
      </Drawer.Root>
    </>
  )
}
