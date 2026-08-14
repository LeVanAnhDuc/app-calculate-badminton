# Chi phí phát sinh khác — Thiết kế

**Ngày:** 2026-08-14
**Trạng thái:** Đã duyệt (user đã chốt cách chia), triển khai ngay

## Mục tiêu

Ngoài tiền sân và tiền cầu, một buổi chơi hay có các khoản lặt vặt: nước, thuê vợt,
quấn cán, gửi xe… Những khoản này **không chia đều cho cả nhóm**.

> **Quyết định đã chốt — không thiết kế lại:** mỗi khoản phát sinh được gán cho
> **đúng một người chơi**, và người đó chịu **toàn bộ** số tiền của khoản đó.
> Ví dụ: Hùng thuê vợt 20.000đ → 20.000đ cộng thẳng vào phần của Hùng, những
> người khác không bị ảnh hưởng đồng nào.

Một người có thể có nhiều khoản (nước 15.000đ + thuê vợt 20.000đ = 35.000đ phát sinh).

## 1. Dữ liệu & di trú (QUAN TRỌNG)

### Kiểu mới trong `src/lib/types.ts`

```ts
export interface ExtraCost {
  id: string          // uid() như Player.id
  label: string       // "Thuê vợt", "Nước" — có thể rỗng lúc vừa thêm
  amount: number      // VND, số nguyên ≥ 0
  playerId: string    // Player.id của người chịu TOÀN BỘ khoản này
}
```

`SessionInput` thêm đúng một trường:

```ts
export interface SessionInput {
  // … giữ nguyên mọi trường hiện có
  extras: ExtraCost[]           // mặc định [] — mảng phẳng, không nhóm sẵn theo người
}
```

`PlayerResult` thêm đúng một trường:

```ts
export interface PlayerResult {
  // … giữ nguyên mọi trường hiện có
  extrasTotal: number           // tổng các khoản phát sinh của riêng người này (raw, chưa làm tròn)
  raw: number                   // courtShare + shuttleShare + extrasTotal
}
```

Chọn **mảng phẳng có `playerId`** thay vì `extras` lồng trong `Player` vì: (a) reorder
người chơi bằng `Reorder.Group` chỉ thay thứ tự mảng `players`, không phải lo dữ liệu
đi kèm; (b) UI nhập nằm ở `CostForm` (xem mục 5) nên một danh sách phẳng khớp đúng
cách hiển thị; (c) guard/di trú chỉ đụng một chỗ.

### Di trú mềm — KHÔNG được là breaking change

Dữ liệu localStorage hiện có (`currentSession`, `history`) **không** có `extras` và
`extrasTotal`. Theo đúng pattern đã dùng cho `paid` trong `storage.ts`:

```ts
const isExtraCost = (v: unknown): boolean =>
  isObject(v) &&
  typeof v.id === 'string' &&
  typeof v.label === 'string' &&
  typeof v.amount === 'number' &&
  typeof v.playerId === 'string'

const isSession = (v: unknown): boolean =>
  isObject(v) &&
  // … các điều kiện hiện có, giữ nguyên
  // migration: dữ liệu cũ không có trường `extras` — chấp nhận mảng hợp lệ hoặc undefined,
  // normalizeSession() sẽ điền extras: [] khi load. Không được để guard này bác dữ liệu cũ.
  (v.extras === undefined || (Array.isArray(v.extras) && v.extras.every((e) => isExtraCost(e))))

const isPlayerResult = (v: unknown): boolean =>
  isObject(v) &&
  // … các điều kiện hiện có, giữ nguyên
  // migration: kết quả đã lưu trước tính năng này không có `extrasTotal` — chấp nhận
  // number hoặc undefined, normalizeResult() điền 0 khi load.
  (typeof v.extrasTotal === 'number' || v.extrasTotal === undefined)
```

Chuẩn hóa khi load, cùng chỗ với `normalizePlayer`:

