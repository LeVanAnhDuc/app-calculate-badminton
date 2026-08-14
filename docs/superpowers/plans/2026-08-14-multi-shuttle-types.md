# Nhiều loại cầu trong một buổi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép nhập nhiều loại cầu (tên + số lượng + giá riêng) trong một buổi, thay cho một cặp `shuttleCount × shuttlePrice` duy nhất.

**Architecture:** `SessionInput.shuttles: ShuttleLine[]` thay hai trường cũ; `shuttleTotal()` cộng mọi dòng còn luật chia tiền giữ nguyên. Dữ liệu cũ trong localStorage được di trú mềm khi load (giống `paid` và `extras`). Danh bạ loại cầu suy ra từ `history` (không thêm key localStorage), hiển thị qua bottom sheet theo mô-típ `TimeSelect`.

**Tech Stack:** React 19 + TypeScript strict, Vite, Tailwind v4, vaul (bottom sheet), Motion, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-14-multi-shuttle-types-design.md`

## Global Constraints

- Tiếng Việt cho mọi chuỗi hiển thị và `aria-label`.
- TypeScript strict — không dùng `any`, không `@ts-ignore`.
- Không thêm dependency mới.
- Không thêm key localStorage mới.
- Dữ liệu cũ trong localStorage phải load được nguyên vẹn → đây là `feat:` (minor), KHÔNG phải breaking change.
- Luật chia tiền cầu **không đổi**: tổng tiền cầu chia theo hệ số Nam/Nữ ở cả hai chế độ.
- Comment trong code viết theo phong cách file xung quanh (giải thích *tại sao*, không mô tả lại code).
- Chạy test: `npx vitest run`. Typecheck + build: `npm run build`.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/lib/types.ts` | thêm `ShuttleLine`, đổi `SessionInput` |
| `src/lib/calc.ts` | `shuttleTotal()` cộng nhiều dòng, validate từng dòng |
| `src/lib/storage.ts` | guard + di trú mềm `shuttles`, `Settings.shuttleName` |
| `src/lib/shuttleTypes.ts` | **mới** — xếp hạng loại cầu hay dùng từ `history` |
| `src/components/ShuttleTypeSelect.tsx` | **mới** — nút + bottom sheet chọn loại cầu |
| `src/components/CostForm.tsx` | danh sách dòng cầu |
| `src/components/HistoryPage.tsx` | liệt kê từng loại cầu trong chi tiết buổi |
| `src/App.tsx` | `defaultSession`, ghi `Settings`, truyền gợi ý xuống `CostForm` |

---

### Task 1: Data model, tính toán và di trú dữ liệu

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/calc.ts:8-10` (`shuttleTotal`), `src/lib/calc.ts:133-182` (`validateSession`)
- Modify: `src/lib/storage.ts`
- Test: `src/lib/calc.test.ts`, `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `interface ShuttleLine { id: string; name: string; count: number; price: number }` (từ `./types`)
  - `SessionInput.shuttles: ShuttleLine[]` (hai trường `shuttleCount`, `shuttlePrice` bị xóa)
  - `shuttleTotal(input: SessionInput): number`
  - `Settings.shuttleName: string`
  - `export const LEGACY_SHUTTLE_ID = 'shuttle-legacy'` (từ `./storage`)

> **Lưu ý:** sau Task 1, `npm run build` sẽ **FAIL** vì `App.tsx`, `CostForm.tsx`, `HistoryPage.tsx` còn dùng trường cũ. Đó là dự kiến — Task 2 sửa nốt. Task 1 chỉ cần `npx vitest run src/lib/calc.test.ts src/lib/storage.test.ts` xanh.

- [ ] **Step 1: Viết test thất bại cho `shuttleTotal` nhiều dòng**

Trong `src/lib/calc.test.ts`, đổi helper `ratioInput` để dùng `shuttles` (thay hai dòng `shuttleCount: 6, shuttlePrice: 25000`):

```ts
    shuttles: [{ id: 's1', name: '', count: 6, price: 25000 }],
```

Rồi thêm test mới ở cuối file:

```ts
describe('nhiều loại cầu', () => {
  test('tiền cầu cộng mọi dòng', () => {
    const r = calcRatioMode(
      ratioInput({
        shuttles: [
          { id: 's1', name: 'Hải Yến', count: 4, price: 25000 },
          { id: 's2', name: 'Ba Sao', count: 2, price: 20000 },
        ],
      }),
    )
    // 100.000 + 40.000 cầu + 150.000 sân
    expect(r.totalCost).toBe(290000)
  })

  test('danh sách rỗng thì tiền cầu bằng 0', () => {
    const r = calcRatioMode(ratioInput({ shuttles: [] }))
    expect(r.totalCost).toBe(150000)
    expect(r.players.every((p) => p.shuttleShare === 0)).toBe(true)
  })

  test('gộp 2 dòng thành 1 dòng cùng tổng tiền cho ra phần chia y hệt', () => {
    const split = calcRatioMode(
      ratioInput({
        shuttles: [
          { id: 's1', name: 'Hải Yến', count: 4, price: 25000 },
          { id: 's2', name: 'Ba Sao', count: 2, price: 25000 },
        ],
      }),
    )
    const merged = calcRatioMode(
      ratioInput({ shuttles: [{ id: 's1', name: '', count: 6, price: 25000 }] }),
    )
    expect(split.players.map((p) => p.shuttleShare)).toEqual(
      merged.players.map((p) => p.shuttleShare),
    )
  })

  test('validate: số lượng hoặc giá âm/NaN là lỗi, tên rỗng thì không', () => {
    expect(
      validateSession(ratioInput({ shuttles: [{ id: 's1', name: 'Ba Sao', count: -1, price: 20000 }] })),
    ).toContain('Số lượng/giá của "Ba Sao" chưa hợp lệ')
    expect(
      validateSession(ratioInput({ shuttles: [{ id: 's1', name: '', count: 1, price: Number.NaN }] })),
    ).toContain('Số lượng/giá của "loại cầu" chưa hợp lệ')
    expect(
      validateSession(ratioInput({ shuttles: [{ id: 's1', name: '', count: 6, price: 25000 }] })),
    ).toEqual([])
  })
})
```

