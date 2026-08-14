# Khoản phát sinh dùng chung + hiển thị chi tiết — Thiết kế

**Ngày:** 2026-08-14
**Trạng thái:** Đã duyệt (user đã chốt toàn bộ quyết định), triển khai ngay
**Mở rộng từ:** [`2026-08-14-extra-costs-design.md`](./2026-08-14-extra-costs-design.md) (đã ship ở v1.4.0)

## Mục tiêu

v1.4.0 cho phép nhập khoản phát sinh (nước, thuê vợt…) và gán cho **đúng một người**.
Ba phản hồi từ người dùng dẫn tới đợt này:

1. *"Thùng nước 100k cả nhóm cùng uống"* — mục 8 của spec cũ đã ghi nhận đây là giới hạn
   có chủ ý; giờ gỡ bỏ.
2. *"Xóa người thì khoản mất luôn, mà thùng nước vẫn tốn 100k chứ có rẻ đi đâu"*.
3. *"Kết quả chỉ ghi `+ phát sinh 35.000`, không rõ là phát sinh gì"*.

> **Các quyết định dưới đây đã được user chốt — KHÔNG thiết kế lại, chỉ triển khai:**
>
> 1. Một khoản phát sinh do **một TẬP người chơi** cùng chịu, chia **đều theo đầu người**.
>    Một người = tập một phần tử (đúng hành vi hôm nay); cả nhóm = tập đầy đủ;
>    một nhóm nhỏ = *"nước mà chỉ 5/8 người uống"*. **Không** có trường `scope`, **không**
>    có giá trị đặc biệt `'all'` — chính cái tập đó là mô hình dữ liệu.
> 2. Xóa người chơi **giữ nguyên tổng tiền của khoản**: những người còn lại gánh thêm phần
>    của người vừa bị xóa, `TỔNG CHI` không đổi.
> 3. Kết quả liệt kê **từng khoản một dòng** dưới tên người chơi.
> 4. Ảnh PNG đổi sang **chiều cao hàng biến thiên** theo số khoản.
> 5. Hàng nhập trong `CostForm` tách làm **hai dòng**, ô chọn người trả thành bottom sheet
>    đa chọn mới (`PayerSelect`).

## 1. Dữ liệu & di trú (QUAN TRỌNG)

### Kiểu trong `src/lib/types.ts`

```ts
export interface ExtraCost {
  id: string
  label: string                 // "Thuê vợt", "Nước" — có thể rỗng lúc vừa thêm
  amount: number                // VND, số nguyên ≥ 0 — TỔNG của khoản, không phải phần mỗi người
  playerIds: string[]           // tập người cùng chịu; chia ĐỀU theo đầu người
}

/** Một khoản phát sinh đã chia, tính sẵn cho MỘT người — chỉ dùng để hiển thị. */
export interface ExtraShare {
  label: string                 // đã chuẩn hóa: nhãn rỗng → "Khoản khác"
  share: number                 // phần của riêng người này = amount / số người chịu (raw)
  sharedCount: number           // số người cùng chịu; > 1 → UI in "(chung, N người)"
}

export interface PlayerResult {
  // … giữ nguyên mọi trường hiện có
  extras: ExtraShare[]          // từng khoản của riêng người này, đã chia sẵn
  extrasTotal: number           // GIỮ LẠI — = tổng extras[].share (xem "vì sao giữ" bên dưới)
  raw: number                   // courtShare + shuttleShare + extrasTotal
}
```

`SessionInput` **không đổi** (`extras: ExtraCost[]` như cũ, chỉ đổi hình dạng phần tử).

**Vì sao `playerIds: string[]` chứ không phải `playerId: string | 'all'` hay thêm `scope`:**
`'all'` là sentinel phải diễn giải lại ở 6 chỗ (calc, validate, xóa người, CostForm,
ResultPanel, HistoryPage) và vẫn không diễn tả nổi trường hợp "5/8 người". Một mảng id
diễn tả cả ba trường hợp bằng cùng một phép toán, và phép "xóa người chơi" chỉ còn là
`playerIds.filter(...)` — không có nhánh đặc biệt nào.

**Vì sao GIỮ `extrasTotal` dù đã có `extras`:** buổi lưu bởi v1.4.0 có `extrasTotal` mà
**không** có `extras`, và số tiền đã lưu **không bao giờ được tính lại**. Giữ lại trường
này là điều kiện cần để trang Lịch sử render buổi cũ y hệt hôm nay (xem mục 7).
`extrasTotal` cũng là thứ `raw` cộng vào, nên giữ nó tránh phải reduce lại ở mọi chỗ đọc.

### Di trú mềm — KHÔNG được là breaking change

Dữ liệu v1.4.0 **đang nằm trong localStorage của người dùng** với `playerId: string`.
Theo đúng pattern đã dùng cho `paid` và `extras` trong `storage.ts`:

```ts
const isExtraCost = (v: unknown): boolean =>
  isObject(v) &&
  typeof v.id === 'string' &&
  typeof v.label === 'string' &&
  typeof v.amount === 'number' &&
  // migration v1.4.0 → v1.5.0: dữ liệu cũ có `playerId: string`, dữ liệu mới có
  // `playerIds: string[]`. Chấp nhận CẢ HAI; normalizeExtra() gộp về playerIds khi load.
  // Không được để guard này bác dữ liệu cũ.
  ((Array.isArray(v.playerIds) && v.playerIds.every((id) => typeof id === 'string')) ||
    typeof v.playerId === 'string')

const isExtraShare = (v: unknown): boolean =>
  isObject(v) &&
  typeof v.label === 'string' &&
  typeof v.share === 'number' &&
  typeof v.sharedCount === 'number'

const isPlayerResult = (v: unknown): boolean =>
  isObject(v) &&
  // … các điều kiện hiện có, giữ nguyên (kể cả `extrasTotal` number-hoặc-undefined)
  // migration: kết quả lưu bởi v1.4.0 không có `extras` — chấp nhận mảng hợp lệ hoặc
  // undefined, normalizeResult() điền [] khi load.
  (v.extras === undefined || (Array.isArray(v.extras) && v.extras.every((e) => isExtraShare(e))))
```

Chuẩn hóa khi load, cùng chỗ với `normalizePlayer` / `normalizeSession`:

```ts
/** Hình dạng đọc từ localStorage: v1.4.0 có `playerId`, từ v1.5.0 có `playerIds`. */
type StoredExtraCost = Omit<ExtraCost, 'playerIds'> & {
  playerId?: string
  playerIds?: string[]
}

/** Di trú mềm: {playerId: 'x'} → {playerIds: ['x']}. Destructure bỏ hẳn khóa cũ để
 *  lần save kế tiếp không ghi lại `playerId` mồ côi vào localStorage. */
function normalizeExtra(e: StoredExtraCost): ExtraCost {
  const { playerId, playerIds, ...rest } = e
  return { ...rest, playerIds: playerIds ?? (playerId ? [playerId] : []) }
}

function normalizeSession(s: SessionInput): SessionInput {
  return {
    ...s,
    players: s.players.map(normalizePlayer),
    extras: (s.extras ?? []).map((e) => normalizeExtra(e as StoredExtraCost)),
  }
}

/** Di trú mềm: kết quả cũ không có `extrasTotal`/`extras` → 0 và []. Số tiền đã lưu
 *  giữ nguyên tuyệt đối — không tính lại bao giờ. */
function normalizeResult(r: CalcResult): CalcResult {
  return {
    ...r,
    players: r.players.map((p) => ({ ...p, extrasTotal: p.extrasTotal ?? 0, extras: p.extras ?? [] })),
  }
}
```

`loadCurrentSession` và `loadHistory` đã gọi cả `normalizeSession` lẫn `normalizeResult` —
**không cần sửa hai hàm này**, chỉ sửa phần thân của normalize/guard.

**Nói rõ:** buổi lưu bởi v1.4.0 vẫn load đủ, không mất người, không mất khoản, không mất
đồng nào; một khoản một-người cũ trở thành tập một phần tử nên `share === amount` và kết
quả hiển thị **không đổi một chữ**. → đây **KHÔNG** phải breaking change. Commit dùng
prefix **`feat:`** (minor bump), **không** `feat!:`, **không** có dòng `BREAKING CHANGE`.

### Khởi tạo & reset trong `App.tsx`

Không đổi: `defaultSession()` vẫn `extras: []`; `handleNewSession` vẫn tính `isEmpty` kèm
`previous.extras.length === 0`; `onReuse` vẫn bắt đầu buổi mới với `extras: []` (mọi
`id` người chơi đều được sinh mới nên mọi `playerIds` cũ đều vô nghĩa).

## 2. `calc.ts` — chia đều theo đầu người, cộng TRƯỚC khi làm tròn

### Người chịu thật sự (`bearers`)

```ts
/** Những id trong playerIds thật sự còn là người chơi trong buổi, đã khử trùng lặp.
 *  Trong mọi trạng thái UI có thể tạo ra, đây chính là `item.playerIds`. */
function bearersOf(item: ExtraCost, ids: Set<string>): string[] {
  return [...new Set(item.playerIds)].filter((id) => ids.has(id))
}
```

Mẫu số của phép chia là **`bearers.length`**, tức đúng `playerIds.length` như đã chốt —
hai con số này bằng nhau ở **mọi** trạng thái mà app tự sinh ra được (mục 3 dọn sạch id
khi xóa người, `PayerSelect` không tạo được id trùng). Lọc thêm một lần chỉ là **lưới an
toàn** cho localStorage bị sửa tay: nhờ nó, tổng phần chia của mọi người **luôn** đúng
bằng `amount`, không có đồng nào bốc hơi khỏi `surplus`.

### Hai helper thuần, export để UI dùng lại

```ts
/** Từng khoản của 1 người, đã chia đều theo đầu người. Bỏ qua khoản người này không chịu
 *  và khoản không còn ai chịu. Nhãn đã chuẩn hóa sẵn để mọi nơi hiển thị khỏi tự xử lý. */
export function extraSharesOf(input: SessionInput, playerId: string): ExtraShare[] {
  const ids = new Set(input.players.map((p) => p.id))
  return input.extras.flatMap((e) => {
    const bearers = bearersOf(e, ids)
    if (!bearers.includes(playerId)) return []
    return [{
      label: e.label.trim() || 'Khoản khác',
      share: e.amount / bearers.length,
      sharedCount: bearers.length,
    }]
  })
}

/** Tổng các khoản phát sinh của 1 người (raw, chưa làm tròn). */
export function extrasOf(input: SessionInput, playerId: string): number {
  return extraSharesOf(input, playerId).reduce((s, x) => s + x.share, 0)
}

/** Tổng mọi khoản phát sinh CÒN NGƯỜI CHỊU trong buổi (tính TRỌN `amount`, không chia). */
export function extrasTotal(input: SessionInput): number {
  const ids = new Set(input.players.map((p) => p.id))
  return input.extras
    .filter((e) => bearersOf(e, ids).length > 0)
    .reduce((s, e) => s + e.amount, 0)
}
```

Bất biến bắt buộc, phải đúng tuyệt đối:
`Σ_người extrasOf(input, p.id) === extrasTotal(input)`.
Nó là lý do `surplus` vẫn chỉ phản ánh tiền dư do làm tròn.

**`ExtraShare.label` đã sẵn sàng để in.** Chuẩn hóa `'Khoản khác'` xảy ra **một lần** ở
đây, nên `ResultPanel`, `HistoryPage`, `exportImage`, `shareResult` chỉ việc in ra —
không nơi nào lặp lại `label.trim() || 'Khoản khác'` nữa (trừ `HistoryPage` khi đọc thẳng
`s.input.extras`, xem mục 7).

### `buildResult` — chỗ duy nhất trong `calc.ts` đổi logic

```ts
function buildResult(input: SessionInput, shares: Share[], emptyHours: number): CalcResult {
  const totalCost = shuttleTotal(input) + input.courtFee + extrasTotal(input)
  const players: PlayerResult[] = input.players.map((p, i) => {
    const extras = extraSharesOf(input, p.id)
    const extrasSum = extras.reduce((s, x) => s + x.share, 0)
    // extras are added BEFORE rounding — rounding each part separately would
    // charge an extra "round up to 1.000đ" per extra cost
    const raw = shares[i].courtShare + shares[i].shuttleShare + extrasSum
    return { …, extras, extrasTotal: extrasSum, raw, amount: roundAmount(raw, input.rounding) }
  })
  …
}
```

Ghi rõ để khỏi hiểu nhầm:

- **`calcRatioMode` và `calcHourlyMode` không sửa một dòng nào.** Toàn bộ phép chia tiền
  sân / tiền cầu (parts theo hệ số, ½ buổi, giờ chơi, `emptyHours`, `unitPrice`,
  `playedFee`, gộp khoảng thời gian) giữ nguyên tuyệt đối. Khoản phát sinh **không** tham
  gia mẫu số nào và **không** chia theo hệ số nam/nữ — luôn là **chia đều theo đầu người**.