```ts
/** Di trú mềm: buổi cũ không có `extras` → mảng rỗng. Không làm mất trường khác. */
function normalizeSession(s: SessionInput): SessionInput {
  return { ...s, players: s.players.map(normalizePlayer), extras: s.extras ?? [] }
}

/** Di trú mềm: kết quả cũ không có `extrasTotal` → 0. Số tiền đã lưu giữ nguyên. */
function normalizeResult(r: CalcResult): CalcResult {
  return { ...r, players: r.players.map((p) => ({ ...p, extrasTotal: p.extrasTotal ?? 0 })) }
}
```

`loadCurrentSession` đã gọi `normalizeSession`. `loadHistory` phải map thêm
`result: normalizeResult(s.result)` bên cạnh `input: normalizeSession(s.input)`.

**Nói rõ:** dữ liệu cũ vẫn load được đầy đủ, không mất buổi nào, không mất số tiền nào →
đây **KHÔNG** phải breaking change. Commit dùng prefix `feat:` (minor bump), **không**
dùng `feat!:` và không có dòng `BREAKING CHANGE`.

### Khởi tạo & reset trong `App.tsx`

- `defaultSession()` trả thêm `extras: []`.
- `handleNewSession`: điều kiện `isEmpty` cộng thêm `previous.extras.length === 0`
  (buổi chỉ có khoản phát sinh vẫn đáng để offer "Hoàn tác").
- `onReuse` (Dùng lại danh sách này cho buổi mới): sinh `id` mới cho từng người nên
  mọi `playerId` cũ đều vô nghĩa → buổi mới bắt đầu với `extras: []`. Không cố map lại.

## 2. Xóa người chơi + Hoàn tác (tương tác với `src/lib/undo.ts`)

Khoản phát sinh trỏ tới người bị xóa **không được phép mồ côi** — nếu để lại, nó vẫn
được cộng vào `totalCost` mà không ai gánh, làm `surplus` âm một cách bí ẩn.

`handleRemovePlayer` trong `App.tsx` (đang chỉ lọc `players`) đổi thành: xóa người **và**
mọi khoản của người đó, undo trả lại **cả hai**.

```ts
const handleRemovePlayer = (playerId: string) => {
  const index = session.players.findIndex((p) => p.id === playerId)
  if (index === -1) return
  const removed = session.players[index]
  const removedExtras = session.extras.filter((e) => e.playerId === playerId)
  setSession((s) => ({
    ...s,
    players: s.players.filter((p) => p.id !== playerId),
    extras: s.extras.filter((e) => e.playerId !== playerId),
  }))
  toastUndo(`Đã xóa "${removed.name}"`, () =>
    setSession((s) => ({
      ...s,
      players: insertAt(s.players, index, removed),
      extras: [...s.extras, ...removedExtras],
    })),
  )
}
```

Ghi chú thiết kế:

- Vẫn theo đúng nguyên tắc sẵn có của `undo.ts`: callback dùng functional updater, chỉ
  trả lại đúng phần đã bị lấy đi, **không** khôi phục snapshot cũ của cả buổi. Nếu trong
  lúc toast còn trên màn hình người dùng có sửa tiền sân hay thêm khoản khác thì những
  thay đổi đó vẫn còn.
- Người chơi được `insertAt` về đúng vị trí cũ (thứ tự hiển thị có ý nghĩa); khoản phát
  sinh chỉ cần nối vào cuối mảng vì **thứ tự toàn cục của `extras` không bao giờ hiển thị
  cho người dùng** — UI luôn nhóm/hiện theo chủ sở hữu. Thứ tự tương đối giữa các khoản
  của cùng một người vẫn được giữ (filter giữ thứ tự).
- Đổi tên / đổi giới tính / kéo thả sắp xếp: không đụng gì, vì `extras` khóa theo `id`
  chứ không theo tên hay chỉ số.
