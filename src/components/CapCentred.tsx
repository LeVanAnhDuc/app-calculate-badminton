import type { ReactNode } from 'react'

/**
 * Chữ đóng vai icon (chữ cái trong avatar) canh giữa theo chiều cao chữ hoa.
 *
 * `items-center` chỉ canh giữa hộp dòng chữ, mà hộp đó chừa sẵn phần chân chữ
 * (descent) ở dưới cho những chữ như g, y — chữ hoa không dùng tới. Kết quả là
 * chữ luôn rơi thấp hơn tâm ô tròn. Độ lệch bằng (ascent − descent)/2 − cap/2,
 * đo bằng TextMetrics trên trình duyệt ra 0.0625em, không đổi theo cỡ chữ, nên
 * nhích lên đúng chừng đó là cân. Đổi line-height không chữa được: nửa khoảng
 * dòng (half-leading) chia đều hai phía nên độ lệch không đổi.
 *
 * Ở cỡ chữ nhỏ trình duyệt làm tròn số đo font về pixel nguyên nên còn dư dưới
 * nửa pixel — mắt không thấy được, và bám theo em vẫn đúng hơn là chỉnh tay
 * từng cỡ theo cách làm tròn của riêng một trình duyệt.
 *
 * Phải là hộp khối vì transform không có tác dụng lên hộp inline.
 */
export function CapCentred({ children }: { children: ReactNode }) {
  return <span className="block -translate-y-[0.0625em]">{children}</span>
}