- **Thứ tự phép tính không đổi:** cộng phát sinh vào `raw` **rồi mới** `roundAmount`.
  Phần lẻ do chia đều (100.000 / 3 = 33.333,33…) **tan vào đúng bước làm tròn sẵn có**,
  không cần thêm bất kỳ logic "chia phần dư cho người đầu tiên" nào.
- `totalCollected`, `surplus`: công thức không đổi.

### Ví dụ chốt (phải khớp từng đồng)

3 người nam, `courtFee` 300.000, cầu 0, `maleRatio` 1.5, `rounding: 'up1000'`,
một khoản **Nước 100.000 do cả 3 cùng chịu** (`playerIds` = cả ba id):

| | courtShare | extras (share) | raw | amount |
|---|---|---|---|---|
| An | 100.000 | 33.333,33… | 133.333,33… | **134.000** |
| Bình | 100.000 | 33.333,33… | 133.333,33… | **134.000** |
| Cường | 100.000 | 33.333,33… | 133.333,33… | **134.000** |

`totalCost` = 300.000 + 100.000 = **400.000** · `totalCollected` = **402.000** ·
`surplus` = **+2.000** (đúng nghĩa "tiền dư do làm tròn").

Cùng input với `rounding: 'exact'`: mỗi người `Math.round(133333,33…)` = 133.333,
`totalCollected` = 399.999, `surplus` = **−1**. Đây **không phải lỗi**: chế độ "giữ chính
xác" vốn đã có thể làm tròn xuống và tạo số dư âm vài đồng từ trước tính năng này;
`SurplusRow` đã có sẵn nhánh hiển thị số âm màu đỏ.

Ví dụ hồi quy (giữ từ spec cũ, vẫn phải đúng): sân+cầu của A = 50.200, một khoản 500 của
riêng A (`playerIds: ['A']`), `up1000` → `raw` = 50.700 → `amount` = **51.000**
(KHÔNG phải 52.000).

## 3. Xóa người chơi — giữ tổng, chia lại cho người còn lại

> **Quyết định của user:** thùng nước vẫn tốn 100.000đ dù Cường có nghỉ. Người còn lại
> gánh phần của Cường; **`TỔNG CHI` không đổi**.

Quy tắc:

1. Xóa `playerId` khỏi **mọi** `playerIds`.
2. Khoản nào có `playerIds` trở thành **rỗng** thì **xóa hẳn khoản đó** — không bao giờ
   để lại khoản mồ côi, vì nó vẫn cộng vào `totalCost` mà không ai gánh.
3. `amount` của khoản còn người chịu **không đổi** → mẫu số giảm → phần mỗi người tăng.

Ví dụ: Nước 100.000 do An/Bình/Cường chịu, xóa Cường → `playerIds` còn 2 người,
mỗi người 50.000, `totalCost` **y nguyên**. Nếu Cường là người duy nhất chịu khoản
"Thuê vợt 20.000" thì khoản đó biến mất và `totalCost` giảm đúng 20.000.

### `handleRemovePlayer` trong `App.tsx`

```ts
const handleRemovePlayer = (playerId: string) => {
  const index = session.players.findIndex((p) => p.id === playerId)
  if (index === -1) return
  const removed = session.players[index]

  // Chụp TRƯỚC khi cập nhật, từ session hiện tại: khoản bị xóa hẳn (kèm vị trí cũ) và
  // id của khoản chỉ bị cắt bớt một người chịu.
  const dropped: { index: number; item: ExtraCost }[] = []
  const trimmedIds: string[] = []
  session.extras.forEach((e, i) => {
    if (!e.playerIds.includes(playerId)) return
    if (e.playerIds.length === 1) dropped.push({ index: i, item: e })
    else trimmedIds.push(e.id)
  })

  setSession((s) => ({
    ...s,
    players: s.players.filter((p) => p.id !== playerId),
    extras: s.extras
      .map((e) =>
        e.playerIds.includes(playerId)
          ? { ...e, playerIds: e.playerIds.filter((id) => id !== playerId) }
          : e,
      )
      .filter((e) => e.playerIds.length > 0),
  }))

  toastUndo(`Đã xóa "${removed.name}"`, () =>
    setSession((s) => {
      // (a) trả id vào những khoản chỉ bị cắt bớt — khoản nào không còn tồn tại thì
      //     map bỏ qua một cách tự nhiên, KHÔNG hồi sinh nó
      let extras = s.extras.map((e) =>
        trimmedIds.includes(e.id) && !e.playerIds.includes(playerId)
          ? { ...e, playerIds: [...e.playerIds, playerId] }
          : e,
      )
      // (b) trả lại những khoản bị xóa hẳn, đúng vị trí cũ; duyệt tăng dần theo index
      //     (forEach ở trên đã cho thứ tự tăng dần) để các lần chèn không đá nhau
      for (const d of dropped) extras = insertAt(extras, d.index, d.item)
      // (c) trả lại người chơi đúng vị trí cũ
      return { ...s, players: insertAt(s.players, index, removed), extras }
    }),
  )
}
```

Hoàn tác phải khôi phục **đủ ba thứ**: (a) người chơi đúng vị trí, (b) các khoản bị xóa
hẳn, (c) id người chơi trong các khoản chỉ bị cắt bớt.

Ghi chú thiết kế:

- Giữ nguyên nguyên tắc sẵn có của `undo.ts`: callback dùng **functional updater**, chỉ
  trả lại đúng phần đã bị lấy đi, **không** khôi phục snapshot cũ của cả buổi. Sửa tiền
  sân hay thêm khoản khác trong lúc toast còn hiện vẫn được giữ.
- **Trường hợp biên bắt buộc xử lý:** khoản trong `trimmedIds` có thể **không còn tồn tại**
  lúc bấm Hoàn tác (người dùng tự bấm `×` xóa nó trong lúc toast còn trên màn hình).
  `s.extras.map(...)` chỉ chạm vào phần tử đang có, nên khoản đó **bị bỏ qua, không được
  hồi sinh**. Không thêm nhánh `if (!found) push(...)` nào.
- Điều kiện `!e.playerIds.includes(playerId)` trong (a) chống việc thêm trùng id nếu vì lý
  do nào đó id đã có sẵn.
- **Khoản bị xóa hẳn được trả về đúng chỉ số cũ** bằng `insertAt` (khác spec cũ vốn nối
  vào cuối): kể từ v1.4.0 `CostForm` render `input.extras` theo đúng thứ tự mảng, nên thứ
  tự này **có** hiển thị cho người dùng. `insertAt` đã tự kẹp chỉ số nên mảng ngắn đi
  cũng không lỗi.