- Toast không đổi nội dung (`Đã xóa "{tên}"`) — không nhắc số khoản kèm theo, giữ ngắn.

## 3. `calc.ts` — cộng phát sinh TRƯỚC khi làm tròn

Hai helper thuần mới, export để UI dùng lại:

```ts
/** Tổng các khoản phát sinh của 1 người (bỏ qua khoản mồ côi vì playerId không khớp ai). */
export function extrasOf(input: SessionInput, playerId: string): number

/** Tổng mọi khoản phát sinh CÓ CHỦ trong buổi. */
export function extrasTotal(input: SessionInput): number
```

Cả hai bỏ qua khoản có `playerId` không tồn tại trong `input.players` (lưới an toàn —
bình thường mục 2 đã dọn sạch; `validateSession` cũng báo lỗi, xem mục 4). Nhờ vậy một
khoản mồ côi **không bao giờ** âm thầm làm phồng `totalCost`.

Thay đổi nằm **duy nhất trong `buildResult`** — hàm dùng chung của cả hai chế độ:

```ts
function buildResult(input: SessionInput, shares: Share[], emptyHours: number): CalcResult {
  const totalCost = shuttleTotal(input) + input.courtFee + extrasTotal(input)
  const players = input.players.map((p, i) => {
    const extras = extrasOf(input, p.id)
    const raw = shares[i].courtShare + shares[i].shuttleShare + extras
    return { …, extrasTotal: extras, raw, amount: roundAmount(raw, input.rounding) }
  })
  …
}
```

Hệ quả, ghi rõ để khỏi hiểu nhầm:

- **`calcRatioMode` và `calcHourlyMode` không sửa một dòng nào.** Toàn bộ phép chia tiền
  sân / tiền cầu (parts theo hệ số, ½ buổi, giờ chơi, `emptyHours`, `unitPrice`,
  `playedFee`, gộp khoảng thời gian) **giữ nguyên tuyệt đối**. Khoản phát sinh **không**
  tham gia mẫu số nào, không ảnh hưởng `courtShare`, `shuttleShare`, `hours`, `emptyHours`.
- **Thứ tự phép tính:** `raw = courtShare + shuttleShare + extrasTotal`, rồi mới
  `roundAmount(raw, rounding)`. Cộng phát sinh **trước** khi làm tròn — không được làm
  tròn riêng rồi cộng, nếu không mỗi khoản sẽ tự sinh thêm một lần "tròn lên 1.000đ".
  Ví dụ chốt: `courtShare + shuttleShare = 50.200`, phát sinh `500`, `rounding: 'up1000'`
  → `raw = 50.700` → `amount = 51.000` (KHÔNG phải 51.000 + 1.000 = 52.000).
- **`totalCollected`**: công thức không đổi (tổng `amount` sau làm tròn), nhưng giá trị
  lớn lên vì `amount` đã gồm phát sinh.
- **`surplus = totalCollected − totalCost`**: cả hai vế đều tăng đúng bằng tổng phát sinh
  (`totalCost` cộng `extrasTotal(input)`, `totalCollected` cộng phần tương ứng trong từng
  `amount`), nên `surplus` vẫn chỉ phản ánh **tiền dư do làm tròn** — đúng ý nghĩa
  "để dành mua cầu" hiện tại. Buổi không có phát sinh cho kết quả y hệt trước tính năng này.

## 4. `validateSession` — điều gì làm một khoản không hợp lệ

Thêm vào cuối, trước `return errors` (chạy ở cả hai chế độ):

| Tình huống | Có chặn? | Chuỗi lỗi |
|---|---|---|
| `label` rỗng / chỉ khoảng trắng | **Không** | — |
| `amount` âm hoặc không phải số hữu hạn | Có | `Số tiền của "{label}" chưa hợp lệ` |
| `playerId` không khớp người nào trong buổi | Có | `Khoản phát sinh "{label}" chưa chọn người trả` |
| `amount === 0` | Không | — |

