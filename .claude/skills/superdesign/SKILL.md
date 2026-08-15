---
name: superdesign
description: Thiết kế màn hình / UI mới cho app "Tính tiền cầu lông" bằng mockup HTML trong superdesign/ trước khi viết code React. Dùng khi người dùng muốn thêm màn hình mới, đổi bố cục, thử phương án giao diện, hoặc nói "design", "thiết kế", "vẽ giao diện", "superdesign".
---

# Superdesign — quy trình thiết kế UI của dự án

Mọi màn hình mới hoặc thay đổi bố cục lớn đều đi qua mockup HTML **trước**, không code
React trước rồi sửa sau. Mockup rẻ, component React thì đắt.

**Đọc `superdesign/design-system.md` trước khi vẽ bất cứ thứ gì.** Nó chứa token thật
trích từ `src/`, không phải màu tự nghĩ ra.

## Cấu trúc

```
superdesign/
  design-system.md          ← token thật của app (nguồn tham chiếu duy nhất)
  _template.html            ← khung khởi đầu, copy ra để vẽ
  metadata.json             ← khai báo mọi mockup (mảng JSON)
  gallery.html              ← SINH TỰ ĐỘNG, không sửa tay
  design_iterations/
    {feature}_{n}.html      ← phương án thứ n cho tính năng
    {feature}_{n}_{m}.html  ← bản sửa thứ m của phương án n
```

Quy ước tên: `snake_case`, không dấu. Ví dụ `roster_page_1.html`, `roster_page_1_2.html`.
Bản desktop của cùng một phương án là một iteration riêng (`_1_1.html` với
`"viewport": "desktop"`), không nhét hai khung vào một file.

## Quy trình

### 1. Làm rõ yêu cầu

Hỏi tối đa 2–3 câu, chỉ hỏi thứ làm đổi bố cục: màn hình này đứng ở đâu trong luồng,
dữ liệu gì phải hiện, hành động chính là gì. Đừng hỏi về màu — màu đã chốt rồi.

### 2. Wireframe ASCII trước

Vẽ bố cục bằng ASCII ngay trong chat và **chờ người dùng duyệt**. Chưa duyệt thì chưa
sinh HTML. Bước này bắt lỗi bố cục trong 30 giây thay vì sau khi đã vẽ xong 200 dòng.

```
┌─ 390px ────────────────┐
│ ▓▓ header emerald ▓▓   │
├────────────────────────┤
│ ┌────────────────────┐ │
│ │ card: tiêu đề      │ │
│ │ [input h-11      ] │ │
│ └────────────────────┘ │
│ [ nút chính h-12     ] │
└────────────────────────┘
```

### 3. Sinh mockup

- Copy `superdesign/_template.html` → `design_iterations/{feature}_{n}.html`.
- Nếu người dùng muốn xem nhiều phương án, sinh **song song** `_1`, `_2`, `_3` — khác nhau
  ở bố cục/luồng thao tác, không phải khác nhau ở màu.
- Điền dữ liệu mẫu tiếng Việt thật (tên người chơi, số tiền có dấu chấm phân cách:
  `150.000đ`), không dùng "Lorem ipsum" hay "Item 1".

Ràng buộc bắt buộc:

- Chỉ dùng token trong `design-system.md`. Không thêm màu mới, không gradient.
- Tailwind CDN + font hệ thống. **Không** Google Fonts, không icon font, không thư viện ngoài.
- Icon là SVG inline. Không dùng ký tự chữ (`✓`, `×`) làm icon — bị lệch baseline.
- Mọi thứ bấm được cao tối thiểu `h-11` (44px). Input `text-base` trở lên.
- Vẽ mobile 390px trước. Bản desktop (`md:` lưới 5 cột) chỉ vẽ khi màn hình đó thật sự
  có bố cục desktop riêng.

### 4. Khai báo và dựng lại gallery

Thêm một entry vào `superdesign/metadata.json`:

```json
{
  "file": "roster_page_1.html",
  "title": "Trang người chơi — Mobile",
  "note": "Tìm kiếm dính đầu · vuốt để xoá",
  "screen": "roster",
  "viewport": "mobile",
  "status": "candidate",
  "date": "2026-08-15"
}
```

`status`: `candidate` (chờ duyệt) → `approved` (đã chốt) → `rejected` (không chọn).
`draft` cho bản chưa xong. Thêm `"wide": true` nếu muốn card chiếm cả hàng trong gallery.

Rồi chạy:

```
npm run design:gallery
```

Script fail nếu metadata và thư mục lệch nhau — đó là chủ ý, đừng bỏ qua lỗi. Sau đó bảo
người dùng mở `superdesign/gallery.html` bằng trình duyệt (file:// là đủ, không cần server).

### 5. Lặp

Người dùng góp ý → tạo file iteration mới `{feature}_{n}_{m}.html`, **không ghi đè** bản cũ.
Giữ lại lịch sử phương án là điểm chính của thư mục này.

### 6. Chốt rồi mới code

Khi người dùng duyệt:

1. Đổi `status` của bản được chọn thành `approved`, các bản còn lại thành `rejected`,
   chạy lại `npm run design:gallery`.
2. Lúc này mới sang code React — theo `superpowers:test-driven-development` như mọi
   tính năng khác của repo.
3. Nếu lúc code phải lệch khỏi mockup (giới hạn kỹ thuật, dữ liệu thật dài hơn dự tính),
   nói rõ chỗ lệch cho người dùng và cập nhật lại mockup cho khớp — mockup sai còn hại
   hơn không có mockup.
4. Nếu thay đổi làm đổi token chung (màu chủ đạo, bo góc, chiều cao control), cập nhật
   `superdesign/design-system.md` trong cùng commit.

## Commit

Mockup và gallery là tài liệu, không phải tính năng người dùng:

- Chỉ thêm/sửa mockup → `docs:` (không kèm `[skip release]`, xem `CLAUDE.md`).
- Mockup đi kèm code React của tính năng mới → gộp vào commit `feat:` của tính năng đó,
  và nhớ cập nhật `README.md` như quy định.

## Khi KHÔNG cần dùng skill này

Sửa chữ, sửa một class Tailwind, đổi thứ tự hai nút, sửa lỗi hiển thị — cứ sửa thẳng
trong React. Skill này dành cho màn hình mới hoặc thay đổi bố cục đáng kể.