Đồng thời sửa mọi chỗ khác trong `calc.test.ts` còn truyền `shuttleCount`/`shuttlePrice` trong `over` (các dòng `shuttleCount: 0`) thành `shuttles: []`. Riêng ở test `validateSession(ratioInput({ shuttleCount: 0, shuttlePrice: 0, courtFee: 0 }))` đổi thành `ratioInput({ shuttles: [], courtFee: 0 })`.

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/lib/calc.test.ts`
Expected: FAIL — TypeScript/runtime báo `input.shuttles` là `undefined`.

- [ ] **Step 3: Thêm `ShuttleLine` và đổi `SessionInput`**

Trong `src/lib/types.ts`, thêm ngay trên `ExtraCost`:

```ts
export interface ShuttleLine {
  id: string
  name: string                  // "Hải Yến 3 sao" — có thể rỗng lúc vừa thêm
  count: number                 // số quả, nguyên ≥ 0
  price: number                 // VND / quả, ≥ 0
}
```

Trong `SessionInput`, thay hai dòng

```ts
  shuttleCount: number
  shuttlePrice: number
```

bằng

```ts
  shuttles: ShuttleLine[]       // nhiều loại cầu trong cùng buổi; [] = không mua cầu
```

- [ ] **Step 4: Đổi `shuttleTotal` và `validateSession`**

Trong `src/lib/calc.ts`, thay:

```ts
export function shuttleTotal(input: SessionInput): number {
  return input.shuttles.reduce((s, l) => s + l.count * l.price, 0)
}
```

Trong `validateSession`, thêm ngay trước khối kiểm tra `input.extras` (trước comment "Khoản phát sinh: nhãn rỗng KHÔNG phải lỗi"):

```ts
  // Dòng cầu: tên rỗng KHÔNG phải lỗi (hàng được tạo rỗng rồi gõ dần), giống extras.
  for (const l of input.shuttles) {
    const name = l.name.trim() || 'loại cầu'
    if (!Number.isFinite(l.count) || l.count < 0 || !Number.isFinite(l.price) || l.price < 0) {
      errors.push(`Số lượng/giá của "${name}" chưa hợp lệ`)
    }
  }
```

- [ ] **Step 5: Chạy test calc**

Run: `npx vitest run src/lib/calc.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 6: Viết test thất bại cho di trú storage**

Trong `src/lib/storage.test.ts`, thêm ở cuối file:

```ts
describe('di trú shuttles', () => {
  const legacyInput = {
    mode: 'ratio',
    shuttleCount: 10,
    shuttlePrice: 25000,
    courtFee: 150000,
    courtStart: '19:00',
    courtEnd: '21:00',
    maleRatio: 1.5,
    femaleRatio: 1,
    rounding: 'up1000',
    players: [],
    extras: [],
  }

  test('buổi cũ load ra đúng một dòng cầu', () => {
    localStorage.setItem('currentSession', JSON.stringify(legacyInput))
    const s = loadCurrentSession()
    expect(s?.shuttles).toEqual([
      { id: 'shuttle-legacy', name: '', count: 10, price: 25000 },
    ])
    expect(s).not.toHaveProperty('shuttleCount')
    expect(s).not.toHaveProperty('shuttlePrice')
  })

  test('buổi mới round-trip nguyên vẹn', () => {
    const shuttles = [
      { id: 'a', name: 'Hải Yến', count: 4, price: 25000 },
      { id: 'b', name: 'Ba Sao', count: 2, price: 20000 },
    ]
    localStorage.setItem('currentSession', JSON.stringify({ ...legacyInput, shuttleCount: undefined, shuttlePrice: undefined, shuttles }))
    expect(loadCurrentSession()?.shuttles).toEqual(shuttles)
  })

  test('shuttles sai kiểu thì buổi bị loại', () => {
    localStorage.setItem(
      'currentSession',
      JSON.stringify({ ...legacyInput, shuttles: [{ id: 'a', name: 'X', count: 'nhiều', price: 1 }] }),
    )
    expect(loadCurrentSession()).toBeNull()
  })

  test('settings cũ thiếu shuttleName thì mặc định rỗng', () => {
    localStorage.setItem(
      'settings',
      JSON.stringify({ mode: 'ratio', maleRatio: 1.5, femaleRatio: 1, shuttlePrice: 25000, rounding: 'up1000' }),
    )
    expect(loadSettings().shuttleName).toBe('')
    expect(loadSettings().shuttlePrice).toBe(25000)
  })
})
```

Đồng thời sửa mọi fixture sẵn có trong `storage.test.ts` đang dùng `shuttleCount: 10, shuttlePrice: 25000` thành `shuttles: [{ id: 's1', name: '', count: 10, price: 25000 }]` — **trừ** các fixture trong `describe('di trú shuttles')` ở trên (chúng cố tình dùng dạng cũ). Bảo đảm `loadSettings` được import trong file.

- [ ] **Step 7: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — `s?.shuttles` là `undefined`.

- [ ] **Step 8: Cài di trú trong `storage.ts`**

Thêm cạnh `isExtraCost`:

```ts
/** Buổi cũ chỉ có 1 loại cầu — id cố định để mỗi lần load ra cùng một React key. */
export const LEGACY_SHUTTLE_ID = 'shuttle-legacy'

const isShuttleLine = (v: unknown): boolean =>
  isObject(v) &&
  typeof v.id === 'string' &&
  typeof v.name === 'string' &&
  typeof v.count === 'number' &&
  typeof v.price === 'number'
```