- Thứ tự **bên trong** `playerIds` không bao giờ hiển thị: `PayerSelect` và mọi bản tóm
  tắt đều duyệt theo `input.players`, nên nối id vào cuối là đủ.
- Đổi tên / đổi giới tính / kéo thả sắp xếp: không đụng gì — `extras` khóa theo `id`.
- Toast giữ nguyên nội dung `Đã xóa "{tên}"`, không nhắc số khoản kèm theo.

## 4. `validateSession` — điều gì làm một khoản không hợp lệ

| Tình huống | Có chặn? | Chuỗi lỗi |
|---|---|---|
| `label` rỗng / chỉ khoảng trắng | **Không** | — |
| `amount` âm hoặc không phải số hữu hạn | Có | `Số tiền của "{label}" chưa hợp lệ` |
| `playerIds` **rỗng** | Có | `Khoản phát sinh "{label}" chưa chọn người trả` |
| `playerIds` không rỗng nhưng **không id nào** khớp người chơi nào | Có | `Khoản phát sinh "{label}" chưa chọn người trả` |
| `playerIds` khớp **một phần** (lẫn id lạ) | **Không** | — |
| `amount === 0` | Không | — |

```ts
const playerIds = new Set(input.players.map((p) => p.id))
for (const e of input.extras) {
  const label = e.label.trim() || 'Khoản khác'
  if (!Number.isFinite(e.amount) || e.amount < 0) {
    errors.push(`Số tiền của "${label}" chưa hợp lệ`)
  }
  if (!e.playerIds.some((id) => playerIds.has(id))) {
    errors.push(`Khoản phát sinh "${label}" chưa chọn người trả`)
  }
}
```

- **Nhãn rỗng cố tình KHÔNG phải lỗi** — giữ nguyên lý do từ spec cũ: hàng được tạo rỗng
  rồi gõ dần, app không có nút "Lưu"; nếu nhãn rỗng là lỗi thì vừa bấm "+ Thêm khoản" là
  panel Kết quả biến mất.
- **`playerIds` rỗng LÀ lỗi** — khác hẳn nhãn rỗng: một khoản không ai trả thì không có
  cách nào chia, và người dùng **tạo ra được** trạng thái này (bỏ chọn hết trong
  `PayerSelect`). Chuỗi lỗi tái sử dụng nguyên văn chuỗi cũ.
- **Id lạ lẫn trong danh sách hợp lệ thì bỏ qua, không báo lỗi.** Lý do: chặn cả buổi vì
  một id rác trong localStorage bị sửa tay là quá tay, trong khi `bearersOf` (mục 2) đã
  bảo đảm tiền vẫn chia đúng và đủ giữa những người thật. Chỉ khi **không còn ai** thì mới
  chặn, vì lúc đó `amount` thật sự không biết cộng vào đâu.
- Trong chuỗi lỗi, `{label}` là `label.trim()`; rỗng thì dùng `Khoản khác`.
- Điều kiện tổng chi giữ nguyên:
  `if (shuttleTotal(input) + input.courtFee + extrasTotal(input) <= 0)` →
  `Tổng chi phải lớn hơn 0`.

## 5. `CostForm` — hàng hai dòng + `PayerSelect`

### Vấn đề

Hàng hiện tại nhét 4 control vào một dòng (`flex gap-2 h-11`): nhãn `flex-1 min-w-0`,
tiền `w-28`, `<select>` `w-28`, nút `×` `w-9`. Trên viewport 390px (trừ padding trang và
padding section) ô nhãn còn **dưới 100px** — gõ "Quấn cán" đã tràn.

### Bố cục mới

```
Chi phí phát sinh khác
Chọn ai cùng chịu — chia đều theo đầu người
┌────────────────────────────────────────────┐
│ [ Nước                                   ] │
│ [ 100.000 ] [ Cả nhóm        ▾ ]        ×  │
├────────────────────────────────────────────┤
│ [ Thuê vợt                               ] │
│ [  20.000 ] [ Hùng           ▾ ]        ×  │
└────────────────────────────────────────────┘
        [ + Thêm khoản ]
Phát sinh                            120.000đ
────────────────────────────────────────────
TỔNG CHI                             420.000đ
```

- Dòng gợi ý dưới `<h3>` đổi từ *"Chỉ người được chọn trả khoản này"* thành
  **"Chọn ai cùng chịu — chia đều theo đầu người"** (`text-xs text-gray-400`).
  `<h3>` giữ nguyên *"Chi phí phát sinh khác"*.
- Mỗi `<li>`: bỏ `h-11`, dùng `rounded-xl bg-gray-50 p-2 space-y-2` — hai dòng đọc thành
  một khối thay vì trôi lẫn vào hàng kế tiếp.
  - **Dòng 1:** input nhãn `w-full h-11 rounded-xl border border-gray-300 px-3 text-sm`,
    `placeholder="Tên khoản (nước, thuê vợt…)"`, `aria-label="Tên khoản phát sinh"`,
    giữ nguyên `labelRefs` + `focusId` để focus hàng vừa thêm.
  - **Dòng 2:** `flex gap-2 h-11`
    - `MoneyInput` `w-32 h-11! text-base!`,
      `aria-label={'Số tiền của ' + (e.label || 'khoản khác')}` (giữ nguyên).
    - `<PayerSelect className="flex-1 min-w-0" …/>` — ô co giãn chiếm phần còn lại, vì
      chuỗi tóm tắt là thứ dài nhất.
    - nút `×` `w-9 h-9 shrink-0 self-center text-gray-400 text-xl`,
      `aria-label={'Xóa khoản ' + (e.label || 'khác')}` (giữ nguyên). Xóa khoản vẫn
      **không** có undo.
- Nút **"+ Thêm khoản"**, trạng thái `disabled` khi chưa có người chơi, và câu
  *"Thêm người chơi trước để gán khoản phát sinh"*: **giữ nguyên**.
- Dòng tóm tắt **"Phát sinh"** và dòng **TỔNG CHI**: **giữ nguyên công thức**
  (`extrasTotal(input)`), không đổi gì.

### Mặc định khi thêm khoản mới

```ts
const extra: ExtraCost = { id: uid(), label: '', amount: 0, playerIds: [input.players[0].id] }
```

**Chỉ người đầu tiên**, đúng hành vi v1.4.0. **Lý do bắt buộc ghi nhớ:** mặc định "Cả
nhóm" sẽ **âm thầm rải một khoản thuê vợt gõ vội lên đầu tất cả mọi người** — người dùng
bấm "+ Thêm khoản", gõ 20.000 rồi bỏ qua ô người trả là cả nhóm bị chia sai mà không có
tín hiệu nào. Mặc định một người thì sai lầm tệ nhất là "gán nhầm cho An", nhìn phát ra
ngay ở panel Kết quả.

