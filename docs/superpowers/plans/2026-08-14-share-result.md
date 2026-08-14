# Chia sẻ kết quả (ảnh + text) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Share the result PNG through the OS share sheet (Web Share API, download fallback) and copy the result as text, from the result panel, fullscreen overlay, and history cards.

**Architecture:** A new pure-ish lib module `src/lib/shareResult.ts` (text formatting + share/copy orchestration, returns outcomes instead of toasting) plus a small component module `src/components/ShareButtons.tsx` (two buttons with `icon`/`wide` variants that call the lib and toast). `ResultPanel` swaps its download icon for the two new icons; `HistoryPage` adds a wide-button row in the expanded card footer.

**Tech Stack:** React 19 + TypeScript, Vitest + Testing Library (jsdom), sonner toasts, canvas rendering already in `src/lib/exportImage.ts`.

**Spec:** `docs/superpowers/specs/2026-08-14-share-result-design.md`

## Global Constraints

- Commit subjects MUST use Conventional Commit prefixes (`feat:`, `test:`, `refactor:`...) — releases are inferred from them (see CLAUDE.md).
- All UI copy is Vietnamese. Exact strings: aria-labels "Chia sẻ ảnh kết quả", "Copy kết quả"; wide-button labels "Chia sẻ ảnh", "Copy kết quả"; toasts "Đã tải ảnh kết quả", "Đã copy kết quả ✓", "Không copy được kết quả".
- The shared text and image never include tổng thu / số dư / tổng chi — per-player amounts only.
- Convert canvas → File **synchronously** (`toDataURL` + `atob`), never `toBlob`, so iOS Safari keeps the user-activation needed by `navigator.share`.
- jsdom implements neither canvas 2D, `navigator.share/canShare`, nor `navigator.clipboard` — every test touching them must stub (patterns given per task).
- Run tests with `npx vitest run <file>`; full gate is `npx vitest run` + `npm run build`.

---

### Task 1: `formatResultText` (pure text formatter)

**Files:**
- Modify: `src/lib/exportImage.ts:34` (export the currently-private `playerNote`)
- Create: `src/lib/shareResult.ts`
- Test: `src/lib/shareResult.test.ts`

**Interfaces:**
- Consumes: `playerNote(mode, p)` from `./exportImage` (make it `export function`), `formatVND` from `./format`, types `CalcResult, Mode, Player` from `./types`.
- Produces: `formatResultText(result: CalcResult, mode: Mode, dateLabel: string, players: Player[]): string` — Task 2 and component tests rely on this exact signature.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/shareResult.test.ts`:

```ts
import { formatResultText } from './shareResult'
import type { CalcResult, Mode, Player } from './types'

const player = (over: Partial<Player>): Player => ({
  id: '1', name: 'Đức', gender: 'male', halfSession: false,
  startTime: null, endTime: null, paid: false, ...over,
})

const pr = (over: Partial<CalcResult['players'][number]>): CalcResult['players'][number] => ({
  playerId: '1', name: 'Đức', gender: 'male', halfSession: false,
  hours: null, courtShare: 0, shuttleShare: 0, raw: 70000, amount: 70000, ...over,
})

const result = (players: CalcResult['players']): CalcResult => ({
  totalCost: 0, totalCollected: 0, surplus: 0, emptyHours: 0, players,
})

test('formats header, paid marks and per-player lines (ratio mode)', () => {
  const players = [
    player({ id: '1', name: 'Đức', paid: true }),
    player({ id: '2', name: 'Lan', gender: 'female', halfSession: true }),
  ]
  const r = result([
    pr({ playerId: '1', name: 'Đức', amount: 70000 }),
    pr({ playerId: '2', name: 'Lan', gender: 'female', halfSession: true, amount: 35000 }),
  ])
  expect(formatResultText(r, 'ratio' as Mode, '14/08/2026', players)).toBe(
    '🏸 Tính tiền cầu lông 14/08/2026\n' +
      '✓ Đức (Nam): 70.000đ\n' +
      '○ Lan (Nữ · ½ buổi): 35.000đ',
  )
})