Trong `isSession`, thay hai dòng

```ts
  typeof v.shuttleCount === 'number' &&
  typeof v.shuttlePrice === 'number' &&
```

bằng

```ts
  // migration: buổi cũ có shuttleCount/shuttlePrice, buổi mới có mảng shuttles.
  // Chấp nhận cả hai; normalizeSession() quy đổi dạng cũ khi load.
  (v.shuttles === undefined
    ? typeof v.shuttleCount === 'number' && typeof v.shuttlePrice === 'number'
    : Array.isArray(v.shuttles) && v.shuttles.every((l) => isShuttleLine(l))) &&
```

Đổi `normalizeSession`:

```ts
/** Trường cũ chỉ tồn tại trong dữ liệu đã lưu trước tính năng nhiều loại cầu. */
type LegacySession = SessionInput & { shuttleCount?: number; shuttlePrice?: number }

/** Di trú mềm: buổi cũ không có `extras` → mảng rỗng, 1 cặp số lượng/giá → 1 dòng cầu. */
function normalizeSession(s: LegacySession): SessionInput {
  const { shuttleCount, shuttlePrice, ...rest } = s
  return {
    ...rest,
    players: s.players.map(normalizePlayer),
    extras: s.extras ?? [],
    shuttles: s.shuttles ?? [
      { id: LEGACY_SHUTTLE_ID, name: '', count: shuttleCount ?? 0, price: shuttlePrice ?? 0 },
    ],
  }
}
```

Thêm `shuttleName` vào `Settings`:

```ts
export interface Settings {
  mode: Mode
  maleRatio: number
  femaleRatio: number
  shuttlePrice: number
  shuttleName: string
  rounding: Rounding
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'ratio',
  maleRatio: 1.5,
  femaleRatio: 1.0,
  shuttlePrice: 25000,
  shuttleName: '',
  rounding: 'up1000',
}
```

Trong `isSettings`, thêm dòng (đặt sau `typeof v.shuttlePrice === 'number' &&`):

```ts
  // migration: settings cũ không có `shuttleName` — loadSettings() điền '' khi load.
  (typeof v.shuttleName === 'string' || v.shuttleName === undefined) &&
```

Đổi `loadSettings` từ arrow một dòng thành:

```ts
export function loadSettings(): Settings {
  const s = load<Settings>('settings', isSettings, DEFAULT_SETTINGS)
  return { ...s, shuttleName: s.shuttleName ?? '' }
}
```

- [ ] **Step 9: Chạy test storage**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 10: Commit**

```bash
git add src/lib/types.ts src/lib/calc.ts src/lib/storage.ts src/lib/calc.test.ts src/lib/storage.test.ts
git commit -m "feat: data model nhiều loại cầu và di trú dữ liệu cũ"
```

---

### Task 2: Nhập nhiều dòng cầu trong form và hiển thị trong lịch sử

**Files:**
- Modify: `src/App.tsx:33-47` (`defaultSession`), `src/App.tsx:73-82` (effect lưu settings), `src/App.tsx:185-198` (`handleNewSession`)
- Modify: `src/components/CostForm.tsx:46-75` (khối số quả cầu × giá)
- Modify: `src/components/HistoryPage.tsx:135-142` (dòng "Tiền cầu")
- Test: `src/components/CostForm.test.tsx`, `src/components/HistoryPage.test.tsx`, `src/components/PlayerList.test.tsx`, `src/lib/frequent.test.ts`

**Interfaces:**
- Consumes: `ShuttleLine`, `SessionInput.shuttles`, `shuttleTotal`, `Settings.shuttleName` (Task 1)
- Produces: `CostForm` render danh sách dòng cầu với `aria-label` `"Tên loại cầu"` / `` `Số quả của ${tên}` `` / `` `Giá / quả của ${tên}` `` / `` `Xóa ${tên}` ``, nút `"+ Thêm loại cầu"`.

- [ ] **Step 1: Viết test thất bại cho CostForm**

Trong `src/components/CostForm.test.tsx`, đổi fixture `base` (bỏ `shuttleCount`/`shuttlePrice`):

```ts
  shuttles: [{ id: 's1', name: '', count: 6, price: 25000 }],
```

Thêm describe mới:

```tsx
describe('nhiều loại cầu', () => {
  test('thêm dòng, nhập số lượng và giá, tổng cộng đúng', () => {
    render(<Harness initial={base} />)
    expect(screen.getByText('150.000đ')).toBeInTheDocument() // tiền cầu 1 dòng

    fireEvent.click(screen.getByRole('button', { name: '+ Thêm loại cầu' }))
    const counts = screen.getAllByLabelText(/^Số quả của/)
    const prices = screen.getAllByLabelText(/^Giá \/ quả của/)
    expect(counts).toHaveLength(2)

    fireEvent.change(counts[1], { target: { value: '2' } })
    fireEvent.change(prices[1], { target: { value: '20000' } })

    expect(screen.getByText('190.000đ')).toBeInTheDocument() // tiền cầu
    expect(screen.getByText('340.000đ')).toBeInTheDocument() // TỔNG CHI
  })

  test('gõ tên loại cầu và xóa dòng', () => {
    render(<Harness initial={base} />)
    fireEvent.change(screen.getByLabelText('Tên loại cầu'), { target: { value: 'Hải Yến' } })
    expect(screen.getByLabelText('Số quả của Hải Yến')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Xóa Hải Yến' }))
    expect(screen.queryByLabelText('Tên loại cầu')).not.toBeInTheDocument()
    expect(screen.getByText('150.000đ')).toBeInTheDocument() // chỉ còn tiền sân
  })
})
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/components/CostForm.test.tsx`
Expected: FAIL — không tìm thấy nút `+ Thêm loại cầu`.

