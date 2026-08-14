import { TrashIcon } from './icons'

interface Props {
  /** Nhãn cho screen reader, ví dụ `Xóa Tuấn`. */
  label: string
  onClick: () => void
}

/**
 * Chỉ hiện từ md trở lên: trên mobile mọi thao tác xóa đều là vuốt trái, nên
 * hàng không còn nút xóa nào chiếm chỗ.
 */
export function DeleteButton({ label, onClick }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title="Xóa"
      onClick={onClick}
      className="hidden md:flex md:w-10 md:h-10 shrink-0 items-center justify-center rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
    >
      <TrashIcon />
    </button>
  )
}