- **Nhãn rỗng cố tình KHÔNG phải lỗi.** Hàng được tạo rỗng rồi gõ dần (mọi ô trong app
  đều sửa trực tiếp, không có nút "Lưu"); nếu nhãn rỗng là lỗi thì vừa bấm "+ Thêm khoản"
  là panel Kết quả biến mất — trải nghiệm tệ. Khoản chưa đặt tên hiển thị bằng nhãn thay
  thế **"Khoản khác"** ở kết quả, ảnh PNG và lịch sử.
- `amount === 0` hợp lệ (khoản vừa thêm chưa gõ số), cộng 0 vào phần của người đó.
- Trong chuỗi lỗi, `{label}` là `label.trim()`; nếu rỗng thì dùng `Khoản khác`.
- `playerId` mồ côi về lý thuyết không xảy ra (mục 2 đã dọn) — lỗi này là lưới an toàn
  cho dữ liệu localStorage bị sửa tay hoặc lỗi lập trình sau này.
- Sửa luôn điều kiện tổng chi hiện có để buổi chỉ có khoản phát sinh không bị chặn oan:
  `if (shuttleTotal(input) + input.courtFee + extrasTotal(input) <= 0)` → vẫn giữ nguyên
  chuỗi `Tổng chi phải lớn hơn 0`.

## 5. Nơi nhập liệu: `CostForm`, KHÔNG phải drawer của `PlayerList`

**Chốt: khối nhập nằm trong `CostForm.tsx`, mục "Chi phí".** Lý do (ngắn):

- Đây là **tiền**, không phải thuộc tính người chơi; nó phải đứng cạnh Tiền cầu / Tiền sân
  và ngay trên dòng **TỔNG CHI** mà nó làm thay đổi — nhìn một chỗ là thấy đủ mọi khoản chi.
- Nhập trong drawer từng người thì để cộng đủ tiền nước cho 4 người phải mở/đóng 4 drawer,
  và không ở đâu thấy được danh sách tổng thể.
- Ô chọn người trả nằm ngay trên hàng, nên vẫn gán được chủ sở hữu chỉ với 1 chạm.

Drawer "Sửa người chơi" trong `PlayerList.tsx` **giữ nguyên**, không thêm gì — một điểm
nhập duy nhất, không có hai chỗ sửa cùng một dữ liệu.

### Bố cục khối (đặt sau "Tiền sân" / "Giờ thuê sân", trước dòng TỔNG CHI)

```
Chi phí phát sinh khác
┌────────────────────────────────────────────┐
│ [Tên khoản…      ] [ 20.000 ] [ Hùng ▾ ] × │
│ [Nước            ] [ 15.000 ] [ Lan  ▾ ] × │
└────────────────────────────────────────────┘
        [ + Thêm khoản ]
Phát sinh                             35.000đ
────────────────────────────────────────────
TỔNG CHI                             335.000đ
```

- Tiêu đề phụ: `<h3>` chữ nhỏ `text-xs text-gray-500`, nội dung
  **"Chi phí phát sinh khác"**, kèm dòng gợi ý `text-xs text-gray-400`:
  *"Chỉ người được chọn trả khoản này"*.
- Mỗi hàng (`flex gap-2`, cao `h-11`):
  - input nhãn: `flex-1 min-w-0`, `placeholder="Tên khoản (nước, thuê vợt…)"`,
    `aria-label="Tên khoản phát sinh"`.
  - `MoneyInput` số tiền: `w-28`, `aria-label={'Số tiền của ' + (label || 'khoản khác')}`.
  - `<select>` người trả: `w-28`, option = từng `input.players` (hiển thị `name`),
    `aria-label="Người trả khoản này"`. Dùng `<select>` gốc để mobile mở picker hệ điều
    hành, không tự chế dropdown.
  - nút `×` xóa: `w-9 h-9 text-gray-400`, `aria-label={'Xóa khoản ' + (label || 'khác')}`.
    Xóa khoản **không** có undo (một hàng gõ lại trong 2 giây; undo dành cho xóa người và
    xóa buổi).