- [ ] **Step 3: Đổi khối tiền cầu trong `CostForm.tsx`**

Thêm `ShuttleLine` vào import type, rồi thêm các helper cạnh `patchExtra`:

```tsx
  const shuttles = input.shuttles

  const patchShuttle = (id: string, patch: Partial<ShuttleLine>) =>
    onPatch({ shuttles: shuttles.map((l) => (l.id === id ? { ...l, ...patch } : l)) })

  const addShuttle = () =>
    onPatch({ shuttles: [...shuttles, { id: uid(), name: '', count: 0, price: 0 }] })

  // xóa một dòng không undo được — gõ lại mất hai giây, giống dòng phát sinh
  const removeShuttle = (id: string) => onPatch({ shuttles: shuttles.filter((l) => l.id !== id) })
```

Thay toàn bộ khối JSX từ `<div className="flex gap-2 items-end">` đến hết `</div>` của dòng tổng "Tiền cầu" (dòng 46–75) bằng:

```tsx
      <ul className="space-y-2">
        {shuttles.map((l) => {
          const label = l.name.trim() || 'loại cầu'
          return (
            <li key={l.id} className="flex gap-2 items-center">
              <input
                aria-label="Tên loại cầu"
                placeholder="Tên loại cầu"
                value={l.name}
                onChange={(ev) => patchShuttle(l.id, { name: ev.target.value })}
                className="flex-1 min-w-0 h-11 rounded-xl border border-gray-300 px-3 text-sm text-gray-900"
              />
              <input
                aria-label={`Số quả của ${label}`}
                inputMode="numeric"
                value={l.count === 0 ? '' : l.count}
                placeholder="0"
                onChange={(ev) =>
                  patchShuttle(l.id, { count: Number(ev.target.value.replace(/\D/g, '') || 0) })
                }
                className="w-14 h-11 rounded-xl border border-gray-300 px-2 text-base font-semibold text-gray-900 text-center"
              />
              <MoneyInput
                aria-label={`Giá / quả của ${label}`}
                value={l.price}
                onChange={(v) => patchShuttle(l.id, { price: v })}
                className="w-24 h-11! text-base!"
              />
              <button
                type="button"
                aria-label={`Xóa ${label}`}
                onClick={() => removeShuttle(l.id)}
                className="w-9 h-9 shrink-0 self-center text-gray-400 text-xl leading-none"
              >
                ×
              </button>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        onClick={addShuttle}
        className="w-full h-11 mt-2 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-600 font-semibold text-sm"
      >
        + Thêm loại cầu
      </button>
      <div className="flex justify-between items-center mt-2 px-1">
        <span className="text-sm text-gray-500">Tiền cầu</span>
        <span className="text-sm font-semibold text-gray-900">{formatVND(shuttleTotal(input))}</span>
      </div>
```

- [ ] **Step 4: Chạy test CostForm**

Run: `npx vitest run src/components/CostForm.test.tsx`
Expected: PASS.

- [ ] **Step 5: Viết test thất bại cho HistoryPage**

Trong `src/components/HistoryPage.test.tsx`, đổi fixture đang dùng `shuttleCount: 6, shuttlePrice: 25000` thành `shuttles: [{ id: 's1', name: '', count: 6, price: 25000 }]`, rồi thêm test:

```tsx
test('chi tiết liệt kê từng loại cầu', () => {
  // thay `savedSession` bằng đúng tên biến fixture của file này
  const s = {
    ...sessionFixture,
    shuttles: [
      { id: 'a', name: 'Hải Yến', count: 4, price: 25000 },
      { id: 'b', name: '', count: 2, price: 20000 },
      { id: 'c', name: 'Không dùng', count: 0, price: 30000 },
    ],
  }
  renderHistoryWith(s) // dùng đúng helper render sẵn có của file, mở phần chi tiết
  expect(screen.getByText('Hải Yến (4 quả × 25.000đ)')).toBeInTheDocument()
  expect(screen.getByText('Tiền cầu (2 quả × 20.000đ)')).toBeInTheDocument()
  expect(screen.queryByText(/Không dùng/)).not.toBeInTheDocument()
})
```

> Đọc file test trước để dùng đúng tên fixture và cách mở phần "chi tiết" (bấm nút có chữ `▼ chi tiết`).

- [ ] **Step 6: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/components/HistoryPage.test.tsx`
Expected: FAIL.

- [ ] **Step 7: Sửa `HistoryPage.tsx`**

Thay khối `<div className="flex justify-between">` chứa "Tiền cầu (…)" (dòng 135–142) bằng:

```tsx
                          {s.input.shuttles
                            .filter((l) => l.count > 0)
                            .map((l) => (
                              <div key={l.id} className="flex justify-between">
                                <span className="text-gray-500">
                                  {l.name.trim() || 'Tiền cầu'} ({l.count} quả ×{' '}
                                  {formatVND(l.price)})
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {formatVND(l.count * l.price)}
                                </span>
                              </div>
                            ))}
```

- [ ] **Step 8: Sửa `App.tsx`**

`defaultSession` — thay `shuttleCount: 0, shuttlePrice: s.shuttlePrice,` bằng:

```ts
    shuttles: [{ id: uid(), name: s.shuttleName, count: 0, price: s.shuttlePrice }],
```

Effect lưu settings — thay khối `saveSettings({...})` bằng:

```ts
    // Tên & giá cầu được nhớ từ DÒNG ĐẦU TIÊN; buổi không có dòng nào thì giữ giá trị cũ.
    const first = session.shuttles[0]
    saveSettings({
      ...loadSettings(),
      mode: session.mode,
      maleRatio: session.maleRatio,
      femaleRatio: session.femaleRatio,
      rounding: session.rounding,
      ...(first ? { shuttlePrice: first.price, shuttleName: first.name } : {}),
    })