### `src/components/PayerSelect.tsx` (component mới)

Mô phỏng sát `TimeSelect.tsx`: một nút trigger mở bottom sheet `vaul`.
**Không thêm dependency nào** — `vaul` đã có sẵn, và app cố tình tránh control gốc của hệ
điều hành (xem comment trong `TimeSelect`: *"Never falls back to the host OS's native…"*).
`<select multiple>` gốc trên mobile là hộp thoại xấu và khác nhau giữa iOS/Android, nên
không dùng.

```ts
interface Props {
  players: Player[]
  value: string[]                 // = extra.playerIds
  onChange: (playerIds: string[]) => void
  'aria-label': string
  className?: string
}
```

**Không có prop `nested`.** `PayerSelect` được mở từ trang chính, không nằm trong
`Drawer` nào (khác `TimeSelect` vốn còn được dùng trong sheet "Sửa người chơi" của
`PlayerList`), nên dùng thẳng `Drawer.Root`.

**Chuỗi tóm tắt trên trigger** — export để `HistoryPage` và test dùng lại:

```ts
export function payerSummary(players: Player[], value: string[], emptyLabel = 'Chọn người trả'): string {
  const chosen = players.filter((p) => value.includes(p.id))   // thứ tự = thứ tự players
  if (chosen.length === 0) return emptyLabel
  if (chosen.length === players.length) return 'Cả nhóm'
  if (chosen.length === 1) return chosen[0].name
  return `${chosen[0].name} +${chosen.length - 1}`
}
```

| `value` | Hiển thị |
|---|---|
| `[]` (hoặc toàn id lạ) | `Chọn người trả` (`text-gray-400`, báo hiệu đang lỗi) |
| 1 người | `An` |
| 2/8 người | `An +1` |
| 5/8 người | `An +4` |
| tất cả | `Cả nhóm` |

Trigger: `<button type="button">`, class `h-11 rounded-xl border border-gray-300 px-3
text-sm text-gray-900 text-left truncate` + `className` truyền vào, kèm mũi `▾`
(`text-gray-400`) căn phải. `aria-label` do `CostForm` truyền:
`` `Người trả khoản ${e.label || 'khác'}` `` — cùng khuôn với `Xóa khoản ${…}` sẵn có.

**Nội dung sheet** (khung `Drawer.Portal` / `Overlay z-[60]` / `Content z-[70]` /
thanh kéo `w-12 h-1.5` — sao chép nguyên xi từ `TimeSelect`):

- `Drawer.Title` = `aria-label` truyền vào (ví dụ *Người trả khoản Nước*), class như
  `TimeSelect`: `font-bold text-gray-900 mb-2 text-center`.
- `Drawer.Description className="sr-only"`:
  *"Chọn một hoặc nhiều người cùng chịu khoản này — số tiền chia đều theo đầu người"*.
- Hàng **"Cả nhóm"** đứng đầu, ngăn cách bằng `border-b border-gray-100 mb-2 pb-2`:
  - `<button type="button" role="checkbox" aria-checked={allSelected} aria-label="Cả nhóm">`
  - Bấm khi **chưa** chọn đủ → `onChange(players.map((p) => p.id))`.
    Bấm khi **đã** chọn đủ → `onChange([])`.
  - Chữ `font-semibold`, kèm đuôi `text-xs text-gray-400`: `{players.length} người`.
- Danh sách người chơi, đúng thứ tự `players`:
  - `<button type="button" role="checkbox" aria-checked={checked}
    aria-label={`${p.name} · ${p.gender === 'male' ? 'Nam' : 'Nữ'}`}>` — cùng khuôn
    `aria-label` với chip danh bạ trong `PlayerList`.
  - Nội dung: `<GenderBadge gender={p.gender} />` + tên + dấu `✓` bên phải khi được chọn
    (`text-emerald-600`); hàng được chọn nền `bg-emerald-50`, chưa chọn `bg-gray-50`;
    `w-full h-12 rounded-xl px-3 flex items-center gap-2`.
  - Bấm → bật/tắt id đó trong `value` (`checked ? value.filter(…) : [...value, p.id]`).
- Vùng danh sách: `max-h-[50vh] overflow-y-auto` và bọc trong `data-vaul-no-drag` —
  nếu không, cuộn danh sách 12 người sẽ kéo tụt cả sheet (đúng lý do `TimeSelect` bọc
  bánh xe chọn giờ).
- Nút đóng cuối sheet: **"Xong"**, `w-full h-12 mt-4 rounded-xl bg-emerald-600 text-white
  text-base font-bold`, chỉ `setOpen(false)`.

**Ngữ nghĩa commit: áp dụng ngay từng lần bấm, KHÔNG có cancel.** Khác `TimeSelect` (vốn
giữ nháp `pick` rồi commit ở nút "Xong"), vì: (a) mọi ô khác trong app đều sửa trực tiếp,
không có nút Lưu; (b) người dùng cần thấy panel Kết quả đổi theo từng lần tick để biết
mình chọn đúng nhóm chưa; (c) một wheel picker có trạng thái trung gian vô nghĩa
(nửa giờ đang cuộn), còn tick người thì không. Kéo xuống / chạm overlay / Esc vì thế
**giữ lại** các lựa chọn đã tick, chỉ đóng sheet.

**Bỏ chọn hết là hợp lệ trong sheet** — thoát ra sẽ thấy trigger ghi `Chọn người trả` và
panel Kết quả hiện lỗi `Khoản phát sinh "…" chưa chọn người trả` (mục 4). Không chặn thao
tác giữa chừng, vì bỏ hết rồi tick lại là cách nhanh nhất để đổi từ "cả nhóm" sang "hai
người".

## 6. Hiển thị kết quả — liệt kê từng khoản

### `ResultPanel` (và overlay toàn màn hình)

`PlayerRow` vẫn là component dùng chung của panel thường và fullscreen → **sửa một chỗ,
cả hai chỗ có**. Không thêm prop nào: mọi thứ cần thiết đã nằm trong `PlayerResult`.

```
An (Nam)                 85.000đ
   · Nước            15.000
   · Thuê vợt        20.000

Bình (Nam)              134.000đ
   · Nước (chung, 3 người)  33.333
```

Thay khối `{p.extrasTotal > 0 && …}` hiện tại bằng:

