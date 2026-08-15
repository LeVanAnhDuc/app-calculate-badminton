# Design system — Tính tiền cầu lông

Trích từ code React đang chạy (`src/`), không phải từ mockup. Mockup mới **phải** dùng đúng
các token dưới đây thì bản thiết kế mới chuyển thành component được mà không phải vẽ lại.

Khi UI thật đổi (đổi màu chủ đạo, đổi bo góc, đổi chiều cao control), cập nhật file này ngay
trong cùng commit — đây là nguồn tham chiếu duy nhất cho mọi mockup sau đó.

## Nền tảng

- Tailwind v4 (`@import "tailwindcss"` trong `src/index.css`), **không có custom token**.
  Mọi thứ là utility class gốc của Tailwind → mockup dùng Tailwind CDN là khớp 1-1.
- Font: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
  Không dùng Google Fonts trong mockup — app thật không tải font ngoài.
- Ngôn ngữ: tiếng Việt, `<html lang="vi">`.
- Mobile-first. Breakpoint duy nhất đang dùng là `md:` (768px).

## Bảng màu

| Vai trò | Class | Ghi chú |
|---|---|---|
| Chủ đạo | `emerald-600` (#059669) | Header, nút chính, trạng thái bật. Trùng `theme-color` trong `index.html` |
| Chủ đạo đậm | `emerald-700` | Nút phụ trên nền header, chữ link |
| Chủ đạo nhạt | `emerald-50` / `emerald-100` | Nền vùng nhấn, viền card kết quả |
| Chữ chính | `gray-900` | |
| Chữ phụ | `gray-500` | |
| Chữ mờ / placeholder | `gray-400` | |
| Nền trang (mobile) | `gray-50` | Khung tối đa 430px ở giữa |
| Nền ngoài khung | `gray-100` | Dải hai bên trên desktop |
| Nền input / vùng chìm | `gray-100` | |
| Viền | `gray-300` (input), `gray-200`/`gray-100` (chia mục) | |
| Nữ | `pink-500` / `pink-100` / `pink-700` | Badge giới tính |
| Nam | `emerald` / `gray` | Nam không có màu riêng, mặc định trung tính |
| Xoá / nguy hiểm | `red-500`, `red-50`, `red-600` | |
| Cảnh báo | `amber-600`, `amber-50` | |

Không thêm màu mới ngoài bảng này nếu không có lý do rõ. Không dùng gradient — app thật
dùng màu phẳng.

## Bo góc

- `rounded-xl` — mặc định cho input, nút, hàng danh sách (dùng nhiều nhất, 59 chỗ).
- `rounded-2xl` — card `<section>`.
- `rounded-full` — avatar, badge, chip, nút tròn.
- `rounded-b-3xl` — chỉ dùng cho header (bo đáy trên mobile, `md:rounded-none`).

## Chiều cao control

- `h-12` (48px) — nút hành động chính, input chính.
- `h-11` (44px) — **sàn cho mọi vùng chạm**: nút icon, chip, input phụ, nút trong card.
  Đây là ngưỡng tap-target tối thiểu của iOS, không có ngoại lệ cho thứ bấm được.
- `h-10` / `h-9` — chỉ cho phần **nhìn thấy** nằm bên trong một vùng chạm ≥44px:
  vòng tròn trong PaidToggle, badge giới tính 32px đặt trong nút 44px. Bản thân
  chúng không bao giờ là vùng chạm.
- Ngoại lệ duy nhất: rail A–Z trong Danh bạ (`w-11 h-7`) — 26 chữ cái xếp dọc không
  thể mỗi chữ cao 44px trong màn 844px, và thao tác chính của rail là vuốt chứ
  không phải bấm.

## Khung trang

```html
<div class="bg-gray-100 min-h-dvh">
  <div class="w-full max-w-[430px] mx-auto bg-gray-50 min-h-dvh
              pb-[calc(2rem+env(safe-area-inset-bottom))]
              md:max-w-none md:bg-gray-100 md:pb-0">
    <header class="bg-emerald-600 px-4 pt-8 pb-6 rounded-b-3xl
                   md:rounded-none md:px-0 md:py-5"> … </header>
    <main class="px-4 -mt-2 space-y-4
                 md:max-w-5xl md:mx-auto md:px-6 md:mt-0 md:py-6
                 md:grid md:grid-cols-5 md:gap-6 md:space-y-0 md:items-start"> … </main>
  </div>
</div>
```

- Mobile: 1 cột, khung `w-full` giới hạn tối đa 430px (phủ trọn mọi điện thoại thực
  tế — iPhone 15 Pro Max 430px, Pixel 412px — nên máy to không còn hai dải xám hai
  bên), card cách nhau `space-y-4`.
- `min-h-dvh` chứ không `min-h-screen`: thanh địa chỉ của trình duyệt mobile co giãn,
  `100vh` sẽ tràn ra ngoài màn hình.
- `pb-[calc(2rem+env(safe-area-inset-bottom))]` để nút cuối trang không nằm dưới vạch
  home indicator. Gộp thành **một** class thay vì `pb-8` + `pb-[env(...)]` vì hai
  utility `padding-bottom` trên cùng element sẽ đè nhau theo thứ tự CSS. Cần
  `viewport-fit=cover` trong meta viewport (`index.html`) thì `env()` mới khác 0.
- Desktop (`md:`): lưới 5 cột — nhập liệu `md:col-span-3`, kết quả `md:col-span-2` và
  `md:sticky md:top-6`.
- `-mt-2` cho `main` để card đầu tiên đè nhẹ lên đáy header.

## Card

```html
<section class="bg-white rounded-2xl shadow-sm p-4"> … </section>
```

Card kết quả nhấn thêm viền: `border-2 border-emerald-100`.

## Nút

- Chính: `h-12 w-full rounded-xl bg-emerald-600 text-white text-sm font-semibold`
- Trên nền header: `h-11 px-4 rounded-xl bg-emerald-700 text-white text-sm font-semibold`
- Text-only: `h-12 text-emerald-700 text-sm font-semibold`
- Thêm mới (dashed): `h-11 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-600 font-semibold text-sm`

## Input

```html
<input class="h-11 rounded-xl border border-gray-300 px-3 text-base text-gray-900">
```

- Input số tiền: `inputmode="numeric"`, canh phải, `font-semibold`.
- `text-base` (16px) trở lên cho mọi input — dưới 16px iOS Safari sẽ tự zoom khi focus.

## Icon

Dùng **SVG inline**, không dùng ký tự/emoji làm icon (glyph chữ bị lệch baseline —
xem commit `cb3f9d3`, `f966131`). Emoji chỉ dùng trong tiêu đề/nhãn văn xuôi (🏸 ở tên app).

## Thư viện đang dùng (mockup nên mô phỏng đúng hành vi)

| Thư viện | Dùng cho |
|---|---|
| `vaul` | Bottom sheet (QR, chọn người trả) — kéo xuống để đóng |
| `motion` | Animation nhẹ: ModeSwitch trượt, hàng list vào/ra |
| `sonner` | Toast |
| `react-mobile-picker` | Chọn giờ kiểu bánh xe iOS |

Nếu mockup vẽ một trong các pattern trên, vẽ đúng hình dạng của thư viện tương ứng
(sheet có tay nắm ở đầu, picker có dải mờ trên/dưới) để lúc code không lệch.