```

`handleNewSession` — thay `previous.shuttleCount === 0 &&` bằng:

```ts
      previous.shuttles.every((l) => l.count === 0) &&
```

- [ ] **Step 9: Sửa fixture ở các file test còn lại**

Trong `src/components/PlayerList.test.tsx` và `src/lib/frequent.test.ts`, thay `shuttleCount: …, shuttlePrice: …` bằng `shuttles: [{ id: 's1', name: '', count: 6, price: 25000 }]`. Tìm sót bằng:

```bash
npx tsc --noEmit
```

- [ ] **Step 10: Chạy toàn bộ test và build**

Run: `npx vitest run && npm run build`
Expected: PASS + build thành công.

- [ ] **Step 11: Commit**

```bash
git add src/App.tsx src/components/CostForm.tsx src/components/HistoryPage.tsx src/components/CostForm.test.tsx src/components/HistoryPage.test.tsx src/components/PlayerList.test.tsx src/lib/frequent.test.ts
git commit -m "feat: nhập nhiều loại cầu với số lượng và giá riêng"
```

---

### Task 3: Danh bạ loại cầu suy ra từ lịch sử

**Files:**
- Create: `src/lib/shuttleTypes.ts`
- Test: `src/lib/shuttleTypes.test.ts`

**Interfaces:**
- Consumes: `SavedSession` (từ `./storage`), `ShuttleLine` (từ `./types`)
- Produces:
  - `export interface ShuttleType { name: string; price: number }`
  - `export const DEFAULT_SHUTTLE_TYPE_LIMIT = 8`
  - `export function frequentShuttleTypes(history: readonly SavedSession[], excludeNames: readonly string[], limit?: number): ShuttleType[]`

- [ ] **Step 1: Viết test thất bại**

Tạo `src/lib/shuttleTypes.test.ts`:

```ts
import { frequentShuttleTypes } from './shuttleTypes'
import type { SavedSession } from './storage'
import type { ShuttleLine } from './types'

function session(savedAt: string, shuttles: ShuttleLine[]): SavedSession {
  return {
    id: savedAt,
    savedAt,
    input: {
      mode: 'ratio',
      shuttles,
      courtFee: 150000,
      courtStart: '19:00',
      courtEnd: '21:00',
      maleRatio: 1.5,
      femaleRatio: 1,
      rounding: 'up1000',
      players: [],
      extras: [],
    },
    result: { totalCost: 0, totalCollected: 0, surplus: 0, emptyHours: 0, players: [] },
  }
}

const line = (name: string, price: number): ShuttleLine => ({ id: name, name, count: 1, price })

test('xếp theo số buổi giảm dần', () => {
  const history = [
    session('2026-08-01T00:00:00Z', [line('Hải Yến', 25000), line('Ba Sao', 20000)]),
    session('2026-08-02T00:00:00Z', [line('Hải Yến', 26000)]),
  ]
  expect(frequentShuttleTypes(history, [])).toEqual([
    { name: 'Hải Yến', price: 26000 },
    { name: 'Ba Sao', price: 20000 },
  ])
})

test('giá lấy từ buổi mới nhất kể cả khi lịch sử không theo thứ tự', () => {
  const history = [
    session('2026-08-02T00:00:00Z', [line('Hải Yến', 26000)]),
    session('2026-08-05T00:00:00Z', [line('hải yến', 30000)]),
    session('2026-08-03T00:00:00Z', [line('Hải Yến', 27000)]),
  ]
  expect(frequentShuttleTypes(history, [])).toEqual([{ name: 'hải yến', price: 30000 }])
})

test('trùng tên trong cùng một buổi chỉ tính 1', () => {
  const history = [
    session('2026-08-01T00:00:00Z', [line('Ba Sao', 20000), line('Ba Sao', 20000)]),
    session('2026-08-02T00:00:00Z', [line('Hải Yến', 25000)]),
    session('2026-08-03T00:00:00Z', [line('Hải Yến', 25000)]),
  ]
  expect(frequentShuttleTypes(history, []).map((t) => t.name)).toEqual(['Hải Yến', 'Ba Sao'])
})

test('bỏ tên rỗng và tên trong excludeNames (không phân biệt hoa/thường)', () => {
  const history = [
    session('2026-08-01T00:00:00Z', [line('', 25000), line('Ba Sao', 20000), line('Hải Yến', 25000)]),
  ]
  expect(frequentShuttleTypes(history, [' hải yến '])).toEqual([{ name: 'Ba Sao', price: 20000 }])
})

test('giới hạn số lượng trả về', () => {
  const history = [
    session('2026-08-01T00:00:00Z', [line('A', 1), line('B', 2), line('C', 3)]),
  ]
  expect(frequentShuttleTypes(history, [], 2)).toHaveLength(2)
  expect(frequentShuttleTypes(history, [], 0)).toEqual([])
})
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/lib/shuttleTypes.test.ts`
Expected: FAIL — `Cannot find module './shuttleTypes'`.

- [ ] **Step 3: Viết `src/lib/shuttleTypes.ts`**

```ts
import type { SavedSession } from './storage'

export interface ShuttleType {
  name: string
  price: number
}

/**
 * Cùng mô-típ với `frequent.ts`: tần suất suy ra từ `history` chứ không lưu
 * thành key localStorage riêng — schema không đổi, không cần di trú.
 */
interface Tally {
  name: string
  price: number
  /** Số buổi đã lưu có loại cầu này (trùng trong cùng một buổi chỉ tính 1). */
  count: number
  lastSeen: string
}

export const DEFAULT_SHUTTLE_TYPE_LIMIT = 8

/**
 * Xếp hạng loại cầu hay dùng để gợi ý trong sheet chọn loại cầu.
 *
 * - sắp xếp: số buổi giảm dần → buổi gần nhất → tên (cho kết quả tất định)
 * - tên & giá lấy từ buổi có `savedAt` mới nhất
 * - bỏ dòng tên rỗng và những tên đang có ở dòng khác trong buổi hiện tại
 */