test('hourly mode shows hours note', () => {
  const players = [player({ id: '1', name: 'Hùng' })]
  const r = result([pr({ playerId: '1', name: 'Hùng', hours: 1.5, amount: 52000 })])
  expect(formatResultText(r, 'hourly', '14/08/2026', players)).toBe(
    '🏸 Tính tiền cầu lông 14/08/2026\n○ Hùng (Nam · 1.5 giờ): 52.000đ',
  )
})

test('never contains totals', () => {
  const players = [player({})]
  const r = { ...result([pr({})]), totalCollected: 300000, surplus: 5000, totalCost: 295000 }
  const text = formatResultText(r, 'ratio', '14/08/2026', players)
  expect(text).not.toMatch(/[Tt]ổng/)
  expect(text).not.toMatch(/[Ss]ố dư/)
})
```

Note: `formatVND` uses `Intl.NumberFormat('vi-VN')`, whose thousands separator is `.` — `70.000đ` in the expectations above is correct.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/shareResult.test.ts`
Expected: FAIL — cannot resolve `./shareResult`.

- [ ] **Step 3: Implement**

In `src/lib/exportImage.ts` change `function playerNote(` to `export function playerNote(` (line 34).

Create `src/lib/shareResult.ts`:

```ts
import { playerNote } from './exportImage'
import { formatVND } from './format'
import type { CalcResult, Mode, Player } from './types'

/**
 * Plain-text twin of the PNG image: header + one line per player with a
 * paid mark. Deliberately excludes tổng thu / số dư / tổng chi.
 */
export function formatResultText(
  result: CalcResult,
  mode: Mode,
  dateLabel: string,
  players: Player[],
): string {
  const paidById = new Map(players.map((p) => [p.id, p.paid]))
  const lines = result.players.map((p) => {
    const mark = paidById.get(p.playerId) ? '✓' : '○'
    return `${mark} ${p.name} (${playerNote(mode, p)}): ${formatVND(p.amount)}`
  })
  return [`🏸 Tính tiền cầu lông ${dateLabel}`, ...lines].join('\n')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/shareResult.test.ts` — Expected: PASS.
Also run `npx vitest run src/lib/exportImage.test.ts` — Expected: still PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shareResult.ts src/lib/shareResult.test.ts src/lib/exportImage.ts
git commit -m "feat: text formatter for shareable results"
```

---

### Task 2: `shareResultImage` + `copyResultText` (Web Share / clipboard orchestration)

**Files:**
- Modify: `src/lib/shareResult.ts` (append)
- Test: `src/lib/shareResult.test.ts` (append)

**Interfaces:**
- Consumes: `renderResultImage`, `downloadResultImage`, `formatDateLabel`, `formatFilenameDate` from `./exportImage`; `formatResultText` from Task 1.
- Produces (Tasks 3–5 rely on these exact signatures):
  - `type ShareOutcome = 'shared' | 'cancelled' | 'downloaded'`
  - `shareResultImage(result: CalcResult, mode: Mode, players: Player[], date?: Date): Promise<ShareOutcome>`
  - `copyResultText(result: CalcResult, mode: Mode, players: Player[], date?: Date): Promise<boolean>`
  - `canvasToPngFile(canvas: HTMLCanvasElement, filename: string): File` (internal helper, exported for tests)

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/shareResult.test.ts` (add imports for the new symbols at the top: `import { canvasToPngFile, copyResultText, formatResultText, shareResultImage } from './shareResult'` and `import { vi } from 'vitest'` is unnecessary — `vi` is a global? No: this project imports nothing for `test`/`expect` (vitest globals are on), and existing tests use `vi.` directly — same here):