- Nút **"+ Thêm khoản"**: viền đứt emerald như "+ Thêm người chơi"
  (`border-2 border-dashed border-emerald-300 text-emerald-600`), full width, `h-11`.
  Bấm → append ngay `{ id: uid(), label: '', amount: 0, playerId: input.players[0].id }`
  và focus vào ô nhãn.
- Khi `input.players.length === 0`: nút bị `disabled`, dưới nút hiện
  `text-xs text-gray-400`: *"Thêm người chơi trước để gán khoản phát sinh"*.
- Mọi thay đổi đi qua `onPatch({ extras: … })` như mọi ô khác → tự persist `currentSession`.
- Hàm sinh `id`: `CostForm` không có `uid()`; export/dùng lại helper `uid` (chuyển
  `const uid` trong `App.tsx` sang một module dùng chung hoặc truyền xuống — chọn cách
  gọn, miễn không nhân bản logic `crypto.randomUUID`).

### Dòng TỔNG CHI

- Thêm dòng tóm tắt **"Phát sinh"** (cùng style dòng "Tiền cầu" sẵn có), **chỉ hiện khi
  `input.extras.length > 0`**, giá trị `formatVND(extrasTotal(input))`.
- **TỔNG CHI** đổi thành `formatVND(shuttleTotal(input) + input.courtFee + extrasTotal(input))`.
  Đây là con số duy nhất phải khớp với `result.totalCost`.

## 6. Hiển thị kết quả

### `ResultPanel` (và overlay toàn màn hình)

`PlayerRow` là component dùng chung cho cả panel thường lẫn fullscreen → sửa một chỗ, cả
hai chỗ có. Khi `p.extrasTotal > 0`, thêm một dòng phụ dưới tên (sau dòng
`sân … + cầu …` của chế độ hourly nếu có), **hiện ở cả hai chế độ**:

```tsx
{p.extrasTotal > 0 && (
  <span className="text-xs text-amber-600 block">+ phát sinh {formatNumber(p.extrasTotal)}</span>
)}
```

Số tiền lớn bên phải (`p.amount`) **đã bao gồm** phát sinh — dòng phụ chỉ để giải thích
vì sao người này nhiều hơn người khác. Không liệt kê từng khoản trong hàng kết quả (giữ
hàng thấp, dễ đọc trên mobile); danh sách chi tiết đã có ở `CostForm` và trang Lịch sử.

Các dòng "Tổng thu" / "Số dư" và dòng tổng kết `Đã thu x/n · còn thiếu …` không đổi
công thức — chúng đọc từ `result.totalCollected` / `unpaidAmount` vốn đã gồm phát sinh.

### `exportImage.ts` — chiều cao hàng cố định, KHÔNG đổi

`ROW_HEIGHT = 64` với 2 dòng chữ (tên ở `y + 28`, ghi chú ở `y + 48`). Thêm dòng thứ ba
sẽ tràn. **Quyết định: không đổi `ROW_HEIGHT`, không đổi công thức `height`, không thêm
hằng số nào.** Thay vào đó nối phát sinh vào chính chuỗi ghi chú:

```ts
function playerNote(mode, p): string {
  // … logic hiện tại sinh base = "Nam", "Nữ · ½ buổi", "Nam · 1h30"
  return p.extrasTotal > 0 ? `${base} · + ${formatVND(p.extrasTotal)} phát sinh` : base
}
```

Kết quả: `Nam · 1h30 · + 20.000đ phát sinh`, vẽ ở font 14px GRAY_500 như cũ. Ảnh vẫn
**không** in tổng chi / tổng thu / số dư — chỉ số tiền từng người, đúng như hiện nay.