export function frequentShuttleTypes(
  history: readonly SavedSession[],
  excludeNames: readonly string[],
  limit: number = DEFAULT_SHUTTLE_TYPE_LIMIT,
): ShuttleType[] {
  if (limit <= 0) return []

  const tallies = new Map<string, Tally>()

  for (const s of history) {
    const countedInThisSession = new Set<string>()
    for (const l of s.input.shuttles) {
      const name = l.name.trim()
      if (!name) continue
      const key = name.toLowerCase()
      const isFirstInSession = !countedInThisSession.has(key)
      countedInThisSession.add(key)

      const tally = tallies.get(key)
      if (!tally) {
        tallies.set(key, {
          name,
          price: l.price,
          count: isFirstInSession ? 1 : 0,
          lastSeen: s.savedAt,
        })
        continue
      }
      if (isFirstInSession) tally.count += 1
      // Lịch sử không đảm bảo đã sắp xếp — luôn so `savedAt` để lấy lần gần nhất.
      if (s.savedAt > tally.lastSeen) {
        tally.lastSeen = s.savedAt
        tally.name = name
        tally.price = l.price
      }
    }
  }

  const excluded = new Set(excludeNames.map((n) => n.trim().toLowerCase()))

  return [...tallies.entries()]
    .filter(([key]) => !excluded.has(key))
    .map(([, tally]) => tally)
    .sort(
      (a, b) =>
        b.count - a.count ||
        (a.lastSeen === b.lastSeen ? 0 : a.lastSeen < b.lastSeen ? 1 : -1) ||
        a.name.localeCompare(b.name, 'vi'),
    )
    .slice(0, limit)
    .map(({ name, price }) => ({ name, price }))
}
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/lib/shuttleTypes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shuttleTypes.ts src/lib/shuttleTypes.test.ts
git commit -m "feat: xếp hạng loại cầu hay dùng từ lịch sử"
```

---

### Task 4: `ShuttleTypeSelect` — nút + bottom sheet chọn loại cầu

**Files:**
- Create: `src/components/ShuttleTypeSelect.tsx`
- Test: `src/components/ShuttleTypeSelect.test.tsx`

**Interfaces:**
- Consumes: `ShuttleType` (Task 3)
- Produces:

```ts
interface Props {
  value: string
  /** `price` chỉ có khi người dùng chọn một gợi ý; gõ tay thì để nguyên giá. */
  onChange: (name: string, price?: number) => void
  suggestions: ShuttleType[]
  'aria-label': string
  className?: string
}
export function ShuttleTypeSelect(props: Props): JSX.Element
```

> Mô-típ lấy từ `src/components/TimeSelect.tsx` (nút mở `vaul` Drawer, hủy = giữ giá trị cũ) và phần gợi ý của `src/components/PlayerList.tsx` (chip khi ô trống, danh sách lọc theo tiền tố khi đã gõ). Đọc cả hai file trước khi viết.

- [ ] **Step 1: Viết test thất bại**

Tạo `src/components/ShuttleTypeSelect.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { ShuttleTypeSelect } from './ShuttleTypeSelect'
import type { ShuttleType } from '../lib/shuttleTypes'

const suggestions: ShuttleType[] = [
  { name: 'Hải Yến', price: 25000 },
  { name: 'Hải Âu', price: 22000 },
  { name: 'Ba Sao', price: 20000 },
]

function Harness({ initial = '' }: { initial?: string }) {
  const [name, setName] = useState(initial)
  const [price, setPrice] = useState(0)
  return (
    <>
      <ShuttleTypeSelect
        aria-label="Loại cầu"
        value={name}
        suggestions={suggestions}
        onChange={(n, p) => {
          setName(n)
          if (p !== undefined) setPrice(p)
        }}
      />
      <output data-testid="price">{price}</output>
    </>
  )
}

test('nút trống hiện placeholder, mở sheet thấy chip gợi ý', () => {
  render(<Harness />)
  const trigger = screen.getByRole('button', { name: 'Loại cầu' })
  expect(trigger).toHaveTextContent('Chọn loại cầu')

  fireEvent.click(trigger)
  expect(screen.getByRole('button', { name: 'Chọn Hải Yến · 25.000đ' })).toBeInTheDocument()
})

test('bấm chip điền cả tên và giá rồi đóng sheet', () => {
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Loại cầu' }))
  fireEvent.click(screen.getByRole('button', { name: 'Chọn Hải Yến · 25.000đ' }))

  expect(screen.getByRole('button', { name: 'Loại cầu' })).toHaveTextContent('Hải Yến')
  expect(screen.getByTestId('price')).toHaveTextContent('25000')
  expect(screen.queryByLabelText('Tên loại cầu')).not.toBeInTheDocument()
})

test('gõ vào ô tên thì chip nhường chỗ cho gợi ý lọc theo tiền tố', () => {
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Loại cầu' }))
  fireEvent.change(screen.getByLabelText('Tên loại cầu'), { target: { value: 'hải' } })

  expect(screen.getByRole('button', { name: 'Chọn Hải Yến · 25.000đ' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Chọn Hải Âu · 22.000đ' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Chọn Ba Sao · 20.000đ' })).not.toBeInTheDocument()
})

test('bấm Xong nhận tên gõ tay mà không đổi giá', () => {
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Loại cầu' }))
  fireEvent.change(screen.getByLabelText('Tên loại cầu'), { target: { value: 'Cầu lạ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Xong' }))

  expect(screen.getByRole('button', { name: 'Loại cầu' })).toHaveTextContent('Cầu lạ')
  expect(screen.getByTestId('price')).toHaveTextContent('0')
})

