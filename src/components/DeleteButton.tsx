/**
 * Icon xóa dùng chung. Vẽ bằng SVG chứ không dùng ký tự "×": hộp chữ của một
 * glyph không cân quang học trong ô vuông, nên nút xóa cũ luôn trông lệch so
 * với icon SVG (cây bút) nằm ngay cạnh.
 */
export function TrashIcon() {
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
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

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