## 7. Trang Lịch sử (`HistoryPage.tsx`)

Buổi đã lưu giữ nguyên `input.extras` và `result.players[].extrasTotal` — số tiền đã lưu
**không bao giờ được tính lại**, mọi thứ đọc từ `SavedSession`.

- Khối "Chi phí" của card mở rộng: sau dòng "Tiền sân", nếu `s.input.extras.length > 0`
  thì render từng khoản một dòng (cùng style `flex justify-between text-sm`):
  nhãn trái `{label || 'Khoản khác'} · {tên người chịu}` (`text-gray-500`), giá trị phải
  `formatVND(amount)`. Tên người tra từ `s.input.players` theo `playerId`; không tìm thấy
  → `?` (buổi cũ bị sửa tay).
- Khối "Mỗi người trả": hàng nào có `p.extrasTotal > 0` thì thêm `· +{formatVND(...)} phát sinh`
  vào cụm chú thích xám trong ngoặc, cùng chỗ với `½ buổi` / số giờ.
- Card thu gọn: số tiền lớn đang là `s.result.totalCost` — đã gồm phát sinh vì được lưu
  từ `calcSession`. Không sửa gì.
- Buổi lưu trước tính năng này: `extras` → `[]`, `extrasTotal` → `0` sau chuẩn hóa
  (mục 1) → không có dòng nào thừa, hiển thị y hệt hôm nay.
- `onReuse`: đã nói ở mục 1 — buổi mới `extras: []`.

## 8. Giới hạn đã biết (đánh đổi có chủ ý)

**Không có khoản chi dùng chung.** Một thùng nước 100.000đ cả nhóm cùng uống **không**
nhập được thành một khoản chia đều — người dùng phải tự tạo một khoản cho mỗi người
(ví dụ 8 khoản 12.500đ). Đây là **lựa chọn rõ ràng của người dùng**: mô hình
"một khoản = một người chịu" dễ hiểu, dễ tranh luận đúng-sai tại sân, và không đẻ thêm
một tầng chia tỉ lệ thứ hai bên cạnh tiền sân/tiền cầu.

Nếu sau này cần: thêm giá trị đặc biệt cho `playerId` (ví dụ `playerId: string | 'all'`,
hoặc trường `scope: 'player' | 'group'`), khoản "cả nhóm" chia theo cùng hệ số nam/nữ như
tiền cầu, và thêm một option **"Cả nhóm"** đứng đầu `<select>` người trả. Guard
`isExtraCost` hiện tại chấp nhận mọi chuỗi `playerId` nên mở rộng này cũng sẽ là di trú
mềm, không phá dữ liệu cũ. **Chưa làm trong phạm vi này.**

## 9. Kiểm thử (vitest, theo pattern sẵn có)

`src/lib/calc.test.ts`

1. **Ratio — cộng đúng người:** 2 người, `courtFee` 100.000, cầu 0, `rounding: 'exact'`,
   Hùng có khoản 20.000 → Hùng `amount` 70.000, người kia 50.000, `totalCost` 120.000,
   `surplus` 0.
2. **Cộng trước khi làm tròn:** `rounding: 'up1000'`, phần sân+cầu của A = 50.200, khoản
   phát sinh 500 → `amount` = 51.000 (khẳng định KHÔNG ra 52.000).
3. **Nhiều khoản cùng một người:** 15.000 + 20.000 → `extrasTotal` = 35.000, `raw` cộng
   đúng 35.000.
4. **Hourly không bị ảnh hưởng:** cùng input có/không có extras → `courtShare`,
   `shuttleShare`, `hours`, `emptyHours` **giống hệt nhau**; chỉ `extrasTotal`, `raw`,
   `amount`, `totalCost`, `totalCollected` đổi.
5. **`totalCost` gồm extras** và `surplus === totalCollected − totalCost` vẫn đúng ở cả
   hai chế độ.
