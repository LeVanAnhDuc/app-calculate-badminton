# VietQR Per-Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collector enters bank account once; the app generates per-player VietQR codes (EMVCo/NAPAS, amount + memo `Cau long DD/MM Ten` pre-filled) shown in a bottom sheet and embedded in the exported PNG, closing the loop with the existing `paid` flag.

**Architecture:** Pure payload builder (`lib/vietqr.ts`) + static bank list (`lib/banks.ts`) + new localStorage key `collectorAccount` (existing guard pattern in `lib/storage.ts`). UI is one new `QRSheet` component (vaul drawer, same pattern as `TimeSelect`) opened from a QR icon button next to each player's `PaidToggle` in `ResultPanel` and `HistoryPage`. PNG export gains an optional QR grid section for unpaid players.

**Tech Stack:** React 19 + TypeScript + Vite, Tailwind 4, vaul (already installed), vitest (globals: true, jsdom), new dependency `qrcode` (+ `@types/qrcode` dev).

**Spec:** `docs/superpowers/specs/2026-08-14-vietqr-per-player-design.md`

## Global Constraints

- All user-facing copy is Vietnamese (with diacritics); QR memo content is diacritics-stripped ASCII.
- Commit subjects MUST use Conventional Commit prefixes (`feat:` / `test:` / `chore:`) — releases depend on it.
- Do NOT change the schema of `Player`, `SessionInput`, `SavedSession`, `Settings` — no migration allowed or needed.
- New localStorage key is exactly `collectorAccount`.
- Memo format is exactly `Cau long DD/MM <player name normalized>`, max 50 chars after normalization.
- `npx vitest run` and `npm run build` must pass at the end of every task.
- jsdom has no canvas 2D context: never write a test that requires a real `getContext('2d')`; mock the `qrcode` module in component tests.

---

### Task 1: VietQR payload builder (`src/lib/vietqr.ts`)

**Files:**
- Create: `src/lib/vietqr.ts`
- Test: `src/lib/vietqr.test.ts`

**Interfaces:**
- Consumes: nothing (pure module, no imports).
- Produces:
  - `crc16(s: string): string` — 4-char uppercase hex, CRC-16/CCITT-FALSE
  - `normalizeMemo(s: string): string`
  - `buildMemo(date: Date, playerName: string): string` — `"Cau long DD/MM Ten"`
  - `interface VietQRInput { bankBin: string; accountNo: string; amount: number; memo: string }`
  - `buildVietQRPayload(input: VietQRInput): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/vietqr.test.ts` (vitest globals are on — no imports of `test`/`expect` needed, matching existing tests):

```ts
import { buildMemo, buildVietQRPayload, crc16, normalizeMemo } from './vietqr'

test('crc16 matches the CRC-16/CCITT-FALSE known vector', () => {
  // Standard check value: crc of ASCII "123456789" is 0x29B1
  expect(crc16('123456789')).toBe('29B1')
})

test('normalizeMemo strips diacritics including đ/Đ', () => {
  expect(normalizeMemo('Cầu lông 14/08 Tuấn')).toBe('Cau long 14/08 Tuan')
  expect(normalizeMemo('đường Đông')).toBe('duong Dong')
})

test('normalizeMemo removes special chars and collapses spaces', () => {
  expect(normalizeMemo('Tiền #cầu   @14')).toBe('Tien cau 14')
})

test('normalizeMemo truncates to 50 chars', () => {
  expect(normalizeMemo('a'.repeat(80))).toHaveLength(50)
})

test('buildMemo formats Cau long DD/MM Name', () => {
  expect(buildMemo(new Date(2026, 7, 14), 'Tuấn')).toBe('Cau long 14/08 Tuan')
  expect(buildMemo(new Date(2026, 0, 5), 'Chị Hoa')).toBe('Cau long 05/01 Chi Hoa')
})

test('dynamic payload matches the expected EMVCo string with valid CRC', () => {
  const payload = buildVietQRPayload({
    bankBin: '970422',
    accountNo: '0011002233',
    amount: 57000,
    memo: 'Cầu lông 14/08 Tuấn',
  })
  const body = [
    '000201', // 00: version 01
    '010212', // 01: dynamic QR (amount present)
    '3854', // 38: merchant account info, length 54
    '0010A000000727', // 38-00: NAPAS AID
    '0124', // 38-01: beneficiary TLV, length 24
    '0006970422', // bank BIN
    '01100011002233', // account number
    '0208QRIBFTTA', // 38-02: transfer-to-account service
    '5303704', // 53: currency VND
    '540557000', // 54: amount
    '5802VN', // 58: country
    '6223', // 62: additional data, length 23
    '0819Cau long 14/08 Tuan', // 62-08: purpose (memo, normalized)
    '6304', // 63: CRC header
  ].join('')
  expect(payload).toBe(body + crc16(body))
})

test('amount 0 produces a static QR: type 11, no amount field', () => {
  const payload = buildVietQRPayload({
    bankBin: '970422',
    accountNo: '0011002233',
    amount: 0,
    memo: '',
  })
  const body = [
    '000201',
    '010211', // static QR
    '3854',
    '0010A000000727',
    '0124',
    '0006970422',
    '01100011002233',
    '0208QRIBFTTA',
    '5303704',
    '5802VN',
    '6304',
  ].join('')
  expect(payload).toBe(body + crc16(body))
})

test('empty memo omits field 62 entirely', () => {
  const payload = buildVietQRPayload({
    bankBin: '970422',
    accountNo: '0011002233',
    amount: 10000,
    memo: '  #@!  ', // normalizes to empty
  })
  // field 58 (VN) is immediately followed by the CRC header — no field 62 between
  expect(payload).toContain('5802VN6304')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/vietqr.test.ts`
Expected: FAIL — cannot resolve `./vietqr`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/vietqr.ts`:

```ts
/**
 * Sinh chuỗi VietQR chuẩn EMVCo merchant-presented (NAPAS IBFT to account).
 * Payload là chuỗi TLV: ID(2 số) + LEN(2 số) + VALUE, kết bằng CRC-16.
 * Hoàn toàn thuần — không phụ thuộc UI/DOM, chạy offline.
 */

