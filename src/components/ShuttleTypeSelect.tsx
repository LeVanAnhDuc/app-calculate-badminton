import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Drawer } from 'vaul'
import { formatVND } from '../lib/format'
import { MoneyInput } from './MoneyInput'
import type { ShuttleType } from '../lib/shuttleTypes'

interface Props {
  value: string
  /** Đơn giá / quả của dòng này. */
  price: number
  /** Luôn gửi cả tên lẫn giá — không còn tham số optional. */
  onChange: (name: string, price: number) => void
  /** Đã xếp hạng & lọc sẵn bởi cha — component này chỉ hiển thị. */
  suggestions: ShuttleType[]
  'aria-label': string
  className?: string
}

/**
 * Chọn loại cầu theo mô-típ `TimeSelect`: một nút hiển thị tên + đơn giá mở
 * bottom sheet (vaul) thay vì `<select>` native. Trong sheet: gõ tên tự do, ô
 * giá / quả ngay dưới, chip loại hay dùng khi ô tên còn trống, danh sách lọc
 * theo tiền tố khi đã gõ. Kéo xuống / bấm overlay / Esc = hủy, giữ nguyên cả
 * tên lẫn giá cũ.
 */
export function ShuttleTypeSelect({
  value,
  price,
  onChange,
  suggestions,
  'aria-label': label,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const [draftPrice, setDraftPrice] = useState(price)

  const openSheet = () => {
    setDraft(value)
    setDraftPrice(price)
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
    onChange(trimmed, draftPrice)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={openSheet}
        className={`h-11 rounded-xl border border-gray-300 px-3 text-left flex items-center ${
          value && price > 0 ? 'gap-1.5' : ''
        } ${className}`}
      >
        {value ? (
          <>
            <span className="text-sm font-medium text-gray-900 truncate">{value}</span>
            {price > 0 && (
              <span className="text-sm text-gray-400 shrink-0">· {formatVND(price)}</span>
            )}
          </>
        ) : (
          <span className="text-sm text-gray-400">Chọn loại cầu</span>
        )}
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

              <label className="text-xs text-gray-500 block mt-3 mb-1">Giá / quả</label>
              <MoneyInput
                aria-label="Giá / quả"
                value={draftPrice}
                onChange={setDraftPrice}
                className="w-full"
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