6. **Khoản mồ côi:** `extras` có `playerId` không tồn tại → không cộng vào `totalCost`,
   không cộng vào `raw` của ai.
7. **Hồi quy:** `extras: []` → kết quả trùng khớp kỳ vọng cũ (giữ nguyên các test hiện có,
   chỉ thêm `extras: []` vào fixture).

`validateSession`

8. `amount` âm → `Số tiền của "Nước" chưa hợp lệ`.
9. `playerId` lạ → `Khoản phát sinh "Nước" chưa chọn người trả`.
10. `label` rỗng, amount 0 → **không** sinh lỗi nào.
11. Buổi `courtFee: 0`, cầu 0, chỉ có 1 khoản 20.000 → **không** còn lỗi
    `Tổng chi phải lớn hơn 0`.

`src/lib/storage.test.ts`

12. **Di trú:** seed `currentSession` KHÔNG có `extras` → `loadCurrentSession()` trả
    session đầy đủ với `extras: []`, không mất người chơi nào.
13. **Di trú:** seed `history` có `result.players` KHÔNG có `extrasTotal` → `loadHistory()`
    trả về buổi đó với `extrasTotal: 0`, `amount` đã lưu giữ nguyên.
14. Round-trip: save session có 2 khoản → load lại đúng `id`/`label`/`amount`/`playerId`.
15. Guard từ chối dữ liệu hỏng: `extras: [{ amount: 'nhiều' }]` → `loadCurrentSession()`
    trả `null` (fallback), không throw.

Component / tích hợp

16. `CostForm`: bấm "+ Thêm khoản" → hiện hàng mới; gõ 20.000 → dòng "Phát sinh" và
    "TỔNG CHI" tăng đúng 20.000; đổi `<select>` người trả → `onPatch` nhận `playerId` mới;
    bấm `×` → hàng biến mất và TỔNG CHI trở lại như cũ. Không có người chơi → nút
    "+ Thêm khoản" `disabled`.
17. `ResultPanel`: người có phát sinh hiện `+ phát sinh 20.000`; người không có thì không
    có dòng đó; overlay toàn màn hình hiện y hệt.
18. **Xóa người + Hoàn tác (App):** người có 2 khoản → xóa → `totalCost` giảm đúng tổng 2
    khoản và `extras` không còn khoản mồ côi; bấm "Hoàn tác" → người quay lại đúng vị trí,
    2 khoản quay lại, `totalCost` bằng giá trị ban đầu.
19. `HistoryPage`: buổi lưu có extras → khối "Chi phí" liệt kê đúng nhãn + tên người chịu;
    buổi cũ không có extras → không xuất hiện dòng nào thêm.
20. `exportImage`: có extras → **chiều cao canvas không đổi** so với cùng số người không có
    extras (khẳng định `ROW_HEIGHT` cố định), không crash.

## Ngoài phạm vi (YAGNI)

- Khoản chi dùng chung / chia đều (xem mục 8).
- Gán một khoản cho nhiều người cùng lúc.
- Danh mục khoản gợi ý sẵn (nước, thuê vợt…) hay ghi nhớ khoản hay dùng như danh bạ.
- Khoản phát sinh âm (giảm giá, ai đó ứng trước).
- Sắp xếp / kéo thả danh sách khoản phát sinh.

## Ghi chú release

- Commit `feat:` → minor bump. **Không** breaking change: dữ liệu localStorage cũ load
  bình thường nhờ di trú mềm ở mục 1.
- Bắt buộc thêm một gạch đầu dòng tiếng Việt vào mục "Tính năng chính" của `README.md`
  trong cùng nhánh, ví dụ: *"Chi phí phát sinh khác (nước, thuê vợt…) — gán cho đúng người,
  người đó chịu toàn bộ"*; tiện tay cập nhật số lượng test trong Tech Stack.