```ts
describe('shareResultImage / copyResultText', () => {
  // jsdom has no canvas 2D context and no toDataURL — stub both so
  // renderResultImage/canvasToPngFile run against a real HTMLCanvasElement.
  // (Same approach as the stubCanvas helper in ResultPanel.test.tsx.)
  function stubCanvas() {
    const ctx = {
      fillRect: vi.fn(), fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      scale: vi.fn(), roundRect: vi.fn(), save: vi.fn(), restore: vi.fn(),
      set fillStyle(_v: string) {}, set font(_v: string) {},
      set textAlign(_v: string) {}, set textBaseline(_v: string) {},
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      `data:image/png;base64,${btoa('fake-png')}`,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb: BlobCallback) => {
      cb(new Blob(['fake-png'], { type: 'image/png' }))
    })
  }

  // navigator.share / canShare / clipboard don't exist in jsdom; (re)define
  // per test and remove after so tests stay independent.
  function defineNav(name: 'share' | 'canShare' | 'clipboard', value: unknown) {
    Object.defineProperty(navigator, name, { value, configurable: true, writable: true })
    cleanups.push(() => {
      delete (navigator as unknown as Record<string, unknown>)[name]
    })
  }
  const cleanups: Array<() => void> = []
  afterEach(() => {
    cleanups.splice(0).forEach((fn) => fn())
    vi.restoreAllMocks()
  })

  const players = [player({ id: '1', name: 'Đức' })]
  const res = result([pr({ playerId: '1', name: 'Đức', amount: 70000 })])
  const date = new Date(2026, 7, 14)

  test('canvasToPngFile builds a PNG File synchronously from toDataURL', () => {
    stubCanvas()
    const file = canvasToPngFile(document.createElement('canvas'), 'a.png')
    expect(file.name).toBe('a.png')
    expect(file.type).toBe('image/png')
    expect(file.size).toBeGreaterThan(0)
  })

  test('shares the PNG file when navigator.canShare accepts files', async () => {
    stubCanvas()
    const share = vi.fn().mockResolvedValue(undefined)
    defineNav('canShare', vi.fn().mockReturnValue(true))
    defineNav('share', share)
    await expect(shareResultImage(res, 'ratio', players, date)).resolves.toBe('shared')
    const arg = share.mock.calls[0][0] as { files: File[]; title: string }
    expect(arg.title).toBe('Tính tiền cầu lông')
    expect(arg.files[0].name).toBe('tinh-tien-cau-long-2026-08-14.png')
  })

  test('user cancelling the share sheet resolves "cancelled" without downloading', async () => {
    stubCanvas()
    const abort = new Error('abort')
    abort.name = 'AbortError'
    defineNav('canShare', vi.fn().mockReturnValue(true))
    defineNav('share', vi.fn().mockRejectedValue(abort))
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    await expect(shareResultImage(res, 'ratio', players, date)).resolves.toBe('cancelled')
    expect(anchorClick).not.toHaveBeenCalled()
  })

  test('falls back to download when share is unsupported', async () => {
    stubCanvas()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    let downloadedFilename: string | null = null
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedFilename = this.download
    })
    // no navigator.share / canShare defined at all (jsdom default)
    await expect(shareResultImage(res, 'ratio', players, date)).resolves.toBe('downloaded')
    expect(downloadedFilename).toBe('tinh-tien-cau-long-2026-08-14.png')
  })

  test('falls back to download when share rejects with a non-abort error', async () => {
    stubCanvas()
    defineNav('canShare', vi.fn().mockReturnValue(true))
    defineNav('share', vi.fn().mockRejectedValue(new Error('NotAllowedError')))
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    await expect(shareResultImage(res, 'ratio', players, date)).resolves.toBe('downloaded')
    expect(anchorClick).toHaveBeenCalled()
  })

  test('copyResultText writes the formatted text and reports success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    defineNav('clipboard', { writeText })
    await expect(copyResultText(res, 'ratio', players, date)).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith(
      formatResultText(res, 'ratio', '14/08/2026', players),
    )
  })

  test('copyResultText reports failure when the clipboard rejects', async () => {
    defineNav('clipboard', { writeText: vi.fn().mockRejectedValue(new Error('denied')) })
    await expect(copyResultText(res, 'ratio', players, date)).resolves.toBe(false)
  })
})
```