```tsx
{p.extras.length > 0 ? (
  p.extras.map((x, i) => (
    <span key={i} className="text-xs text-amber-600 block pl-3">
      · {x.label}
      {x.sharedCount > 1 ? ` (chung, ${x.sharedCount} người)` : ''} {formatNumber(x.share)}
    </span>
  ))
) : p.extrasTotal > 0 ? (
  // buổi lưu bởi v1.4.0: chỉ có tổng, không có chi tiết
  <span className="text-xs text-amber-600 block">+ phát sinh {formatNumber(p.extrasTotal)}</span>
) : null}
```

- **Quy tắc dự phòng (fallback) — áp dụng y hệt ở cả 4 nơi hiển thị:**
  `extras` có phần tử → liệt kê chi tiết; ngược lại `extrasTotal > 0` → in đúng một dòng
  `+ phát sinh N` như hôm nay; ngược lại → không in gì.
- Key dùng `i`: `ExtraShare` cố tình chỉ có 3 trường, và danh sách này là dữ liệu **dẫn
  xuất**, không bao giờ được sửa/sắp xếp lại tại chỗ → index là key ổn định.
- `formatNumber` (không có "đ") giữ đúng phong cách các dòng phụ sẵn có trong panel.
- Vị trí: dưới dòng `sân … + cầu …` của chế độ hourly, hiện ở **cả hai chế độ**.
- Số tiền lớn bên phải (`p.amount`) **đã bao gồm** phát sinh; các dòng phụ chỉ giải thích.
- Các dòng "Tổng thu" / "Số dư" và `Đã thu x/n · còn thiếu …`: **không đổi**.

### `exportImage.ts` — chiều cao hàng biến thiên

Hằng số:

```ts
const ROW_HEIGHT = 64          // giữ nguyên: đủ cho 2 dòng chữ (tên y+28, ghi chú y+48)
const EXTRA_LINE_HEIGHT = 20   // đúng bằng khoảng cách tên → ghi chú (48 − 28)
const EXTRA_INDENT = 12        // thụt vào so với tên, tương ứng pl-3 của web

function rowHeight(p: PlayerResult): number {
  return ROW_HEIGHT + p.extras.length * EXTRA_LINE_HEIGHT
}
```

Chiều cao canvas **suy ra từ tổng chiều cao từng hàng**, không còn `n * ROW_HEIGHT`:

```ts
const height =
  HEADER_HEIGHT + result.players.reduce((s, p) => s + rowHeight(p), 0) + FOOTER_HEIGHT
```

Vòng vẽ: `y` chạy tích lũy theo chiều cao **của chính hàng đó**.

```ts
let y = HEADER_HEIGHT
result.players.forEach((p, i) => {
  const h = rowHeight(p)
  if (i % 2 === 1) {
    ctx.fillStyle = GRAY_50
    ctx.fillRect(0, y, WIDTH, h)          // sọc zebra phủ hết hàng cao
  }
  // … dấu ✓/○ ở y + 28, tên ở y + 28, ghi chú playerNote ở y + 48 — GIỮ NGUYÊN
  ctx.fillStyle = GRAY_500
  ctx.font = '14px sans-serif'            // đúng font/màu dòng ghi chú sẵn có
  p.extras.forEach((x, k) => {
    ctx.fillText(extraShareLine(x), nameX + EXTRA_INDENT, y + 48 + (k + 1) * EXTRA_LINE_HEIGHT)
  })
  // số tiền: baseline y + ROW_HEIGHT / 2 + 7 — CỐ Ý giữ theo ROW_HEIGHT gốc để nó luôn
  // thẳng hàng với tên, thay vì trôi xuống giữa một hàng cao
  y += h
})
```

Khoảng đệm đáy được bảo toàn: dòng cuối cùng có baseline `48 + 20n`, đáy hàng ở `64 + 20n`
→ vẫn đúng 16px như hàng không có phát sinh.

Chuỗi một dòng, export và **dùng chung với `shareResult.ts`**:

```ts
export function extraShareLine(x: ExtraShare): string {
  const who = x.sharedCount > 1 ? ` (chung, ${x.sharedCount} người)` : ''
  return `· ${x.label}${who} ${formatVND(x.share)}`
}
```

`playerNote` **bỏ phần đuôi khi đã có dòng chi tiết**, để không nói hai lần:

```ts
export function playerNote(mode: Mode, p: CalcResult['players'][number]): string {
  // … base = "Nam", "Nữ · ½ buổi", "Nam · 1h30" — giữ nguyên
  // Đã liệt kê từng khoản thành dòng riêng → không lặp lại tổng ở dòng ghi chú.
  // Chỉ giữ đuôi cho dữ liệu v1.4.0 (có extrasTotal nhưng không có extras).
  return p.extras.length === 0 && p.extrasTotal > 0
    ? `${base} · + ${formatVND(p.extrasTotal)} phát sinh`
    : base
}
```

Ảnh vẫn **không** in tổng chi / tổng thu / số dư — chỉ số tiền từng người, đúng như hiện nay.

**Test cũ phải SỬA, không được xóa:** test số 20 trong `src/lib/exportImage.test.ts`
(*"extras do not change the canvas height…"*) khẳng định điều bây giờ đã sai. Đổi thành
khẳng định chiều cao mới (xem mục 9), và bổ sung `extras: []` vào helper `playerResult()`.

### `shareResult.ts` — `formatResultText` cũng liệt kê

Hiện tại mỗi người đúng một dòng:
`${mark} ${p.name} (${playerNote(mode, p)}): ${formatVND(p.amount)}`.
Đổi sang `flatMap`, thêm các dòng con thụt 3 dấu cách, dùng lại `extraShareLine`:

```ts
const lines = result.players.flatMap((p) => {
  const mark = paidById.get(p.playerId) ? '✓' : '○'
  return [
    `${mark} ${p.name} (${playerNote(mode, p)}): ${formatVND(p.amount)}`,
    ...p.extras.map((x) => `   ${extraShareLine(x)}`),
  ]
})
```

Kết quả dán vào Zalo/Messenger:

```
🏸 Tính tiền cầu lông 14/08/2026
○ An (Nam): 85.000đ
   · Nước 15.000đ
   · Thuê vợt 20.000đ
✓ Bình (Nam): 134.000đ
   · Nước (chung, 3 người) 33.333đ
```

Buổi v1.4.0: `p.extras` rỗng → không có dòng con, `playerNote` vẫn kèm
`· + 20.000đ phát sinh` → **văn bản giống hệt hôm nay**.
Header và việc cố tình bỏ tổng chi / tổng thu / số dư: không đổi.

## 7. Trang Lịch sử (`HistoryPage.tsx`)

Buổi đã lưu giữ nguyên `input.extras` và `result.players[].extras/extrasTotal` — số tiền
đã lưu **không bao giờ được tính lại**, mọi thứ đọc từ `SavedSession`.