test('mở lại sheet thì ô tên bắt đầu từ giá trị hiện tại', () => {
  render(<Harness initial="Ba Sao" />)
  fireEvent.click(screen.getByRole('button', { name: 'Loại cầu' }))
  expect(screen.getByLabelText('Tên loại cầu')).toHaveValue('Ba Sao')
})
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/components/ShuttleTypeSelect.test.tsx`
Expected: FAIL — `Cannot find module './ShuttleTypeSelect'`.

- [ ] **Step 3: Viết `src/components/ShuttleTypeSelect.tsx`**

```tsx
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Drawer } from 'vaul'
import { formatVND } from '../lib/format'
import type { ShuttleType } from '../lib/shuttleTypes'

interface Props {
  value: string
  /** `price` chỉ có khi người dùng chọn một gợi ý; gõ tay thì để nguyên giá. */
  onChange: (name: string, price?: number) => void
  /** Đã xếp hạng & lọc sẵn bởi cha — component này chỉ hiển thị. */
  suggestions: ShuttleType[]
  'aria-label': string
  className?: string
}

/**
 * Chọn loại cầu theo mô-típ `TimeSelect`: một nút hiển thị giá trị mở bottom
 * sheet (vaul) thay vì `<select>` native. Trong sheet: gõ tên tự do, chip loại
 * hay dùng khi ô còn trống, danh sách lọc theo tiền tố khi đã gõ. Kéo xuống /
 * bấm overlay / Esc = hủy, giữ nguyên giá trị cũ.
 */