(The `player`, `pr`, `result` helpers already exist from Task 1 — hoist them above both test groups if needed.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/shareResult.test.ts`
Expected: FAIL — `canvasToPngFile` etc. not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/shareResult.ts` (extend the existing import from `./exportImage`):

```ts
import {
  downloadResultImage,
  formatDateLabel,
  formatFilenameDate,
  playerNote,
  renderResultImage,
} from './exportImage'
```

```ts
/**
 * Synchronous canvas → File. toBlob is async and iOS Safari can drop the
 * user-activation while awaiting it, which makes navigator.share throw —
 * so decode a data URL instead.
 */
export function canvasToPngFile(canvas: HTMLCanvasElement, filename: string): File {
  const base64 = canvas.toDataURL('image/png').split(',')[1]
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new File([bytes], filename, { type: 'image/png' })
}

export type ShareOutcome = 'shared' | 'cancelled' | 'downloaded'

export async function shareResultImage(
  result: CalcResult,
  mode: Mode,
  players: Player[],
  date: Date = new Date(),
): Promise<ShareOutcome> {
  const canvas = renderResultImage(result, mode, formatDateLabel(date), players)
  const file = canvasToPngFile(canvas, `tinh-tien-cau-long-${formatFilenameDate(date)}.png`)
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Tính tiền cầu lông' })
      return 'shared'
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return 'cancelled'
      // real failure (permissions, etc.) — fall through to download
    }
  }
  downloadResultImage(result, mode, players, date)
  return 'downloaded'
}

export async function copyResultText(
  result: CalcResult,
  mode: Mode,
  players: Player[],
  date: Date = new Date(),
): Promise<boolean> {
  const text = formatResultText(result, mode, formatDateLabel(date), players)
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/shareResult.test.ts` — Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/shareResult.ts src/lib/shareResult.test.ts
git commit -m "feat: share result image via Web Share with download fallback"
```

---

### Task 3: `ShareButtons` component (icon + wide variants)

**Files:**
- Create: `src/components/ShareButtons.tsx`
- Test: `src/components/ShareButtons.test.tsx`

**Interfaces:**
- Consumes: `shareResultImage`, `copyResultText` from `../lib/shareResult` (Task 2 signatures); `toast` from `sonner`.
- Produces (Tasks 4–5 rely on these):
  - `ShareImageButton({ result, mode, players, date?, variant? })`
  - `CopyTextButton({ result, mode, players, date?, variant? })`
  - `variant`: `'icon'` (default; w-9 h-9 gray icon like the old download button) or `'wide'` (h-12 bordered full-width button with label).

- [ ] **Step 1: Write the failing tests**

Create `src/components/ShareButtons.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { CopyTextButton, ShareImageButton } from './ShareButtons'
import { copyResultText, shareResultImage } from '../lib/shareResult'
import type { CalcResult, Player } from '../lib/types'

vi.mock('../lib/shareResult', () => ({
  shareResultImage: vi.fn(),
  copyResultText: vi.fn(),
}))

const players: Player[] = [
  { id: '1', name: 'Đức', gender: 'male', halfSession: false, startTime: null, endTime: null, paid: false },
]
const result: CalcResult = {
  totalCost: 70000, totalCollected: 70000, surplus: 0, emptyHours: 0,
  players: [{ playerId: '1', name: 'Đức', gender: 'male', halfSession: false, hours: null, courtShare: 0, shuttleShare: 0, raw: 70000, amount: 70000 }],
}

afterEach(() => vi.clearAllMocks())

test('share button calls shareResultImage; toasts only on download fallback', async () => {
  const shareMock = vi.mocked(shareResultImage)
  shareMock.mockResolvedValue('shared')
  const toastSpy = vi.spyOn(toast, 'success').mockImplementation(() => '')
  render(<ShareImageButton result={result} mode="ratio" players={players} />)
  await userEvent.click(screen.getByRole('button', { name: 'Chia sẻ ảnh kết quả' }))
  await waitFor(() => expect(shareMock).toHaveBeenCalled())
  expect(toastSpy).not.toHaveBeenCalled()

  shareMock.mockResolvedValue('downloaded')
  await userEvent.click(screen.getByRole('button', { name: 'Chia sẻ ảnh kết quả' }))
  await waitFor(() => expect(toastSpy).toHaveBeenCalledWith('Đã tải ảnh kết quả'))
})

test('copy button toasts success or error from copyResultText', async () => {
  const copyMock = vi.mocked(copyResultText)
  copyMock.mockResolvedValue(true)
  const okSpy = vi.spyOn(toast, 'success').mockImplementation(() => '')
  const errSpy = vi.spyOn(toast, 'error').mockImplementation(() => '')
  render(<CopyTextButton result={result} mode="ratio" players={players} />)
  await userEvent.click(screen.getByRole('button', { name: 'Copy kết quả' }))
  await waitFor(() => expect(okSpy).toHaveBeenCalledWith('Đã copy kết quả ✓'))

  copyMock.mockResolvedValue(false)
  await userEvent.click(screen.getByRole('button', { name: 'Copy kết quả' }))
  await waitFor(() => expect(errSpy).toHaveBeenCalledWith('Không copy được kết quả'))
})

test('wide variant renders labelled buttons and forwards the date', async () => {
  const shareMock = vi.mocked(shareResultImage)
  shareMock.mockResolvedValue('shared')
  const date = new Date(2026, 7, 1)
  render(<ShareImageButton result={result} mode="ratio" players={players} date={date} variant="wide" />)
  await userEvent.click(screen.getByRole('button', { name: /Chia sẻ ảnh/ }))
  await waitFor(() =>
    expect(shareMock).toHaveBeenCalledWith(result, 'ratio', players, date),
  )
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ShareButtons.test.tsx`
Expected: FAIL — cannot resolve `./ShareButtons`.

- [ ] **Step 3: Implement**

Create `src/components/ShareButtons.tsx`:

```tsx
import { toast } from 'sonner'
import { copyResultText, shareResultImage } from '../lib/shareResult'
import type { CalcResult, Mode, Player } from '../lib/types'

interface ShareProps {
  result: CalcResult
  mode: Mode
  players: Player[]
  date?: Date
  variant?: 'icon' | 'wide'
}

const ICON_CLASS =
  'w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100'
const WIDE_CLASS =
  'w-full h-12 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold flex items-center justify-center gap-2'

function ShareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v13" />
      <path d="m16 6-4-4-4 4" />
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}

export function ShareImageButton({ result, mode, players, date, variant = 'icon' }: ShareProps) {
  const handleShare = async () => {
    const outcome = await shareResultImage(result, mode, players, date)
    // 'shared'/'cancelled' get their feedback from the OS share sheet itself
    if (outcome === 'downloaded') toast.success('Đã tải ảnh kết quả')
  }
  if (variant === 'wide') {
    return (
      <button type="button" onClick={handleShare} className={WIDE_CLASS}>
        <ShareIcon /> Chia sẻ ảnh
      </button>
    )
  }
  return (
    <button type="button" aria-label="Chia sẻ ảnh kết quả" title="Chia sẻ ảnh kết quả"
      onClick={handleShare} className={ICON_CLASS}>
      <ShareIcon />
    </button>
  )
}

export function CopyTextButton({ result, mode, players, date, variant = 'icon' }: ShareProps) {
  const handleCopy = async () => {
    const ok = await copyResultText(result, mode, players, date)
    if (ok) toast.success('Đã copy kết quả ✓')
    else toast.error('Không copy được kết quả')
  }
  if (variant === 'wide') {
    return (
      <button type="button" onClick={handleCopy} className={WIDE_CLASS}>
        <CopyIcon /> Copy kết quả
      </button>
    )
  }
  return (
    <button type="button" aria-label="Copy kết quả" title="Copy kết quả"
      onClick={handleCopy} className={ICON_CLASS}>
      <CopyIcon />
    </button>
  )
}
```

Note: the wide share button's accessible name is "Chia sẻ ảnh" (visible label) while the icon variant's is "Chia sẻ ảnh kết quả" (aria-label) — the tests above rely on this distinction.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/ShareButtons.test.tsx` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ShareButtons.tsx src/components/ShareButtons.test.tsx
git commit -m "feat: share and copy buttons component"
```

---

### Task 4: Wire into `ResultPanel` (panel header + fullscreen overlay)

**Files:**
- Modify: `src/components/ResultPanel.tsx` (remove `DownloadImageButton`, `DownloadIcon`, the `downloadResultImage` and `toast` imports if now unused; add the new buttons in both header rows)
- Modify: `src/components/ResultPanel.test.tsx` (describe block `'PNG result download'`, lines ~255–387)

**Interfaces:**
- Consumes: `ShareImageButton`, `CopyTextButton` from `./ShareButtons` (Task 3).
- Produces: nothing new — UI wiring only.

- [ ] **Step 1: Update the tests first**

In `src/components/ResultPanel.test.tsx`, rework the `describe('PNG result download', ...)` block into `describe('share / copy result', ...)`:

1. Add a `toDataURL` stub inside the existing `stubCanvas()` helper (jsdom throws on it):

```ts
vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
  `data:image/png;base64,${btoa('fake-png')}`,
)
```

2. In every test of the block, replace the button name `'Tải ảnh kết quả'` with `'Chia sẻ ảnh kết quả'`. jsdom has no `navigator.canShare`, so clicking the share button exercises the real download-fallback path — the filename and toast assertions stay valid, but the flow is now async: wrap the post-click assertions in `await waitFor(...)` and make the tests `async`. Example for the first test:

```ts
fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ ảnh kết quả' }))
await waitFor(() =>
  expect(downloadedFilename).toMatch(/^tinh-tien-cau-long-\d{4}-\d{2}-\d{2}\.png$/),
)
expect(toastSpy).toHaveBeenCalledWith('Đã tải ảnh kết quả')
```

3. The "no download button when there is no result" test asserts both new buttons are absent:

```ts
expect(screen.queryByRole('button', { name: 'Chia sẻ ảnh kết quả' })).not.toBeInTheDocument()
expect(screen.queryByRole('button', { name: 'Copy kết quả' })).not.toBeInTheDocument()
```

4. Add one new test — copy button writes the formatted text:

```ts
test('copy button writes the result text to the clipboard and toasts', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText }, configurable: true, writable: true,
  })
  const toastSpy = vi.spyOn(toast, 'success').mockImplementation(() => '')
  const result = calcRatioMode(input)
  render(
    <ResultPanel result={result} mode="ratio" errors={[]} players={input.players}
      onSave={() => {}} onNewSession={() => {}} onPatch={() => {}} />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Copy kết quả' }))
  await waitFor(() => expect(toastSpy).toHaveBeenCalledWith('Đã copy kết quả ✓'))
  expect(writeText.mock.calls[0][0]).toContain('Tuấn')
  expect(writeText.mock.calls[0][0]).toContain('🏸 Tính tiền cầu lông')
  delete (navigator as unknown as Record<string, unknown>).clipboard
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ResultPanel.test.tsx`
Expected: FAIL — no button named 'Chia sẻ ảnh kết quả'.

- [ ] **Step 3: Implement the wiring**

In `src/components/ResultPanel.tsx`:

1. Delete the `DownloadIcon` and `DownloadImageButton` components (lines ~150–194) and the now-unused `import { downloadResultImage } from '../lib/exportImage'`. Keep the `toast` import only if still used elsewhere in the file (it isn't — remove it too).
2. Add `import { CopyTextButton, ShareImageButton } from './ShareButtons'`.
3. In the main panel header (was `<DownloadImageButton result={result} mode={mode} players={players} />`):

```tsx
<div className="flex items-center gap-1">
  <ShareImageButton result={result} mode={mode} players={players} />
  <CopyTextButton result={result} mode={mode} players={players} />
  <button /* Xem toàn màn hình — unchanged */ ... >
```

4. Same replacement in the `FullscreenResult` header next to the "Đóng" button.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/ResultPanel.test.tsx` — Expected: PASS.
Also run `npx vitest run` — the smoke test renders the whole app; expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ResultPanel.tsx src/components/ResultPanel.test.tsx
git commit -m "feat: share and copy result from the result panel"
```

---

### Task 5: Share/copy row in expanded history cards

**Files:**
- Modify: `src/components/HistoryPage.tsx` (expanded-card footer, lines ~214–229)
- Test: `src/components/HistoryPage.test.tsx` (append)

**Interfaces:**
- Consumes: `ShareImageButton`, `CopyTextButton` (`variant="wide"`, `date` = `new Date(s.savedAt)`).
- Produces: nothing new — UI wiring only.

- [ ] **Step 1: Write the failing test**

Append to `src/components/HistoryPage.test.tsx` (reuse that file's existing fixture/session helpers — read the file first and follow its conventions; mock the lib, not the canvas):

```tsx
vi.mock('../lib/shareResult', () => ({
  shareResultImage: vi.fn().mockResolvedValue('shared'),
  copyResultText: vi.fn().mockResolvedValue(true),
}))
```

```tsx
test('expanded card offers share and copy using the saved date', async () => {
  const { shareResultImage } = await import('../lib/shareResult')
  render(
    <HistoryPage history={[savedSession]} onBack={() => {}} onDelete={() => {}}
      onTogglePaid={() => {}} onReuse={() => {}} />,
  )
  fireEvent.click(screen.getByText(/chi tiết/))
  fireEvent.click(screen.getByRole('button', { name: /Chia sẻ ảnh/ }))
  await waitFor(() =>
    expect(vi.mocked(shareResultImage)).toHaveBeenCalledWith(
      savedSession.result,
      savedSession.input.mode,
      savedSession.input.players,
      new Date(savedSession.savedAt),
    ),
  )
  expect(screen.getByRole('button', { name: /Copy kết quả/ })).toBeInTheDocument()
})

test('collapsed card has no share/copy buttons', () => {
  render(
    <HistoryPage history={[savedSession]} onBack={() => {}} onDelete={() => {}}
      onTogglePaid={() => {}} onReuse={() => {}} />,
  )
  expect(screen.queryByRole('button', { name: /Chia sẻ ảnh/ })).not.toBeInTheDocument()
})
```

(`savedSession` stands for whatever fixture name the file already uses — adapt to it. If the file's existing tests find the expand toggle differently, follow their pattern instead of `getByText(/chi tiết/)`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/HistoryPage.test.tsx`
Expected: the two new tests FAIL — buttons not found.

- [ ] **Step 3: Implement**

In `src/components/HistoryPage.tsx`, add `import { CopyTextButton, ShareImageButton } from './ShareButtons'` and restructure the expanded footer (currently one `div` with the two buttons) to:

```tsx
<div className="border-t border-gray-100 p-4 space-y-2">
  <div className="flex gap-2">
    <ShareImageButton result={s.result} mode={s.input.mode}
      players={s.input.players} date={new Date(s.savedAt)} variant="wide" />
    <CopyTextButton result={s.result} mode={s.input.mode}
      players={s.input.players} date={new Date(s.savedAt)} variant="wide" />
  </div>
  <div className="space-y-2 md:space-y-0 md:flex md:gap-2">
    {/* the existing "Dùng lại danh sách này cho buổi mới" and
        "Xóa buổi này" buttons, unchanged */}
  </div>
</div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/HistoryPage.test.tsx` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/HistoryPage.tsx src/components/HistoryPage.test.tsx
git commit -m "feat: share and copy past sessions from history"
```

---

### Task 6: Full verification

**Files:** none new.

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests PASS. Fix regressions if any.

- [ ] **Step 2: Typecheck + production build**

Run: `npm run build`
Expected: `tsc` clean, vite build succeeds. Common trap: TS complaining about `navigator.canShare` — it exists in the DOM lib for this TS version; if it doesn't, guard via `typeof navigator.canShare === 'function'` (already in the code) plus a local type assertion, never `any`.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address build/test issues in share feature"
```

(Skip if nothing changed.)
