# Nhiều loại cầu trong một buổi — Thiết kế

Ngày: 2026-08-14

## Vấn đề

Một buổi hiện chỉ nhập được **một** cặp `số quả × giá/quả`. Thực tế nhóm hay dùng
nhiều loại cầu với giá khác nhau trong cùng buổi (hết cầu xịn thì chơi cầu rẻ, hoặc
mỗi người mang một loại). Người dùng phải tự cộng nhẩm rồi nhập một giá trung bình
giả — sai số và không xem lại được.

## Phạm vi

Cho phép nhập **nhiều dòng cầu**, mỗi dòng có tên loại, số lượng và giá riêng.
Cách chia tiền **không đổi**: tổng tiền cầu (cộng mọi dòng) vẫn chia theo hệ số
Nam/Nữ như hiện nay ở cả hai chế độ. Muốn một loại cầu do riêng ai đó chịu thì đã
có mục "Chi phí phát sinh khác" — không thêm luật chia mới.

Không làm (YAGNI): breakdown tiền cầu theo từng loại trong kết quả/ảnh chia sẻ;
màn hình quản lý danh bạ cầu; gán loại cầu cho từng người.

## Data model

`src/lib/types.ts`:

```ts
export interface ShuttleLine {
  id: string
  name: string    // "Hải Yến 3 sao" — có thể rỗng lúc vừa thêm
  count: number   // số quả, nguyên ≥ 0
  price: number   // VND / quả, ≥ 0
}
```

`SessionInput` bỏ `shuttleCount: number` và `shuttlePrice: number`, thay bằng
`shuttles: ShuttleLine[]` — mảng phẳng, không có "dòng chính" đặc biệt, đúng mô-típ
`extras` đang dùng.

`CalcResult` và `PlayerResult` **không đổi**.

## Tính toán

`src/lib/calc.ts` — đổi đúng một hàm:

```ts
export function shuttleTotal(input: SessionInput): number {
  return input.shuttles.reduce((s, l) => s + l.count * l.price, 0)
}
```

`calcRatioMode`, `calcHourlyMode`, `buildResult`, `PlayerResult.shuttleShare` giữ
nguyên hoàn toàn.

`validateSession` thêm: mỗi dòng cần `count` và `price` là số hữu hạn ≥ 0, nếu
không → lỗi `Số lượng/giá của "<tên hoặc 'loại cầu'>" chưa hợp lệ`. Tên rỗng
**không** phải lỗi (dòng được tạo rỗng rồi điền dần, y như `extras`). Danh sách
rỗng cũng hợp lệ — luật "Tổng chi phải lớn hơn 0" sẵn có đã chặn buổi trắng.

## Di trú dữ liệu (soft migration)

Cùng mô-típ đã dùng cho `paid` và `extras` — dữ liệu cũ **không bị mất**, nên đây là
`feat:` (minor bump), không phải breaking change.

`src/lib/storage.ts`:

- `isSession` chấp nhận **cả hai** dạng:
  - cũ: `shuttleCount` và `shuttlePrice` là number, `shuttles` undefined
  - mới: `shuttles` là mảng `ShuttleLine` hợp lệ (`isShuttleLine`)
- `normalizeSession` quy đổi dạng cũ → `shuttles: [{ id: 'shuttle-legacy', name: '',
  count: shuttleCount, price: shuttlePrice }]` và **xóa** hai trường cũ khỏi object
  trả về. Dùng id cố định `'shuttle-legacy'` thay vì `uid()` để mỗi lần load lịch sử
  cho ra cùng một id (React key ổn định giữa các lần render).
- Áp dụng cho cả `currentSession` và mọi buổi trong `history`.

`Settings` thêm `shuttleName: string` cạnh `shuttlePrice` sẵn có; guard chấp nhận
thiếu trường này (dữ liệu cũ) và `DEFAULT_SETTINGS.shuttleName = ''`.

## Danh bạ loại cầu

Suy ra từ `history`, **không** thêm key localStorage mới — cùng mô-típ
`src/lib/frequent.ts` đang dùng cho người chơi.

`src/lib/shuttleTypes.ts`:

```ts
export interface ShuttleType { name: string; price: number }

export function frequentShuttleTypes(
  history: readonly SavedSession[],
  excludeNames: readonly string[],
  limit?: number,
): ShuttleType[]
```

- Gộp theo tên viết thường (`name.trim().toLowerCase()`), bỏ qua dòng tên rỗng.
- `count` = số buổi đã lưu có loại cầu đó (trùng trong cùng buổi chỉ tính 1).
- `price` và cách viết hoa của tên lấy từ buổi có `savedAt` **mới nhất**.
- Sắp xếp: `count` giảm dần → `savedAt` gần nhất → tên (`localeCompare(vi)`), cho
  kết quả tất định.
- Bỏ những tên trong `excludeNames` (các dòng cầu khác đang có trong buổi) — chọn
  trùng loại trong cùng buổi là vô nghĩa.
- `limit` mặc định 8.

## UI

### `CostForm.tsx` — khối "Tiền cầu"

Thay cặp ô `Số quả cầu × Giá / quả` bằng một danh sách dòng:

```
Tiền cầu
┌────────────┐ ┌─────┐ ┌────────┐
│ Hải Yến  ▾ │ │  4  │ │ 25.000 │  ×
└────────────┘ └─────┘ └────────┘
[ + Thêm loại cầu ]
                     Tiền cầu  100.000đ
```