- **Khối "Chi phí"** — mỗi khoản một dòng, thay chỗ tra tên theo `playerId` bằng
  `payerSummary` (import từ `./PayerSelect`), fallback `'?'` cho buổi bị sửa tay:

  ```tsx
  {s.input.extras.map((e) => (
    <div key={e.id} className="flex justify-between text-sm">
      <span className="text-gray-500">
        {e.label.trim() || 'Khoản khác'} · {payerSummary(s.input.players, e.playerIds, '?')}
      </span>
      <span className="font-semibold text-gray-900">{formatVND(e.amount)}</span>
    </div>
  ))}
  ```

  → `Nước · Cả nhóm — 100.000đ`, `Thuê vợt · Hùng — 20.000đ`, `Nước · An +4 — 100.000đ`.
  Giá trị bên phải là **`amount` trọn khoản**, không phải phần chia — đây là khối "Chi phí"
  (tiền đã tiêu), chia bao nhiêu là việc của khối bên cạnh.
  Buổi v1.4.0 sau di trú có `playerIds` một phần tử → in đúng tên người như hôm nay.

- **Khối "Mỗi người trả"** — theo đúng quy tắc dự phòng ở mục 6:
  - `p.extras.length > 0` → **bỏ** đuôi `· +N phát sinh` trong cụm ngoặc xám, thay bằng
    các dòng chi tiết ngay dưới tên:
    `<span className="text-xs text-gray-400 block pl-3">· {label}{(chung, N người)} {formatVND(share)}</span>`
    (dùng `text-gray-400` cho khớp cụm chú thích xám sẵn có của trang Lịch sử, chứ không
    phải `text-amber-600` của panel Kết quả đang hoạt động).
  - Ngược lại, `p.extrasTotal > 0` → giữ **y nguyên** đuôi
    `` ` · +${formatVND(p.extrasTotal)} phát sinh` `` trong ngoặc như hôm nay.
- **Card thu gọn:** số tiền lớn vẫn là `s.result.totalCost`. Không sửa gì.
- **Buổi lưu bởi v1.4.0 phải render GIỐNG HỆT hôm nay** — đây là ràng buộc bắt buộc,
  không phải "nên": `extras` → `[]` sau chuẩn hóa nên mọi nhánh chi tiết đều tắt, chỉ
  nhánh `extrasTotal` chạy.
- `onReuse`: đã nói ở mục 1 — buổi mới `extras: []`.

## 8. Ngoài phạm vi (YAGNI)

- Chia khoản dùng chung theo **hệ số nam/nữ** hay theo giờ chơi — chốt là **chia đều theo
  đầu người**, đây là loại tiền mà cả nhóm cãi nhau nhanh nhất khi có thêm hệ số.
- Chia theo tỉ lệ tùy ý ("An trả 70%, Bình 30%").
- Khoản phát sinh **âm** (giảm giá, ai đó ứng trước).
- Danh mục khoản gợi ý sẵn / ghi nhớ khoản hay dùng như danh bạ.
- Sắp xếp / kéo thả danh sách khoản phát sinh.
- Undo cho thao tác xóa một khoản (vẫn gõ lại trong 2 giây).
- Tìm kiếm / lọc trong `PayerSelect` (nhóm cầu lông hiếm khi quá 12 người; danh sách đã
  cuộn được).

## 9. Kiểm thử (vitest, theo pattern sẵn có)

> Lưu ý xuyên suốt: mọi fixture `ExtraCost` hiện có phải đổi `playerId: 'x'` →
> `playerIds: ['x']`, và mọi fixture `PlayerResult` phải thêm `extras: []`. `tsc` sẽ chỉ
> ra hết — đó là mục đích của việc đổi kiểu thay vì thêm kiểu.

`src/lib/calc.test.ts`

1. **Chia đều — 3 người, khoản 90.000 cả nhóm, `rounding: 'exact'`, sân 0, cầu 0** →
   mỗi người `extrasTotal` 30.000, `totalCost` 90.000, `surplus` 0.
2. **Trường hợp lẻ (bắt buộc):** sân 300.000 chia 3 nam + Nước 100.000 cả nhóm,
   `up1000` → mỗi người `raw` ≈ 133.333,33 và `amount` **134.000**; `totalCost` 400.000,
   `totalCollected` 402.000, `surplus` 2.000.
3. **Tập con:** 4 người, khoản 60.000 gán 3 người → 3 người đó mỗi người 20.000, người
   thứ tư `extrasTotal` **0** và `extras` **rỗng**; `totalCost` vẫn cộng trọn 60.000.
4. **Bất biến tổng:** `Σ extrasOf(input, p.id) === extrasTotal(input)` với input trộn
   khoản một-người và khoản chung.
5. **Cộng trước khi làm tròn:** sân+cầu của A = 50.200, khoản 500 của riêng A, `up1000`
   → `amount` = 51.000 (KHÔNG phải 52.000).
6. **`extraSharesOf` sinh đúng metadata:** khoản chung 3 người → `sharedCount: 3`;
   khoản một người → `sharedCount: 1`; nhãn rỗng → `label: 'Khoản khác'`.
7. **Hourly không bị ảnh hưởng:** cùng input có/không có extras → `courtShare`,
   `shuttleShare`, `hours`, `emptyHours` giống hệt nhau.
8. **Khoản không còn ai chịu:** `playerIds` toàn id lạ → không cộng vào `totalCost`,
   không cộng vào `raw` của ai.
9. **Khoản khớp một phần:** `playerIds: ['A', 'id-rác']` với 1 người thật → A chịu
   **trọn** `amount` (mẫu số = 1), `totalCost` cộng trọn `amount`, `Σ` vẫn khớp.
10. **Hồi quy v1.4.0:** mọi khoản đều `playerIds` một phần tử → kết quả trùng khớp kỳ
    vọng cũ từng con số.

`validateSession`

11. `playerIds: []` → `Khoản phát sinh "Nước" chưa chọn người trả`.
12. `playerIds` toàn id lạ → cùng chuỗi lỗi trên.
13. `playerIds` khớp một phần → **không** sinh lỗi nào.
14. `amount` âm → `Số tiền của "Nước" chưa hợp lệ`.
15. `label` rỗng, `amount` 0, `playerIds` hợp lệ → **không** sinh lỗi nào.
16. Buổi `courtFee: 0`, cầu 0, chỉ có 1 khoản 20.000 → không có lỗi
    `Tổng chi phải lớn hơn 0`.

`src/lib/storage.test.ts`

