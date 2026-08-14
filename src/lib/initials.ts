/**
 * Chữ cái đầu để vẽ avatar tròn: từ đầu + từ cuối ("Đức Anh" → "ĐA").
 *
 * Lấy cả từ giữa sẽ tràn ô tròn với tên tiếng Việt 3–4 chữ, mà từ giữa lại là
 * phần ít phân biệt nhất giữa những người trùng họ.
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
}