- Mỗi dòng: `<ShuttleTypeSelect>` (flex-1, truncate) · ô số lượng (numeric, w-16) ·
  `<MoneyInput>` giá (w-24) · nút `×` xóa dòng.
- Nút `+ Thêm loại cầu` (viền đứt, giống `+ Thêm khoản`) thêm dòng rỗng
  `{ id: uid(), name: '', count: 0, price: 0 }`.
- Xóa dòng **không** undo được (giống xóa dòng phát sinh — gõ lại mất 2 giây).
- Dòng tổng "Tiền cầu" giữ nguyên vị trí và cách hiển thị.
- Khi danh sách rỗng: chỉ còn nút `+ Thêm loại cầu`.

### `ShuttleTypeSelect.tsx` (mới)

Theo mô-típ `TimeSelect`: một nút hiển thị giá trị, bấm vào mở bottom sheet `vaul`.
Không dùng `<select>` native.

- Nút hiển thị `name` hoặc placeholder "Chọn loại cầu" khi rỗng.
- Sheet chứa:
  - Ô text "Tên loại cầu" (autofocus).
  - **Chip** các loại hay dùng khi ô text còn trống (mô-típ "Hay chơi cùng").
  - **Danh sách gợi ý** lọc theo tiền tố khi đã gõ (mô-típ "Từ danh bạ"), mỗi mục
    hiện tên + giá lần gần nhất.
  - Bấm chip hoặc mục gợi ý → điền **cả tên và giá**, đóng sheet ngay.
  - Nút "Xong" → nhận tên đang gõ, **không** đổi giá, đóng sheet.
- Hủy (kéo xuống / bấm overlay / Esc) → giữ nguyên giá trị cũ, giống `TimeSelect`.
- Props: `value: string`, `onChange: (name: string, price?: number) => void`,
  `suggestions: ShuttleType[]`, `aria-label: string`, `className?: string`.
  Component chỉ hiển thị — việc xếp hạng do `App` làm và truyền xuống, giống cách
  `PlayerList` nhận `frequent`.
- `CostForm` lọc `suggestions` cho từng dòng: bỏ tên của **các dòng khác** trong
  buổi, nhưng giữ tên của chính dòng đang mở (nếu không, mở sheet của dòng "Hải Yến"
  sẽ không thấy "Hải Yến" trong danh sách).

### `App.tsx`

- `defaultSession` tạo đúng **một** dòng
  `{ id: uid(), name: settings.shuttleName, price: settings.shuttlePrice, count: 0 }`.
- Effect ghi `Settings` lấy `shuttleName`/`shuttlePrice` từ **dòng đầu tiên** của
  buổi; buổi không có dòng nào thì giữ giá trị cũ đang lưu.
- `handleNewSession`: điều kiện "chưa nhập gì" đổi `previous.shuttleCount === 0`
  thành `previous.shuttles.every((l) => l.count === 0)`.
- Tính `frequentShuttleTypes(history, ...)` và truyền xuống `CostForm`.

### `HistoryPage.tsx`

Dòng `Tiền cầu (6 quả × 25.000đ)` trở thành một dòng cho **mỗi** loại cầu:

- có tên → `Hải Yến (4 quả × 25.000đ)`
- tên rỗng (buổi cũ đã di trú) → `Tiền cầu (6 quả × 25.000đ)` — giữ nguyên như trước
- bỏ qua dòng có `count === 0`

`ResultPanel`, `shareResult`, `exportImage` **không đổi** — chúng chỉ đọc
`shuttleShare` của từng người, vốn không thay đổi.

## Kiểm thử

- `calc.test.ts`: tổng nhiều dòng; danh sách rỗng → tiền cầu 0; validate dòng có
  `count`/`price` âm hoặc `NaN`; khẳng định `shuttleShare` từng người giữ nguyên khi
  gộp 2 dòng thành 1 dòng cùng tổng tiền.
- `storage.test.ts`: buổi cũ (`shuttleCount`/`shuttlePrice`) load ra 1 dòng
  `shuttle-legacy`; buổi mới round-trip nguyên vẹn; guard loại bỏ `shuttles` sai kiểu;
  `Settings` cũ thiếu `shuttleName` → `''`.
- `shuttleTypes.test.ts` (mới): xếp hạng theo số buổi → gần nhất → tên; giá lấy từ
  buổi mới nhất; lọc `excludeNames`; bỏ tên rỗng; không phân biệt hoa/thường.
- `ShuttleTypeSelect.test.tsx` (mới): mở sheet; chip điền tên + giá; gợi ý lọc theo
  tiền tố; "Xong" nhận tên gõ tay mà không đổi giá; hủy giữ giá trị cũ.
- `CostForm.test.tsx`: thêm/xóa dòng; sửa số lượng và giá; tổng tiền cầu và TỔNG CHI
  cộng đúng nhiều dòng.
- `HistoryPage.test.tsx`: buổi nhiều loại hiện đủ các dòng; buổi cũ đã di trú vẫn
  hiện "Tiền cầu (…)".
- Cập nhật fixture `shuttleCount`/`shuttlePrice` → `shuttles` ở `frequent.test.ts`,
  `PlayerList.test.tsx` và các file test khác đang dùng.

## Giao hàng

- `README.md`: thêm bullet vào "Tính năng chính" (bắt buộc theo `CLAUDE.md`), cập
  nhật số test case trong Tech Stack.
- Commit prefix `feat:` → minor bump.