17. **Di trú `playerId` → `playerIds` (quan trọng nhất):** seed `currentSession` với
    `extras: [{ id, label: 'Nước', amount: 15000, playerId: 'p1' }]` →
    `loadCurrentSession()` trả về `playerIds: ['p1']` và **không còn khóa `playerId`**.
18. **Di trú trong lịch sử:** seed `history` có `input.extras[].playerId` và
    `result.players` không có `extras` → `loadHistory()` trả `playerIds: [...]`,
    `extras: []`, `extrasTotal` và `amount` đã lưu **giữ nguyên**.
19. **Guard chấp nhận cả hai hình dạng:** một buổi có `playerId`, một buổi có `playerIds`
    → cả hai đều load được, không buổi nào bị `filter` loại bỏ.
20. **Guard từ chối dữ liệu hỏng:** `extras: [{ id, label, amount, playerIds: [1, 2] }]`
    → `loadCurrentSession()` trả `null`, không throw.
21. **Round-trip:** save khoản `playerIds: ['a','b','c']` → load lại đúng thứ tự và đủ 3 id.

`src/lib/exportImage.test.ts` / `shareResult.test.ts`

22. **Chiều cao canvas mới (thay test số 20 cũ):** 2 người, người 1 có 2 khoản, người 2 có
    1 khoản → `height` = `90 + (64 + 2×20) + (64 + 1×20) + 44` = **322** (thuộc tính
    `canvas.height` = 322 × SCALE = **644**); cùng 2 người không có khoản nào →
    `90 + 64 + 64 + 44` = 262 (`canvas.height` = **524**). `width` không đổi ở cả hai.
23. **`extraShareLine`:** `sharedCount: 1` → `· Nước 15.000đ`; `sharedCount: 3` →
    `· Nước (chung, 3 người) 33.333đ`.
24. **`playerNote` không nói hai lần:** `extras` không rỗng → chuỗi **không** chứa
    `phát sinh`; `extras: []` + `extrasTotal: 20000` → chuỗi **có** `+ 20.000đ phát sinh`.
25. **`formatResultText` liệt kê:** người có 2 khoản sinh 3 dòng (1 dòng người + 2 dòng
    thụt 3 dấu cách); buổi v1.4.0 (`extras: []`) sinh văn bản **giống hệt hôm nay**.

Component / tích hợp

26. **`PayerSelect` — tương tác:** bấm trigger → sheet mở; tick người thứ hai → `onChange`
    nhận đúng 2 id **ngay lập tức** (không cần bấm "Xong"); bấm "Cả nhóm" → `onChange`
    nhận đủ id theo thứ tự `players`; bấm "Cả nhóm" lần nữa khi đang đủ → `onChange([])`;
    bấm "Xong" → sheet đóng, lựa chọn được **giữ**.
27. **`PayerSelect` — tóm tắt trigger:** `[]` → `Chọn người trả`; 1 người → tên;
    2/8 → `An +1`; đủ → `Cả nhóm`.
28. **`CostForm` hai dòng:** bấm "+ Thêm khoản" → khoản mới có `playerIds` đúng **một**
    phần tử là người đầu tiên; ô nhãn được focus; gõ 100.000 và chọn Cả nhóm → dòng
    "Phát sinh" và "TỔNG CHI" tăng đúng **100.000** (tổng khoản, không phải phần chia);
    bấm `×` → hàng biến mất, TỔNG CHI trở lại như cũ.
29. **`ResultPanel` liệt kê:** người chịu 2 khoản → thấy đúng 2 dòng `· Nước 15.000` và
    `· Thuê vợt 20.000`; khoản chung 3 người → thấy `· Nước (chung, 3 người) 33.333`;
    overlay toàn màn hình hiện y hệt.
30. **Dự phòng v1.4.0 trong `ResultPanel`:** `PlayerResult` có `extras: []` và
    `extrasTotal: 35000` → hiện đúng một dòng `+ phát sinh 35.000`, không có dòng `·` nào.
31. **Xóa người + Hoàn tác (App) — chia lại:** 3 người, khoản Nước 100.000 cả nhóm →
    xóa Cường → `totalCost` **không đổi**, hai người còn lại mỗi người `extrasTotal`
    50.000; bấm "Hoàn tác" → Cường về đúng vị trí cũ, `playerIds` lại đủ 3, mỗi người về
    33.333, `totalCost` bằng giá trị ban đầu.
32. **Xóa người + Hoàn tác — khoản bị xóa hẳn:** người chịu riêng một khoản 20.000 (kèm
    một khoản khác đứng sau nó trong mảng) → xóa → `extras` không còn khoản đó,
    `totalCost` giảm đúng 20.000; Hoàn tác → khoản quay lại **đúng chỉ số cũ** trong
    `CostForm`.
33. **Hoàn tác khi khoản bị-cắt đã bị xóa tay:** xóa người → trong lúc toast còn hiện,
    bấm `×` xóa khoản chung đó → bấm "Hoàn tác" → người quay lại nhưng khoản **không**
    được hồi sinh, không crash, không có khoản trùng id.
34. **`HistoryPage`:** buổi có khoản chung → khối "Chi phí" hiện `Nước · Cả nhóm` +
    `100.000đ`, khối "Mỗi người trả" hiện dòng `· Nước (chung, 3 người) 33.333đ`;
    buổi lưu bởi v1.4.0 → hiện `· +20.000đ phát sinh` trong ngoặc **y hệt hôm nay**,
    không có dòng `·` nào thừa.

## Ghi chú release

- Commit **`feat:`** → minor bump (v1.5.0). **Không** breaking change: dữ liệu v1.4.0
  (`playerId: string`) load bình thường nhờ di trú mềm ở mục 1, không mất buổi nào, không
  mất đồng nào. **Không** dùng `feat!:`, **không** có dòng `BREAKING CHANGE`.
- Bắt buộc cập nhật mục "Tính năng chính" của `README.md` trong **cùng nhánh** trước khi
  merge — sửa gạch đầu dòng **"Chi phí phát sinh khác"** sẵn có thành, ví dụ:

  ```md
  - **Chi phí phát sinh khác**
    - Nhập các khoản lặt vặt (nước, thuê vợt, quấn cán…) ngay trong mục Chi phí
    - Chọn một người, một nhóm nhỏ hay cả nhóm cùng chịu — số tiền chia đều theo đầu người
    - Kết quả liệt kê từng khoản dưới tên mỗi người, có cả trong ảnh PNG và bản copy text
    - Xóa người chơi thì khoản chung vẫn giữ nguyên tổng, những người còn lại gánh phần đó
  ```

- Tiện tay cập nhật số lượng test trong mục Tech Stack của `README.md`.
