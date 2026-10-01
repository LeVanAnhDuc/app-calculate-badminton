// libs
import { useRef, useState } from "react";
// others
import { parseRatio } from "@/utils/format";

/**
 * Ô hệ số: không đặt `type="number"` (bàn phím tiếng Việt cho dấu phẩy, mà
 * input number coi `1,5` là không hợp lệ và trả về chuỗi rỗng). Giữ chuỗi
 * người dùng đang gõ trong `draft` để `1,` không bị nuốt, chỉ báo lên trên
 * khi parse ra số dương.
 */
const RatioField = ({
  id,
  label,
  value,
  onChange
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) => {
  const [draft, setDraft] = useState(() => String(value));
  const lastValue = useRef(value);

  // prop đổi từ bên ngoài (nạp lại buổi cũ) thì draft phải theo — trừ khi
  // draft đang chính là giá trị đó, tức người dùng vừa gõ ra nó
  if (lastValue.current !== value) {
    lastValue.current = value;
    if (parseRatio(draft) !== value) setDraft(String(value));
  }

  return (
    <div className="flex-1">
      <label className="mb-1 block text-xs text-gray-500" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          const parsed = parseRatio(e.target.value);
          if (parsed !== null) onChange(parsed);
        }}
        onBlur={() => {
          if (parseRatio(draft) === null) setDraft(String(value));
        }}
        className="h-12 w-full rounded-xl border border-gray-300 px-3 text-center text-lg font-semibold"
      />
    </div>
  );
};

export default RatioField;
