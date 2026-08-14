/**
 * Bộ icon dùng chung. Mọi icon đều là SVG, không dùng ký tự chữ như "←" "+" "×":
 * glyph được vẽ trên đường baseline và font chừa sẵn phần chân chữ (descent)
 * không cân bên dưới, nên một glyph vẽ quanh trục toán học nằm thấp hơn tâm nút
 * khoảng 3px dù hộp nút đã canh giữa hoàn hảo — không CSS nào chữa được.
 *
 * Cùng một bộ nét: viewBox 24, stroke 2, đầu nét bo tròn.
 */
interface IconProps {
  /** Cạnh của icon tính bằng px. */
  size?: number
}

function Icon({ size = 20, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function ArrowLeftIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </Icon>
  )
}

export function PlusIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  )
}

export function CloseIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Icon>
  )
}

export function PencilIcon({ size = 16 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </Icon>
  )
}

export function TrashIcon({ size = 16 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </Icon>
  )
}
