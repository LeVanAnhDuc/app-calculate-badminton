import { useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { TrashIcon } from './DeleteButton'

const OPEN_PX = 80
const THRESHOLD_PX = 40

interface Props {
  /** data-testid của mặt trượt, để test bám vào transform. */
  testId: string
  /** Nhãn của nút xóa lộ ra sau lưng hàng, ví dụ `Xóa nhanh Tuấn`. */
  label: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
  /** Bỏ qua thao tác vuốt — dùng khi hàng đang được kéo để sắp xếp. */
  disabled?: boolean
  /** Class cho khung ngoài (bo góc, đổ bóng của cả khối). */
  className?: string
  /** Class cho mặt trượt bên trên nút xóa (nền, padding, layout của hàng). */
  surfaceClassName?: string
  children: ReactNode
}

/**
 * Vuốt trái để xóa — thao tác xóa duy nhất trên mobile ở mọi danh sách.
 * Gom về một chỗ vì trước đây logic này được chép lại ở từng danh sách.
 */
export function SwipeToDelete({
  testId,
  label,
  isOpen,
  onOpenChange,
  onDelete,
  disabled = false,
  className = '',
  surfaceClassName = '',
  children,
}: Props) {
  const [delta, setDelta] = useState<number | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const deltaRef = useRef<number | null>(null)

  const translate = delta ?? (isOpen ? -OPEN_PX : 0)
  // Hàng đóng che kín khay đỏ, nhưng mặt trượt có transform riêng nên viền của
  // nó bị khử răng cưa ở toạ độ lẻ pixel và để lọt một sợi đỏ quanh hàng — nên
  // khay chỉ tô màu khi hàng thực sự đang được vuốt.
  const revealed = delta !== null || isOpen

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled) return
    const t = e.touches[0]
    startRef.current = { x: t.clientX, y: t.clientY ?? 0 }
    deltaRef.current = 0
    setDelta(0)
  }

  const handleTouchMove = (e: TouchEvent) => {
    const start = startRef.current
    if (disabled || !start) return
    const t = e.touches[0]
    const dx = t.clientX - start.x
    const dy = (t.clientY ?? 0) - start.y
    // Khóa trục: cuộn dọc hơi chéo tay không được kéo hàng sang ngang. Một khi
    // cử chỉ đã bị xử là cuộn dọc thì bỏ luôn phần còn lại của nó.
    if (Math.abs(dy) > Math.abs(dx)) {
      startRef.current = null
      deltaRef.current = null
      setDelta(null)
      return
    }
    const next = Math.min(0, Math.max(dx, -OPEN_PX))
    deltaRef.current = next
    setDelta(next)
  }

  const handleTouchEnd = () => {
    const value = deltaRef.current
    startRef.current = null
    deltaRef.current = null
    setDelta(null)
    if (value === null) return
    onOpenChange(value <= -THRESHOLD_PX)
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <button
        type="button"
        aria-label={label}
        onClick={onDelete}
        className={`absolute inset-y-0 right-0 w-20 bg-red-500 text-white text-[11px] font-semibold flex flex-col items-center justify-center gap-0.5 transition-opacity duration-150 ${
          revealed ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <TrashIcon />
        Xóa
      </button>
      <div
        data-testid={testId}
        className={`relative transition-transform duration-150 ease-out ${surfaceClassName}`}
        style={{ transform: `translateX(${translate}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClickCapture={(e) => {
          // hàng đang mở: chạm đầu tiên là để đóng lại, không xuyên xuống nội dung
          if (isOpen) {
            onOpenChange(false)
            e.stopPropagation()
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}
