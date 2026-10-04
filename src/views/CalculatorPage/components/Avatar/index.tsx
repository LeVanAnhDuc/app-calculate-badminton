// types
import type { Gender } from "@/types/Session";
// components
import CapCentred from "@/components/CapCentred";
// others
import { initials } from "@/utils/initials";

/**
 * Avatar tròn kiểu danh bạ iOS: chữ cái đầu của tên, nền tô theo giới tính.
 *
 * `aria-hidden` vì nút bọc ngoài luôn tự khai báo `aria-label` đầy đủ (tên +
 * giới tính) — để trình đọc màn hình đọc thêm "ĐA" chỉ gây nhiễu.
 */
const Avatar = ({
  name,
  gender,
  className = "w-9 h-9 text-xs"
}: {
  name: string;
  gender: Gender;
  /** Cỡ ô tròn và cỡ chữ; ghi đè để dùng ở rail (to) hay hàng danh sách (nhỏ). */
  className?: string;
}) => {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${
        gender === "male"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-pink-100 text-pink-700"
      } ${className}`}
    >
      <CapCentred>{initials(name)}</CapCentred>
    </span>
  );
};

export default Avatar;
