import { initials } from '../lib/initials'
import type { Gender } from '../lib/types'
import { CapCentred } from './CapCentred'

/**
 * Avatar tròn kiểu danh bạ iOS: chữ cái đầu của tên, nền tô theo giới tính.
 *
 * `aria-hidden` vì nút bọc ngoài luôn tự khai báo `aria-label` đầy đủ (tên +
 * giới tính) — để trình đọc màn hình đọc thêm "ĐA" chỉ gây nhiễu.
 */
export function Avatar({
  name,
  gender,
  className = 'w-9 h-9 text-xs',
}: {
  name: string
  gender: Gender
  /** Cỡ ô tròn và cỡ chữ; ghi đè để dùng ở rail (to) hay hàng danh sách (nhỏ). */
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`rounded-full font-bold flex items-center justify-center shrink-0 ${
        gender === 'male' ? 'bg-emerald-100 text-emerald-700' : 'bg-pink-100 text-pink-700'
      } ${className}`}
    >
      <CapCentred>{initials(name)}</CapCentred>
    </span>
  )
}