export function ShuttleTypeSelect({
  value,
  onChange,
  suggestions,
  'aria-label': label,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)

  const openSheet = () => {
    setDraft(value)
    setOpen(true)
  }

  const trimmed = draft.trim()
  const matches = trimmed
    ? suggestions.filter((s) => s.name.toLowerCase().startsWith(trimmed.toLowerCase()))
    : []
  const showChips = trimmed === '' && suggestions.length > 0

  const pick = (s: ShuttleType) => {
    onChange(s.name, s.price)
    setOpen(false)
  }

  const commit = () => {
    onChange(trimmed)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={openSheet}
        className={`h-11 rounded-xl border border-gray-300 px-3 text-sm text-left truncate ${
          value ? 'text-gray-900 font-medium' : 'text-gray-400'
        } ${className}`}
      >
        {value || 'Chọn loại cầu'}
      </button>

      <Drawer.Root open={open} onOpenChange={(o: boolean) => !o && setOpen(false)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40" />
          <Drawer.Content className="fixed bottom-0 inset-x-0 z-[70] rounded-t-3xl bg-white outline-none">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="max-w-lg mx-auto p-4 pb-8">
              <Drawer.Title className="font-bold text-gray-900 mb-3 text-center">
                {label}
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                Gõ tên loại cầu hoặc chọn một loại đã dùng trước đó
              </Drawer.Description>
              <input
                autoFocus
                aria-label="Tên loại cầu"
                placeholder="Tên loại cầu (Hải Yến, Ba Sao…)"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && commit()}
                className="w-full h-12 rounded-xl border border-gray-300 px-3 text-base text-gray-900"
              />

              <AnimatePresence>
                {matches.length > 0 && (
                  <motion.div
                    key="matches"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-2 mt-3"
                  >
                    <p className="text-xs font-semibold text-gray-400 px-1">Đã dùng trước đó</p>
                    {matches.map((s) => (
                      <button
                        key={s.name}
                        type="button"
                        aria-label={`Chọn ${s.name} · ${formatVND(s.price)}`}
                        onClick={() => pick(s)}
                        className="w-full h-12 rounded-xl border border-gray-200 bg-white flex items-center gap-2 px-3 text-left"
                      >
                        <span className="font-medium text-gray-900 flex-1 truncate">{s.name}</span>
                        <span className="text-xs text-gray-400">{formatVND(s.price)}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {showChips && (
                <div className="flex flex-col gap-2 mt-3">
                  <p className="text-xs font-semibold text-gray-400 px-1">Hay dùng</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s.name}
                        type="button"
                        aria-label={`Chọn ${s.name} · ${formatVND(s.price)}`}
                        onClick={() => pick(s)}
                        className="h-11 rounded-full border border-gray-200 bg-white flex items-center gap-2 px-4"
                      >
                        <span className="text-sm font-medium text-gray-900">{s.name}</span>
                        <span className="text-xs text-gray-400">{formatVND(s.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={commit}
                className="w-full h-12 mt-4 rounded-xl bg-emerald-600 text-white text-base font-bold"
              >
                Xong
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/components/ShuttleTypeSelect.test.tsx`
Expected: PASS. Nếu vaul không render nội dung trong jsdom, kiểm tra `src/test-setup.ts` và cách `TimeSelect.test.tsx` xử lý — dùng cùng cách đó, **không** mock `vaul` riêng cho file này.

- [ ] **Step 5: Commit**

```bash
git add src/components/ShuttleTypeSelect.tsx src/components/ShuttleTypeSelect.test.tsx
git commit -m "feat: bottom sheet chọn loại cầu với gợi ý từ lịch sử"
```

---

### Task 5: Nối `ShuttleTypeSelect` vào `CostForm`

**Files:**
- Modify: `src/components/CostForm.tsx` (ô tên loại cầu), `src/App.tsx` (truyền gợi ý)
- Test: `src/components/CostForm.test.tsx`

**Interfaces:**
- Consumes: `frequentShuttleTypes` (Task 3), `ShuttleTypeSelect` (Task 4)
- Produces: `CostForm` nhận thêm prop `shuttleTypes: ShuttleType[]`

- [ ] **Step 1: Sửa test CostForm sang picker**

Trong `src/components/CostForm.test.tsx`:

- `Harness` truyền thêm prop:

```tsx
function Harness({ initial, shuttleTypes = [] }: { initial: SessionInput; shuttleTypes?: ShuttleType[] }) {
  const [input, setInput] = useState(initial)
  return (
    <CostForm
      input={input}
      shuttleTypes={shuttleTypes}
      onPatch={(p) => setInput((s) => ({ ...s, ...p }))}
    />
  )
}
```

- Test `'gõ tên loại cầu và xóa dòng'` (Task 2) đổi thành đi qua sheet:

```tsx
  test('đặt tên loại cầu qua sheet rồi xóa dòng', () => {
    render(<Harness initial={base} />)
    fireEvent.click(screen.getByRole('button', { name: 'Loại cầu 1' }))
    fireEvent.change(screen.getByLabelText('Tên loại cầu'), { target: { value: 'Hải Yến' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xong' }))

    expect(screen.getByLabelText('Số quả của Hải Yến')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xóa Hải Yến' }))
    expect(screen.getByText('150.000đ')).toBeInTheDocument()
  })
```

- thêm test gợi ý điền cả giá:

```tsx
  test('chọn gợi ý điền cả tên và giá', () => {
    render(
      <Harness
        initial={{ ...base, shuttles: [{ id: 's1', name: '', count: 2, price: 0 }] }}
        shuttleTypes={[{ name: 'Ba Sao', price: 20000 }]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Loại cầu 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chọn Ba Sao · 20.000đ' }))

    expect(screen.getByLabelText('Số quả của Ba Sao')).toBeInTheDocument()
    expect(screen.getByText('190.000đ')).toBeInTheDocument() // 40.000 cầu + 150.000 sân
  })

  test('gợi ý bỏ loại cầu đã có ở dòng khác', () => {
    render(
      <Harness
        initial={{
          ...base,
          shuttles: [
            { id: 's1', name: 'Ba Sao', count: 2, price: 20000 },
            { id: 's2', name: '', count: 0, price: 0 },
          ],
        }}
        shuttleTypes={[{ name: 'Ba Sao', price: 20000 }, { name: 'Hải Yến', price: 25000 }]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Loại cầu 2' }))
    expect(screen.queryByRole('button', { name: 'Chọn Ba Sao · 20.000đ' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chọn Hải Yến · 25.000đ' })).toBeInTheDocument()
  })
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/components/CostForm.test.tsx`
Expected: FAIL — không có nút `Loại cầu 1`.

- [ ] **Step 3: Thay ô text bằng `ShuttleTypeSelect` trong `CostForm.tsx`**

Thêm prop vào interface `Props`:

```tsx
interface Props {
  input: SessionInput
  /** Loại cầu hay dùng, đã xếp hạng sẵn bởi App (suy ra từ lịch sử). */
  shuttleTypes: ShuttleType[]
  onPatch: (p: Partial<SessionInput>) => void
}
```

Thay `<input aria-label="Tên loại cầu" … />` trong danh sách dòng cầu bằng (chú ý `map` cần chỉ số `i`):

```tsx
              <ShuttleTypeSelect
                aria-label={`Loại cầu ${i + 1}`}
                value={l.name}
                suggestions={shuttleTypes.filter(
                  (t) =>
                    !shuttles.some(
                      (o) =>
                        o.id !== l.id && o.name.trim().toLowerCase() === t.name.toLowerCase(),
                    ),
                )}
                onChange={(name, price) =>
                  patchShuttle(l.id, price === undefined ? { name } : { name, price })
                }
                className="flex-1 min-w-0"
              />
```

- [ ] **Step 4: Truyền gợi ý từ `App.tsx`**

Thêm import `frequentShuttleTypes`, tính bằng `useMemo` cạnh chỗ đang tính `frequent` cho `PlayerList`:

```ts
  const shuttleTypes = useMemo(() => frequentShuttleTypes(history, []), [history])
```

rồi truyền `shuttleTypes={shuttleTypes}` vào `<CostForm …/>`. (Việc lọc theo dòng khác do `CostForm` tự làm — `App` không cần biết.)

- [ ] **Step 5: Chạy toàn bộ test và build**

Run: `npx vitest run && npm run build`
Expected: PASS + build thành công.

- [ ] **Step 6: Commit**

```bash
git add src/components/CostForm.tsx src/components/CostForm.test.tsx src/App.tsx
git commit -m "feat: chọn loại cầu bằng bottom sheet có gợi ý"
```

---

### Task 6: README và kiểm tra cuối

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Thêm bullet vào "Tính năng chính"**

Chèn ngay **trên** mục `- **Làm tròn và quản lý số dư**`:

```markdown
- **Nhiều loại cầu trong một buổi**
  - Mỗi loại có tên, số lượng và giá riêng — tổng tiền cầu vẫn chia theo hệ số như cũ
  - Chọn loại cầu bằng bottom sheet: chip loại hay dùng, gõ để lọc, chọn xong tự điền giá lần trước
  - Lịch sử liệt kê rõ từng loại cầu đã dùng trong buổi
```

- [ ] **Step 2: Cập nhật số test case**

Chạy `npx vitest run`, đọc số test ở dòng `Tests  N passed`, rồi sửa `(194 test cases)` trong mục **Testing** của "Tech Stack" thành con số mới.

- [ ] **Step 3: Kiểm tra cuối**

Run: `npx vitest run && npm run build`
Expected: toàn bộ test PASS, build thành công, không có lỗi TypeScript.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: cập nhật README cho tính năng nhiều loại cầu"
```

---

## Merge

Sau khi cả 6 task xong và `npx vitest run && npm run build` xanh:

```bash
git checkout main
git pull --ff-only
git merge --no-ff feat/multi-shuttle-types -m "feat: nhập nhiều loại cầu với số lượng và giá riêng cho mỗi loại"
```

Subject của merge commit phải bắt đầu bằng `feat:` để workflow release tạo minor bump.