export interface VietQRInput {
  bankBin: string // BIN NAPAS 6 số, vd "970422" (MB)
  accountNo: string // số tài khoản người thu
  amount: number // VND, số nguyên; 0 → QR tĩnh (bỏ field 54, người trả tự nhập)
  memo: string // nội dung CK (được normalize bên trong)
}

function tlv(id: string, value: string): string {
  return id + String(value.length).padStart(2, '0') + value
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — 4 ký tự hex in hoa. */
export function crc16(s: string): string {
  let crc = 0xffff
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Bỏ dấu tiếng Việt và ký tự lạ — nhiều app ngân hàng hiển thị sai ký tự
 * có dấu trong nội dung CK. Giữ chữ, số, khoảng trắng và / . - ; tối đa 50 ký tự.
 */
export function normalizeMemo(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // combining diacritics from NFD
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9 /.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50)
    .trim()
}

/** "Cau long DD/MM Ten" — nội dung CK chuẩn của app. */
export function buildMemo(date: Date, playerName: string): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return normalizeMemo(`Cau long ${dd}/${mm} ${playerName}`)
}

export function buildVietQRPayload({ bankBin, accountNo, amount, memo }: VietQRInput): string {
  const beneficiary = tlv('00', bankBin) + tlv('01', accountNo)
  const merchantInfo = tlv('00', 'A000000727') + tlv('01', beneficiary) + tlv('02', 'QRIBFTTA')
  const cleanMemo = normalizeMemo(memo)
  const hasAmount = amount > 0

  let body = tlv('00', '01') + tlv('01', hasAmount ? '12' : '11') + tlv('38', merchantInfo) + tlv('53', '704')
  if (hasAmount) body += tlv('54', String(Math.round(amount)))
  body += tlv('58', 'VN')
  if (cleanMemo) body += tlv('62', tlv('08', cleanMemo))
  body += '6304'
  return body + crc16(body)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/vietqr.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Run the whole suite and commit**

Run: `npx vitest run`
Expected: all green.

```bash
git add src/lib/vietqr.ts src/lib/vietqr.test.ts
git commit -m "feat: VietQR EMVCo payload builder with CRC16 and memo normalization"
```

---

### Task 2: Bank list (`src/lib/banks.ts`)

**Files:**
- Create: `src/lib/banks.ts`
- Test: `src/lib/banks.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface Bank { shortName: string; name: string; bin: string }`
  - `BANKS: Bank[]` (popular banks first)
  - `findBank(bin: string): Bank | undefined`

- [ ] **Step 1: Write the failing test**

Create `src/lib/banks.test.ts`:

```ts
import { BANKS, findBank } from './banks'

test('bank list has 40+ banks with unique 6-digit BINs', () => {
  expect(BANKS.length).toBeGreaterThanOrEqual(40)
  const bins = BANKS.map((b) => b.bin)
  expect(new Set(bins).size).toBe(bins.length)
  for (const bin of bins) expect(bin).toMatch(/^\d{6}$/)
})

test('findBank resolves well-known BINs', () => {
  expect(findBank('970436')?.shortName).toBe('Vietcombank')
  expect(findBank('970422')?.shortName).toBe('MB Bank')
  expect(findBank('000000')).toBeUndefined()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/banks.test.ts`
Expected: FAIL — cannot resolve `./banks`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/banks.ts` with exactly this list (BINs theo danh bạ NAPAS/VietQR, các bank phổ biến xếp trước):

```ts
export interface Bank {
  shortName: string
  name: string
  bin: string
}

/**
 * Danh sách ngân hàng tham gia NAPAS IBFT (VietQR chuyển tới tài khoản).
 * Maintain bằng tay để app chạy offline 100% — theo danh bạ BIN của NAPAS.
 * Ví điện tử (MoMo, ZaloPay) không thuộc VietQR-tới-tài-khoản nên không có ở đây.
 */
export const BANKS: Bank[] = [
  { shortName: 'Vietcombank', name: 'Ngân hàng TMCP Ngoại thương Việt Nam', bin: '970436' },
  { shortName: 'VietinBank', name: 'Ngân hàng TMCP Công thương Việt Nam', bin: '970415' },
  { shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', bin: '970418' },
  { shortName: 'Agribank', name: 'Ngân hàng NN&PT Nông thôn Việt Nam', bin: '970405' },
  { shortName: 'Techcombank', name: 'Ngân hàng TMCP Kỹ thương Việt Nam', bin: '970407' },
  { shortName: 'MB Bank', name: 'Ngân hàng TMCP Quân đội', bin: '970422' },
  { shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu', bin: '970416' },
  { shortName: 'VPBank', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', bin: '970432' },
  { shortName: 'TPBank', name: 'Ngân hàng TMCP Tiên Phong', bin: '970423' },
  { shortName: 'Sacombank', name: 'Ngân hàng TMCP Sài Gòn Thương Tín', bin: '970403' },
  { shortName: 'HDBank', name: 'Ngân hàng TMCP Phát triển TP.HCM', bin: '970437' },
  { shortName: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam', bin: '970441' },
  { shortName: 'SHB', name: 'Ngân hàng TMCP Sài Gòn – Hà Nội', bin: '970443' },
  { shortName: 'Eximbank', name: 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam', bin: '970431' },
  { shortName: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam', bin: '970426' },
  { shortName: 'SeABank', name: 'Ngân hàng TMCP Đông Nam Á', bin: '970440' },
  { shortName: 'OCB', name: 'Ngân hàng TMCP Phương Đông', bin: '970448' },
  { shortName: 'SCB', name: 'Ngân hàng TMCP Sài Gòn', bin: '970429' },
  { shortName: 'Nam A Bank', name: 'Ngân hàng TMCP Nam Á', bin: '970428' },
  { shortName: 'ABBANK', name: 'Ngân hàng TMCP An Bình', bin: '970425' },
  { shortName: 'PVcomBank', name: 'Ngân hàng TMCP Đại Chúng Việt Nam', bin: '970412' },
  { shortName: 'Bac A Bank', name: 'Ngân hàng TMCP Bắc Á', bin: '970409' },
  { shortName: 'VietABank', name: 'Ngân hàng TMCP Việt Á', bin: '970427' },
  { shortName: 'NCB', name: 'Ngân hàng TMCP Quốc Dân', bin: '970419' },
  { shortName: 'Saigonbank', name: 'Ngân hàng TMCP Sài Gòn Công Thương', bin: '970400' },
  { shortName: 'BaoViet Bank', name: 'Ngân hàng TMCP Bảo Việt', bin: '970438' },
  { shortName: 'VietBank', name: 'Ngân hàng TMCP Việt Nam Thương Tín', bin: '970433' },
  { shortName: 'KienlongBank', name: 'Ngân hàng TMCP Kiên Long', bin: '970452' },
  { shortName: 'LPBank', name: 'Ngân hàng TMCP Lộc Phát Việt Nam', bin: '970449' },
  { shortName: 'PGBank', name: 'Ngân hàng TMCP Thịnh vượng và Phát triển', bin: '970430' },
  { shortName: 'DongA Bank', name: 'Ngân hàng TMCP Đông Á', bin: '970406' },
  { shortName: 'GPBank', name: 'Ngân hàng TM TNHH MTV Dầu Khí Toàn Cầu', bin: '970408' },
  { shortName: 'BVBank', name: 'Ngân hàng TMCP Bản Việt', bin: '970454' },
  { shortName: 'CBBank', name: 'Ngân hàng TM TNHH MTV Xây dựng Việt Nam', bin: '970444' },
  { shortName: 'OceanBank', name: 'Ngân hàng TM TNHH MTV Đại Dương', bin: '970414' },
  { shortName: 'Co-opBank', name: 'Ngân hàng Hợp tác xã Việt Nam', bin: '970446' },
  { shortName: 'CAKE by VPBank', name: 'Ngân hàng số CAKE by VPBank', bin: '546034' },
  { shortName: 'Ubank', name: 'Ngân hàng số Ubank by VPBank', bin: '546035' },
  { shortName: 'KBank', name: 'Ngân hàng Đại chúng TNHH Kasikornbank', bin: '668888' },
  { shortName: 'Woori Bank', name: 'Ngân hàng TNHH MTV Woori Việt Nam', bin: '970457' },
  { shortName: 'Shinhan Bank', name: 'Ngân hàng TNHH MTV Shinhan Việt Nam', bin: '970424' },
  { shortName: 'Public Bank', name: 'Ngân hàng TNHH MTV Public Việt Nam', bin: '970439' },
  { shortName: 'UOB', name: 'Ngân hàng UOB Việt Nam', bin: '970458' },
  { shortName: 'CIMB', name: 'Ngân hàng TNHH MTV CIMB Việt Nam', bin: '422589' },
  { shortName: 'Indovina Bank', name: 'Ngân hàng TNHH Indovina', bin: '970434' },
  { shortName: 'VRB', name: 'Ngân hàng Liên doanh Việt – Nga', bin: '970421' },
  { shortName: 'Hong Leong Bank', name: 'Ngân hàng TNHH MTV Hong Leong Việt Nam', bin: '970442' },
  { shortName: 'Standard Chartered', name: 'Ngân hàng TNHH MTV Standard Chartered Việt Nam', bin: '970410' },
]

export function findBank(bin: string): Bank | undefined {
  return BANKS.find((b) => b.bin === bin)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/banks.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/banks.ts src/lib/banks.test.ts
git commit -m "feat: static NAPAS bank list for VietQR"
```

---

### Task 3: Collector account storage (`src/lib/storage.ts`)

**Files:**
- Modify: `src/lib/storage.ts` (add after the `Settings` section, near line 29)
- Test: `src/lib/storage.test.ts` (append)

**Interfaces:**
- Consumes: existing private helpers `load`, `save`, `isObject` in `storage.ts`.
- Produces:
  - `interface CollectorAccount { bankBin: string; accountNo: string; accountName: string }` (`accountName` may be `''`)
  - `loadCollectorAccount(): CollectorAccount | null`
  - `saveCollectorAccount(a: CollectorAccount): boolean`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/storage.test.ts` (add `loadCollectorAccount, saveCollectorAccount` to the existing import from `'./storage'`):

```ts
test('collectorAccount roundtrip; default null', () => {
  expect(loadCollectorAccount()).toBeNull()
  saveCollectorAccount({ bankBin: '970422', accountNo: '0011002233', accountName: 'NGUYEN VAN A' })
  expect(loadCollectorAccount()).toEqual({
    bankBin: '970422',
    accountNo: '0011002233',
    accountName: 'NGUYEN VAN A',
  })
})

test('collectorAccount rejects corrupt or incomplete data', () => {
  localStorage.setItem('collectorAccount', '{not json')
  expect(loadCollectorAccount()).toBeNull()
  localStorage.setItem('collectorAccount', JSON.stringify({ bankBin: '970422' }))
  expect(loadCollectorAccount()).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — no exported member `loadCollectorAccount`.

- [ ] **Step 3: Write the implementation**

In `src/lib/storage.ts`, add the interface next to `Settings` and the guard + accessors next to the other guards/accessors, following the file's existing style:

```ts
/** Tài khoản người thu tiền — nhập một lần, dùng sinh VietQR cho mọi buổi. */
export interface CollectorAccount {
  bankBin: string
  accountNo: string
  accountName: string // chỉ để hiển thị cho người trả đối chiếu; '' nếu bỏ trống
}

const isCollectorAccount = (v: unknown): boolean =>
  isObject(v) &&
  typeof v.bankBin === 'string' &&
  typeof v.accountNo === 'string' &&
  typeof v.accountName === 'string'

export const loadCollectorAccount = (): CollectorAccount | null =>
  load<CollectorAccount | null>('collectorAccount', isCollectorAccount, null)
export const saveCollectorAccount = (a: CollectorAccount): boolean => save('collectorAccount', a)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: persist collector bank account in localStorage"
```

---

### Task 4: `qrcode` dependency + `QRImage` component

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/components/QRImage.tsx`
- Test: `src/components/QRImage.test.tsx`

**Interfaces:**
- Consumes: `qrcode` package (`QRCode.toDataURL`).
- Produces: `QRImage({ payload, size?, label }: { payload: string; size?: number; label: string })` — renders `<img alt={label}>` once the data URL resolves; gray placeholder `<div>` before that. Default `size` 280 (CSS px; rendered at 2× for sharpness).

- [ ] **Step 1: Install the dependency**

Run: `npm install qrcode && npm install -D @types/qrcode`
Expected: both appear in `package.json`.

- [ ] **Step 2: Write the failing test**

Create `src/components/QRImage.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { QRImage } from './QRImage'

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,TEST') },
}))

test('renders the QR as an img once the data URL resolves', async () => {
  render(<QRImage payload="000201...6304ABCD" label="Mã VietQR cho Tuấn" />)
  await waitFor(() => {
    const img = screen.getByRole('img', { name: 'Mã VietQR cho Tuấn' })
    expect(img).toHaveAttribute('src', 'data:image/png;base64,TEST')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/QRImage.test.tsx`
Expected: FAIL — cannot resolve `./QRImage`.

- [ ] **Step 4: Write the implementation**

Create `src/components/QRImage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface Props {
  payload: string
  size?: number // CSS px
  label: string // alt text
}

/** Renders a VietQR payload as an <img> (data URL, generated at 2× for sharpness). */
export function QRImage({ payload, size = 280, label }: Props) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 2, width: size * 2 })
      .then((url) => {
        if (!cancelled) setSrc(url)
      })
      .catch(() => {
        if (!cancelled) setSrc(null)
      })
    return () => {
      cancelled = true
    }
  }, [payload, size])

  if (!src) {
    return <div style={{ width: size, height: size }} className="bg-gray-100 rounded-xl" aria-hidden />
  }
  return <img src={src} width={size} height={size} alt={label} className="rounded-xl" />
}
```

- [ ] **Step 5: Run test to verify it passes, then commit**

Run: `npx vitest run src/components/QRImage.test.tsx`
Expected: PASS.

```bash
git add package.json package-lock.json src/components/QRImage.tsx src/components/QRImage.test.tsx
git commit -m "feat: QRImage component rendering VietQR payloads via qrcode"
```

---

### Task 5: `QRSheet` component (setup form + QR view + paid button)

**Files:**
- Create: `src/components/QRSheet.tsx`
- Test: `src/components/QRSheet.test.tsx`

**Interfaces:**
- Consumes: `Drawer` from `vaul` (same portal/z-index pattern as `TimeSelect.tsx`), `QRImage` (Task 4), `BANKS`/`findBank` (Task 2), `buildMemo`/`buildVietQRPayload` (Task 1), `loadCollectorAccount`/`saveCollectorAccount`/`CollectorAccount` (Task 3), `formatVND` from `../lib/format`.
- Produces:

```ts
interface QRSheetProps {
  open: boolean
  onClose: () => void // called for drawer dismiss AND after "Đã trả"
  playerName: string
  amount: number
  memoDate: Date // today for current session; savedAt for history
  paid: boolean
  onTogglePaid: () => void
}
export function QRSheet(props: QRSheetProps): JSX.Element
```

- [ ] **Step 1: Write the failing test**

Create `src/components/QRSheet.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadCollectorAccount, saveCollectorAccount } from '../lib/storage'
import { QRSheet } from './QRSheet'

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,TEST') },
}))

beforeEach(() => localStorage.clear())

function renderSheet(over: Partial<Parameters<typeof QRSheet>[0]> = {}) {
  const onClose = vi.fn()
  const onTogglePaid = vi.fn()
  render(
    <QRSheet
      open
      onClose={onClose}
      playerName="Tuấn"
      amount={57000}
      memoDate={new Date(2026, 7, 14)}
      paid={false}
      onTogglePaid={onTogglePaid}
      {...over}
    />,
  )
  return { onClose, onTogglePaid }
}

test('first open without account shows the setup form', () => {
  renderSheet()
  expect(screen.getByPlaceholderText('Số tài khoản')).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

test('saving the form stores the account and shows the QR', async () => {
  const user = userEvent.setup()
  renderSheet()
  await user.type(screen.getByPlaceholderText('Tìm ngân hàng'), 'mb')
  await user.click(screen.getByRole('button', { name: /MB Bank/ }))
  await user.type(screen.getByPlaceholderText('Số tài khoản'), '0011002233')
  await user.type(screen.getByPlaceholderText('Tên chủ tài khoản (không bắt buộc)'), 'Nguyen Van A')
  await user.click(screen.getByRole('button', { name: 'Lưu tài khoản' }))
  expect(loadCollectorAccount()).toEqual({
    bankBin: '970422',
    accountNo: '0011002233',
    accountName: 'NGUYEN VAN A',
  })
  await waitFor(() => {
    expect(screen.getByRole('img', { name: 'Mã VietQR cho Tuấn' })).toBeInTheDocument()
  })
  expect(screen.getByText('Cau long 14/08 Tuan')).toBeInTheDocument()
  expect(screen.getByText(/MB Bank · 0011002233 · NGUYEN VAN A/)).toBeInTheDocument()
})

test('save is disabled until bank chosen and account number valid', async () => {
  const user = userEvent.setup()
  renderSheet()
  const saveBtn = screen.getByRole('button', { name: 'Lưu tài khoản' })
  expect(saveBtn).toBeDisabled()
  await user.type(screen.getByPlaceholderText('Tìm ngân hàng'), 'vietcom')
  await user.click(screen.getByRole('button', { name: /Vietcombank/ }))
  await user.type(screen.getByPlaceholderText('Số tài khoản'), 'a!') // invalid chars/too short
  expect(saveBtn).toBeDisabled()
})

test('with stored account shows QR directly, and Đã trả toggles + closes', async () => {
  saveCollectorAccount({ bankBin: '970422', accountNo: '0011002233', accountName: '' })
  const user = userEvent.setup()
  const { onClose, onTogglePaid } = renderSheet()
  await waitFor(() => {
    expect(screen.getByRole('img', { name: 'Mã VietQR cho Tuấn' })).toBeInTheDocument()
  })
  expect(screen.getByText('Sửa tài khoản')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '✓ Đã trả' }))
  expect(onTogglePaid).toHaveBeenCalledOnce()
  expect(onClose).toHaveBeenCalledOnce()
})

test('paid player gets an un-mark button instead', async () => {
  saveCollectorAccount({ bankBin: '970422', accountNo: '0011002233', accountName: '' })
  renderSheet({ paid: true })
  expect(await screen.findByRole('button', { name: 'Bỏ đánh dấu đã trả' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/QRSheet.test.tsx`
Expected: FAIL — cannot resolve `./QRSheet`.

- [ ] **Step 3: Write the implementation**

Create `src/components/QRSheet.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Drawer } from 'vaul'
import { BANKS, findBank } from '../lib/banks'
import { formatVND } from '../lib/format'
import {
  loadCollectorAccount,
  saveCollectorAccount,
  type CollectorAccount,
} from '../lib/storage'
import { buildMemo, buildVietQRPayload } from '../lib/vietqr'
import { QRImage } from './QRImage'

interface QRSheetProps {
  open: boolean
  onClose: () => void
  playerName: string
  amount: number
  memoDate: Date
  paid: boolean
  onTogglePaid: () => void
}

const ACCOUNT_NO_RE = /^[A-Za-z0-9]{4,19}$/

function AccountForm({ initial, onSaved }: { initial: CollectorAccount | null; onSaved: (a: CollectorAccount) => void }) {
  const [bankQuery, setBankQuery] = useState('')
  const [bankBin, setBankBin] = useState(initial?.bankBin ?? '')
  const [accountNo, setAccountNo] = useState(initial?.accountNo ?? '')
  const [accountName, setAccountName] = useState(initial?.accountName ?? '')

  const selectedBank = findBank(bankBin)
  const q = bankQuery.trim().toLowerCase()
  const filtered = q
    ? BANKS.filter((b) => `${b.shortName} ${b.name}`.toLowerCase().includes(q))
    : BANKS
  const valid = selectedBank !== undefined && ACCOUNT_NO_RE.test(accountNo)

  const submit = () => {
    if (!valid) return
    const account: CollectorAccount = {
      bankBin,
      accountNo,
      accountName: accountName.trim().toUpperCase(),
    }
    saveCollectorAccount(account)
    onSaved(account)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Nhập tài khoản nhận tiền một lần — app sẽ dùng cho mọi buổi sau.
      </p>
      {selectedBank ? (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
          <span className="font-semibold text-gray-900">{selectedBank.shortName}</span>
          <button type="button" className="text-sm text-emerald-700 font-semibold" onClick={() => setBankBin('')}>
            Đổi
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            placeholder="Tìm ngân hàng"
            value={bankQuery}
            onChange={(e) => setBankQuery(e.target.value)}
            className="w-full h-12 rounded-xl border border-gray-300 px-3"
          />
          <ul className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
            {filtered.map((b) => (
              <li key={b.bin}>
                <button
                  type="button"
                  onClick={() => setBankBin(b.bin)}
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50"
                >
                  <span className="font-semibold text-gray-900">{b.shortName}</span>{' '}
                  <span className="text-xs text-gray-400">{b.name}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2.5 text-sm text-gray-400">Không tìm thấy ngân hàng</li>
            )}
          </ul>
        </>
      )}
      <input
        type="text"
        inputMode="numeric"
        placeholder="Số tài khoản"
        value={accountNo}
        onChange={(e) => setAccountNo(e.target.value.trim())}
        className="w-full h-12 rounded-xl border border-gray-300 px-3"
      />
      <input
        type="text"
        placeholder="Tên chủ tài khoản (không bắt buộc)"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        className="w-full h-12 rounded-xl border border-gray-300 px-3"
      />
      <button
        type="button"
        disabled={!valid}
        onClick={submit}
        className="w-full h-12 rounded-xl bg-emerald-600 text-white font-bold disabled:bg-gray-300"
      >
        Lưu tài khoản
      </button>
    </div>
  )
}

/**
 * Bottom sheet hiển thị mã VietQR cho một người chơi. Lần đầu (chưa có tài
 * khoản người thu) hiện form thiết lập ngay trong sheet; sau đó hiện QR +
 * nút "Đã trả" để khép kín vòng chia tiền → quét → tick.
 */
export function QRSheet({ open, onClose, playerName, amount, memoDate, paid, onTogglePaid }: QRSheetProps) {
  const [account, setAccount] = useState<CollectorAccount | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (open) {
      const a = loadCollectorAccount()
      setAccount(a)
      setEditing(a === null)
    }
  }, [open])

  const memo = buildMemo(memoDate, playerName)
  const bank = account ? findBank(account.bankBin) : undefined

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o: boolean) => {
        if (!o) onClose()
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Drawer.Content className="fixed bottom-0 inset-x-0 z-[70] rounded-t-3xl bg-white outline-none">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
          <div className="max-w-lg mx-auto p-4 pb-6">
            <Drawer.Title className="font-bold text-gray-900 mb-1 text-center">
              {editing ? 'Tài khoản nhận tiền' : `Quét để trả — ${playerName}`}
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Mã VietQR để chuyển khoản tiền cầu lông
            </Drawer.Description>

            {editing || account === null ? (
              <AccountForm
                initial={account}
                onSaved={(a) => {
                  setAccount(a)
                  setEditing(false)
                }}
              />
            ) : (
              <div className="flex flex-col items-center">
                <QRImage
                  payload={buildVietQRPayload({
                    bankBin: account.bankBin,
                    accountNo: account.accountNo,
                    amount,
                    memo,
                  })}
                  label={`Mã VietQR cho ${playerName}`}
                />
                <p className="mt-3 text-2xl font-bold text-gray-900">{formatVND(amount)}</p>
                <p className="text-sm text-gray-500">{memo}</p>
                {/* one template string → one DOM text node, so getByText(regex) matches */}
                <p className="mt-2 text-xs text-gray-400">
                  {`Chuyển tới: ${bank?.shortName ?? account.bankBin} · ${account.accountNo}${
                    account.accountName ? ` · ${account.accountName}` : ''
                  }`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onTogglePaid()
                    onClose()
                  }}
                  className={`w-full h-12 mt-4 rounded-xl font-bold ${
                    paid
                      ? 'border border-gray-300 text-gray-600'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {paid ? 'Bỏ đánh dấu đã trả' : '✓ Đã trả'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="mt-2 text-sm text-gray-400 underline"
                >
                  Sửa tài khoản
                </button>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/QRSheet.test.tsx`
Expected: PASS (5 tests). If vaul warns about missing description, it's already handled via `Drawer.Description`.

- [ ] **Step 5: Run whole suite and commit**

Run: `npx vitest run`
Expected: all green.

```bash
git add src/components/QRSheet.tsx src/components/QRSheet.test.tsx
git commit -m "feat: QR sheet with one-time collector account setup"
```

---

### Task 6: QR buttons in `ResultPanel` (inline + fullscreen)

**Files:**
- Modify: `src/components/ResultPanel.tsx`
- Test: `src/components/ResultPanel.test.tsx` (append)

**Interfaces:**
- Consumes: `QRSheet` (Task 5).
- Produces: `PlayerRow` gains prop `onShowQR: () => void`; `FullscreenResult` gains prop `onShowQR: (playerId: string) => void`. No external API changes — `ResultPanel`'s public props are unchanged.

- [ ] **Step 1: Write the failing test**

The file `src/components/ResultPanel.test.tsx` already defines a shared `input: SessionInput` fixture (players `Tuấn`/`Lan`) and uses `calcRatioMode` + `fireEvent`. Add at the top of the file (after the existing imports, before the fixture):

```tsx
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,TEST') },
}))

beforeEach(() => localStorage.clear())
```

Then append this test at the end of the file:

```tsx
test('QR button opens the QR sheet; without a stored account the setup form appears', async () => {
  const result = calcRatioMode(input)
  render(
    <ResultPanel result={result} mode="ratio" errors={[]} players={input.players} onSave={() => {}}
      onNewSession={() => {}} onPatch={() => {}} />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Mã QR cho Tuấn' }))
  expect(await screen.findByPlaceholderText('Số tài khoản')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ResultPanel.test.tsx`
Expected: FAIL — no button named `Mã QR cho Tuấn`.

- [ ] **Step 3: Implement**

In `src/components/ResultPanel.tsx`:

1. Import `QRSheet`:

```tsx
import { QRSheet } from './QRSheet'
```

2. Add a `QRIcon` next to the other inline icons:

```tsx
function QRIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  )
}
```

3. `PlayerRow`: add `onShowQR: () => void` to its props and render the button just before `<PaidToggle …/>` inside the right-hand `div`:

```tsx
<button
  type="button"
  aria-label={`Mã QR cho ${p.name}`}
  title={`Mã QR cho ${p.name}`}
  onClick={onShowQR}
  className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
>
  <QRIcon />
</button>
```

4. `ResultPanel`: add state + derived player and render the sheet once at the end of the returned `<section>` (after `<AnimatePresence>`):

```tsx
const [qrPlayerId, setQrPlayerId] = useState<string | null>(null)
const qrResult = result?.players.find((p) => p.playerId === qrPlayerId) ?? null
```

```tsx
{qrResult !== null && (
  <QRSheet
    open
    onClose={() => setQrPlayerId(null)}
    playerName={qrResult.name}
    amount={qrResult.amount}
    memoDate={new Date()}
    paid={players.find((pl) => pl.id === qrResult.playerId)?.paid ?? false}
    onTogglePaid={() => handleTogglePaid(qrResult.playerId)}
  />
)}
```

5. Wire `onShowQR={() => setQrPlayerId(p.playerId)}` at both `PlayerRow` call sites (inline list and fullscreen grid). For the fullscreen grid, pass a new `onShowQR: (playerId: string) => void` prop into `FullscreenResult` and call it from its rows: `onShowQR={() => onShowQR(p.playerId)}`. The sheet itself stays mounted in `ResultPanel` — vaul's z-[60]/z-[70] layers render above the fullscreen overlay's z-50.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ResultPanel.test.tsx`
Expected: PASS (all existing + new).

- [ ] **Step 5: Run whole suite and commit**

Run: `npx vitest run`
Expected: all green.

```bash
git add src/components/ResultPanel.tsx src/components/ResultPanel.test.tsx
git commit -m "feat: per-player VietQR button in results panel"
```

---

### Task 7: QR buttons in `HistoryPage`

**Files:**
- Modify: `src/components/HistoryPage.tsx`
- Test: `src/components/HistoryPage.test.tsx` (append)

**Interfaces:**
- Consumes: `QRSheet` (Task 5). `HistoryPage`'s public props are unchanged — QR reuses the existing `onTogglePaid(sessionId, playerId)` prop.
- Produces: nothing new externally.

- [ ] **Step 1: Write the failing test**

The file `src/components/HistoryPage.test.tsx` already defines a `saved: SavedSession` fixture (id `'s1'`, `savedAt: '2026-08-13T20:15:00.000Z'`, players `Tuấn`/`Lan`) and expands cards via `fireEvent.click(screen.getByText(/2 người · 1 nam, 1 nữ/))`. Add at the top of the file (after the existing imports):

```tsx
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,TEST') },
}))

beforeEach(() => localStorage.clear())
```

Extend the existing `import type { SavedSession } from '../lib/storage'` line to also import the value `saveCollectorAccount`:

```tsx
import { saveCollectorAccount, type SavedSession } from '../lib/storage'
```

Then append this test at the end of the file:

```tsx
test('QR button in expanded session opens the sheet with the session-date memo', async () => {
  // store an account first so the sheet shows the QR view directly
  saveCollectorAccount({ bankBin: '970422', accountNo: '0011002233', accountName: '' })
  render(
    <HistoryPage history={[saved]} onBack={() => {}} onDelete={() => {}} onTogglePaid={() => {}} onReuse={() => {}} />,
  )
  fireEvent.click(screen.getByText(/2 người · 1 nam, 1 nữ/))
  fireEvent.click(screen.getByRole('button', { name: 'Mã QR cho Tuấn' }))
  // memo uses the session's savedAt (August), not today. Match the month only —
  // the exact day of '2026-08-13T20:15:00.000Z' depends on the machine timezone.
  expect(await screen.findByText(/^Cau long \d{2}\/08 Tuan$/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/HistoryPage.test.tsx`
Expected: FAIL — no button named `Mã QR cho Tuấn`.

- [ ] **Step 3: Implement**

In `src/components/HistoryPage.tsx`:

1. Imports:

```tsx
import { QRSheet } from './QRSheet'
```

2. State inside `HistoryPage`:

```tsx
const [qrTarget, setQrTarget] = useState<{ sessionId: string; playerId: string } | null>(null)
```

3. In the expanded per-player `<li>` (next to `PaidToggle`), add the QR button. Reuse the same inline `QRIcon` SVG as Task 6 — copy the component into this file (both files already duplicate small inline icons; keeping that pattern):

```tsx
<button
  type="button"
  aria-label={`Mã QR cho ${p.name}`}
  title={`Mã QR cho ${p.name}`}
  onClick={() => setQrTarget({ sessionId: s.id, playerId: p.playerId })}
  className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
>
  <QRIcon />
</button>
```

4. After the `history.map(...)` block (inside `<main>`, before the closing footer `<p>`), resolve the target and render the sheet:

```tsx
{(() => {
  if (qrTarget === null) return null
  const s = history.find((x) => x.id === qrTarget.sessionId)
  const pr = s?.result.players.find((p) => p.playerId === qrTarget.playerId)
  if (!s || !pr) return null
  const paid = s.input.players.find((pl) => pl.id === pr.playerId)?.paid ?? false
  return (
    <QRSheet
      open
      onClose={() => setQrTarget(null)}
      playerName={pr.name}
      amount={pr.amount}
      memoDate={new Date(s.savedAt)}
      paid={paid}
      onTogglePaid={() => onTogglePaid(s.id, pr.playerId)}
    />
  )
})()}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/HistoryPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run whole suite and commit**

Run: `npx vitest run`
Expected: all green.

```bash
git add src/components/HistoryPage.tsx src/components/HistoryPage.test.tsx
git commit -m "feat: VietQR buttons in history sessions"
```

---

### Task 8: QR grid in the exported PNG

**Files:**
- Modify: `src/lib/exportImage.ts`
- Modify: `src/components/ResultPanel.tsx` (async download call)
- Test: `src/lib/exportImage.test.ts` (append)

**Interfaces:**
- Consumes: `buildVietQRPayload`, `buildMemo` (Task 1), `CollectorAccount`, `loadCollectorAccount` (Task 3), `qrcode` (`QRCode.toCanvas`).
- Produces:
  - `interface QRItem { name: string; amount: number; payload: string }`
  - `buildQRItems(result: CalcResult, players: Player[], account: CollectorAccount | null, date: Date): QRItem[]` — unpaid players only; `[]` when `account` is null
  - `qrSectionHeight(count: number): number` — `0` when count is 0
  - `renderResultImage(...)` becomes `async` with new last param `qrItems: QRItem[] = []`
  - `downloadResultImage(...)` becomes `async` and loads the collector account itself

- [ ] **Step 1: Write the failing test**

In `src/lib/exportImage.test.ts`, merge the new names into the existing `./exportImage` import at the top of the file and add the type import there too, then append the fixtures + tests at the end:

```ts
// top of file: extend the existing import
import { buildQRItems, formatDateLabel, formatFilenameDate, qrSectionHeight } from './exportImage'
import type { CalcResult, Player } from './types'

const account = { bankBin: '970422', accountNo: '0011002233', accountName: '' }

const players: Player[] = [
  { id: 'a', name: 'Tuấn', gender: 'male', halfSession: false, startTime: null, endTime: null, paid: false },
  { id: 'b', name: 'Lan', gender: 'female', halfSession: false, startTime: null, endTime: null, paid: true },
]

const result = {
  totalCost: 100000,
  totalCollected: 100000,
  surplus: 0,
  emptyHours: 0,
  players: [
    { playerId: 'a', name: 'Tuấn', gender: 'male', halfSession: false, hours: null, courtShare: 0, shuttleShare: 0, raw: 57000, amount: 57000 },
    { playerId: 'b', name: 'Lan', gender: 'female', halfSession: false, hours: null, courtShare: 0, shuttleShare: 0, raw: 43000, amount: 43000 },
  ],
} as CalcResult

test('buildQRItems returns unpaid players only, with payload + session-date memo', () => {
  const items = buildQRItems(result, players, account, new Date(2026, 7, 14))
  expect(items).toHaveLength(1)
  expect(items[0].name).toBe('Tuấn')
  expect(items[0].amount).toBe(57000)
  expect(items[0].payload).toContain('970422')
  expect(items[0].payload).toContain('540557000')
  expect(items[0].payload).toContain('Cau long 14/08 Tuan')
})

test('buildQRItems returns [] without a collector account', () => {
  expect(buildQRItems(result, players, null, new Date())).toEqual([])
})

test('qrSectionHeight: 0 items → 0; 1–3 items → one row; 4 → two rows', () => {
  expect(qrSectionHeight(0)).toBe(0)
  expect(qrSectionHeight(1)).toBe(qrSectionHeight(3))
  expect(qrSectionHeight(4)).toBe(qrSectionHeight(3) + (qrSectionHeight(3) - 56))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/exportImage.test.ts`
Expected: FAIL — no exported member `buildQRItems`.

- [ ] **Step 3: Implement**

In `src/lib/exportImage.ts`:

1. New imports at top:

```ts
import QRCode from 'qrcode'
import { loadCollectorAccount, type CollectorAccount } from './storage'
import { buildMemo, buildVietQRPayload } from './vietqr'
```

2. New constants next to the existing layout constants:

```ts
const QR_COLS = 3
const QR_SIZE = 180
const QR_CELL_W = (WIDTH - PADDING * 2) / QR_COLS
const QR_CELL_H = QR_SIZE + 60 // QR + name + amount lines
const QR_TITLE_H = 56
```

3. New exports (below `formatFilenameDate`):

```ts
export interface QRItem {
  name: string
  amount: number
  payload: string
}

/** QR cho người CHƯA trả — không có tài khoản người thu thì không có QR nào. */
export function buildQRItems(
  result: CalcResult,
  players: Player[],
  account: CollectorAccount | null,
  date: Date,
): QRItem[] {
  if (!account) return []
  const paidById = new Map(players.map((p) => [p.id, p.paid]))
  return result.players
    .filter((p) => !(paidById.get(p.playerId) ?? false))
    .map((p) => ({
      name: p.name,
      amount: p.amount,
      payload: buildVietQRPayload({
        bankBin: account.bankBin,
        accountNo: account.accountNo,
        amount: p.amount,
        memo: buildMemo(date, p.name),
      }),
    }))
}

export function qrSectionHeight(count: number): number {
  if (count === 0) return 0
  return QR_TITLE_H + Math.ceil(count / QR_COLS) * QR_CELL_H
}
```

4. `renderResultImage`: change the signature to

```ts
export async function renderResultImage(
  result: CalcResult,
  mode: Mode,
  dateLabel: string,
  players: Player[],
  qrItems: QRItem[] = [],
): Promise<HTMLCanvasElement> {
```

and the height line to:

```ts
const height = HEADER_HEIGHT + rowCount * ROW_HEIGHT + qrSectionHeight(qrItems.length) + FOOTER_HEIGHT
```

After the player-rows `forEach` and before the footer block, insert:

```ts
  // QR section — "Quét QR để trả tiền" (unpaid players only)
  if (qrItems.length > 0) {
    const sectionY = HEADER_HEIGHT + rowCount * ROW_HEIGHT
    ctx.textAlign = 'left'
    ctx.fillStyle = GRAY_900
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText('Quét QR để trả tiền', PADDING, sectionY + 34)
    for (let i = 0; i < qrItems.length; i++) {
      const item = qrItems[i]
      const col = i % QR_COLS
      const row = Math.floor(i / QR_COLS)
      const cellX = PADDING + col * QR_CELL_W
      const cellY = sectionY + QR_TITLE_H + row * QR_CELL_H
      const qrCanvas = document.createElement('canvas')
      await QRCode.toCanvas(qrCanvas, item.payload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: QR_SIZE * SCALE,
      })
      ctx.drawImage(qrCanvas, cellX + (QR_CELL_W - QR_SIZE) / 2, cellY, QR_SIZE, QR_SIZE)
      ctx.textAlign = 'center'
      ctx.fillStyle = GRAY_900
      ctx.font = 'bold 16px sans-serif'
      ctx.fillText(item.name, cellX + QR_CELL_W / 2, cellY + QR_SIZE + 20)
      ctx.font = '15px sans-serif'
      ctx.fillStyle = GRAY_500
      ctx.fillText(formatVND(item.amount), cellX + QR_CELL_W / 2, cellY + QR_SIZE + 40)
    }
  }
```

(The early `if (!ctx) return canvas` stays — in jsdom there is no 2D context, so the QR-drawing loop is never reached in tests.)

5. `downloadResultImage` becomes async:

```ts
export async function downloadResultImage(
  result: CalcResult,
  mode: Mode,
  players: Player[],
  date: Date = new Date(),
): Promise<void> {
  const qrItems = buildQRItems(result, players, loadCollectorAccount(), date)
  const canvas = await renderResultImage(result, mode, formatDateLabel(date), players, qrItems)
  canvas.toBlob((blob) => {
    // ... unchanged body ...
  }, 'image/png')
}
```

6. In `src/components/ResultPanel.tsx`, update `DownloadImageButton`'s handler to await before toasting:

```tsx
const handleDownload = () => {
  void downloadResultImage(result, mode, players).then(() => toast.success('Đã tải ảnh kết quả'))
}
```

7. Update the existing `describe('PNG result download', …)` tests in `src/components/ResultPanel.test.tsx` — they assert synchronously right after `fireEvent.click`, which now races the async download. Make each of the three clicking tests `async` and wrap every post-click assertion in `waitFor`:

```tsx
fireEvent.click(screen.getByRole('button', { name: 'Tải ảnh kết quả' }))
await waitFor(() =>
  expect(downloadedFilename).toMatch(/^tinh-tien-cau-long-\d{4}-\d{2}-\d{2}\.png$/),
)
await waitFor(() => expect(toastSpy).toHaveBeenCalledWith('Đã tải ảnh kết quả'))
```

(In the mixed paid/unpaid test, keep the `expect(() => fireEvent.click(…)).not.toThrow()` line and add `await waitFor` around its filename assertion. No `drawImage` stub is needed in `stubCanvas`: these tests never store a `collectorAccount` — and the new top-of-file `beforeEach(() => localStorage.clear())` from Task 6 guarantees it — so `buildQRItems` returns `[]` and the QR-drawing loop never runs.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/exportImage.test.ts`
Expected: PASS (old date tests + 3 new).

- [ ] **Step 5: Run whole suite and commit**

Run: `npx vitest run`
Expected: all green (ResultPanel download test, if any, still passes — the toast now fires after the promise resolves; use `await waitFor(...)` if an existing assertion needs it).

```bash
git add src/lib/exportImage.ts src/lib/exportImage.test.ts src/components/ResultPanel.tsx
git commit -m "feat: embed per-player VietQR codes in exported PNG"
```

---

### Task 9: Final verification

**Files:** none new.

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 2: Typecheck + production build**

Run: `npm run build`
Expected: `tsc` clean, vite build succeeds.

- [ ] **Step 3: Manual QA note (cannot be automated)**

Run `npm run dev`, open the app, set up a real collector account, open a QR and scan it with a real Vietnamese banking app: the app must show the right beneficiary, amount, and memo. This validates the payload against real NAPAS parsing — record the result in the final report.

- [ ] **Step 4: Commit any leftovers**

Only if Steps 1–3 required fixes; use a `fix:` prefix.
