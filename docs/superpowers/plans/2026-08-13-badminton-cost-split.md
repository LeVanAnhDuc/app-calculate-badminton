# Badminton Cost-Split App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vietnamese, mobile-first React SPA that splits badminton session costs across players using two calculation modes (gender-ratio split with half-session support, and hourly court split), with localStorage persistence for roster/session/history.

**Architecture:** Pure calculation logic (`src/lib/`) is fully separated from UI and covered by Vitest unit tests keyed to the approved spec examples. UI components (`src/components/`) are presentational + controlled via a single `SessionInput` state owned by `App.tsx`, which also handles localStorage persistence and page switching (main ↔ history). No backend, no router library.

**Tech Stack:** React 18+, Vite, TypeScript (strict), Tailwind CSS v4 (`@tailwindcss/vite`), Vitest + jsdom + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-13-badminton-cost-split-design.md` — approved UI mockups in `superdesign/design_iterations/` (Court Green style; emerald accent, white cards, rounded-2xl).

## Global Constraints

- UI copy is Vietnamese, taken verbatim from the spec/mockups (e.g. "Chia theo tỉ lệ", "Sân theo giờ", "Làm tròn lên 1.000đ", "Giữ chính xác", "Lưu buổi này", "Số dư (để dành mua cầu)").
- Money formatting: dot thousand separators + "đ" suffix → `300.000đ`. All money inputs use `inputMode="numeric"` and accept/strip separators.
- Default values: hệ số nam `1.5`, nữ `1.0`; rounding `up1000`; mode `ratio`.
- Rounding option `up1000` = `Math.ceil(raw/1000)*1000`; `exact` = `Math.round(raw)` (to the đồng).
- Surplus (số dư) is hidden by default behind an eye toggle everywhere it appears; hidden state shows `•••••`; resets to hidden on app load.
- localStorage keys: `roster`, `currentSession`, `history`, `settings`. Corrupt/missing data must fall back to defaults, never crash.
- Time strings are `"HH:mm"` 24h format; overnight ranges (end ≤ start) add 24h.
- Touch targets ≥ 44px (mockups use h-11/h-12/h-14 classes).
- TypeScript strict; tests colocated as `src/lib/<name>.test.ts` and `src/components/<Name>.test.tsx`.
- Commit after every task (steps include the exact command).

---

### Task 1: Project scaffold (Vite + React + TS + Tailwind + Vitest)

**Files:**
- Create: `package.json` (via npm commands), `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/index.css`, `src/App.tsx` (placeholder), `src/test-setup.ts`, `src/smoke.test.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: working `npm run dev`, `npm test`, `npm run build`; Tailwind classes available; RTL configured. All later tasks assume these commands work.

- [ ] **Step 1: Init npm and install dependencies**

Run (project root `D:\DeleteByDuc\app-cal-badminton`):
```bash
npm init -y
npm install react react-dom
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Then edit `package.json`: set `"private": true`, `"type": "module"`, and scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Write config files**

`.gitignore`:
```
node_modules
dist
```

`vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    globals: true,
  },
})
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`index.html`:
```html
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tính tiền cầu lông</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Write src entry files**

`src/index.css`:
```css
@import "tailwindcss";

body {
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx` (placeholder, replaced in Task 10):
```tsx
export default function App() {
  return (
    <header className="bg-emerald-600 px-4 pt-8 pb-6 rounded-b-3xl">
      <h1 className="text-white text-2xl font-bold">🏸 Tính tiền cầu lông</h1>
    </header>
  )
}
```

`src/test-setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

`src/smoke.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import App from './App'

test('renders app title', () => {
  render(<App />)
  expect(screen.getByText(/Tính tiền cầu lông/)).toBeInTheDocument()
})
```

- [ ] **Step 4: Verify test and build pass**

Run: `npm test`
Expected: 1 test PASS.

Run: `npm run build`
Expected: builds `dist/` with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind + Vitest"
```

---

### Task 2: Money formatting (`src/lib/format.ts`)

**Files:**
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `formatNumber(n: number): string` — `1234567 → "1.234.567"` (rounds to integer first)
  - `formatVND(n: number): string` — `300000 → "300.000đ"`
  - `parseMoney(s: string): number` — strips all non-digits, `"" → 0`

- [ ] **Step 1: Write the failing test**

`src/lib/format.test.ts`:
```ts
import { formatNumber, formatVND, parseMoney } from './format'

test('formatNumber groups thousands with dots', () => {
  expect(formatNumber(1234567)).toBe('1.234.567')
  expect(formatNumber(0)).toBe('0')
  expect(formatNumber(999)).toBe('999')
  expect(formatNumber(78260.87)).toBe('78.261')
})

test('formatVND appends đ', () => {
  expect(formatVND(300000)).toBe('300.000đ')
  expect(formatVND(0)).toBe('0đ')
})

test('parseMoney strips separators and junk', () => {
  expect(parseMoney('25.000')).toBe(25000)
  expect(parseMoney('300000')).toBe(300000)
  expect(parseMoney('')).toBe(0)
  expect(parseMoney('abc')).toBe(0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL — cannot resolve `./format`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/format.ts`:
```ts
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n))
}

export function formatVND(n: number): string {
  return `${formatNumber(n)}đ`
}

export function parseMoney(s: string): number {
  const digits = s.replace(/\D/g, '')
  return digits ? Number(digits) : 0
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/format.test.ts`
Expected: PASS (3 tests). Note: if `formatNumber` produces `,` instead of `.` the vi-VN locale data is missing — fix by using `n.toLocaleString('vi-VN')` equivalent manual implementation: `String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: VND money formatting and parsing"
```

---

### Task 3: Time helpers (`src/lib/time.ts`)

**Files:**
- Create: `src/lib/time.ts`
- Test: `src/lib/time.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `toMinutes(hhmm: string): number` — `"19:00" → 1140`
  - `durationHours(start: string, end: string): number` — `("18:30","21:45") → 3.25`; overnight `("23:00","01:00") → 2`; equal times → `0`
  - `formatHours(h: number): string` — `2 → "2 giờ"`, `1.5 → "1.5 giờ"`, `3.25 → "3.25 giờ"`

- [ ] **Step 1: Write the failing test**

`src/lib/time.test.ts`:
```ts
import { toMinutes, durationHours, formatHours } from './time'

test('toMinutes parses HH:mm', () => {
  expect(toMinutes('19:00')).toBe(1140)
  expect(toMinutes('00:30')).toBe(30)
})

test('durationHours handles normal, fractional, overnight, zero', () => {
  expect(durationHours('19:00', '21:00')).toBe(2)
  expect(durationHours('18:30', '21:45')).toBe(3.25)
  expect(durationHours('23:00', '01:00')).toBe(2)
  expect(durationHours('19:00', '19:00')).toBe(0)
})

test('formatHours renders Vietnamese hour label', () => {
  expect(formatHours(2)).toBe('2 giờ')
  expect(formatHours(1.5)).toBe('1.5 giờ')
  expect(formatHours(3.25)).toBe('3.25 giờ')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/time.test.ts`
Expected: FAIL — cannot resolve `./time`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/time.ts`:
```ts
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function durationHours(start: string, end: string): number {
  let diff = toMinutes(end) - toMinutes(start)
  if (diff < 0) diff += 24 * 60
  return diff / 60
}

export function formatHours(h: number): string {
  const s = Number.isInteger(h) ? String(h) : h.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
  return `${s} giờ`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/time.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/time.ts src/lib/time.test.ts
git commit -m "feat: time parsing and duration helpers with overnight support"
```

---

### Task 4: Shared types + Mode 1 calculation (`src/lib/types.ts`, `src/lib/calc.ts`)

**Files:**
- Create: `src/lib/types.ts`, `src/lib/calc.ts`
- Test: `src/lib/calc.test.ts`

**Interfaces:**
- Consumes: `durationHours`, `toMinutes` from Task 3 (used in Task 5's additions to the same file)
- Produces (used by every later task):

`src/lib/types.ts` — write this file exactly:
```ts
export type Gender = 'male' | 'female'
export type Mode = 'ratio' | 'hourly'
export type Rounding = 'up1000' | 'exact'

export interface Player {
  id: string
  name: string
  gender: Gender
  halfSession: boolean          // mode 'ratio' only
  startTime: string | null      // mode 'hourly'; null = cả buổi (follows court times)
  endTime: string | null
}

export interface SessionInput {
  mode: Mode
  shuttleCount: number
  shuttlePrice: number
  courtFee: number
  courtStart: string            // "HH:mm", used in mode 'hourly'
  courtEnd: string
  maleRatio: number
  femaleRatio: number
  rounding: Rounding
  players: Player[]
}

export interface PlayerResult {
  playerId: string
  name: string
  gender: Gender
  halfSession: boolean
  hours: number | null          // null in mode 'ratio'
  courtShare: number            // raw (unrounded)
  shuttleShare: number          // raw (unrounded)
  raw: number
  amount: number                // rounded per input.rounding
}

export interface CalcResult {
  totalCost: number
  totalCollected: number
  surplus: number
  emptyHours: number            // 0 in mode 'ratio'
  players: PlayerResult[]
}
```

calc.ts exports (Task 4 implements the first three; Task 5 adds the rest):
- `roundAmount(raw: number, rounding: Rounding): number`
- `shuttleTotal(input: SessionInput): number`
- `calcRatioMode(input: SessionInput): CalcResult`

- [ ] **Step 1: Write the failing test**

`src/lib/calc.test.ts`:
```ts
import { calcRatioMode, roundAmount } from './calc'
import type { Player, SessionInput } from './types'

function player(p: Partial<Player> & Pick<Player, 'name' | 'gender'>): Player {
  return { id: p.name, halfSession: false, startTime: null, endTime: null, ...p }
}

function ratioInput(over: Partial<SessionInput> = {}): SessionInput {
  return {
    mode: 'ratio',
    shuttleCount: 6,
    shuttlePrice: 25000,
    courtFee: 150000,
    courtStart: '19:00',
    courtEnd: '21:00',
    maleRatio: 1.5,
    femaleRatio: 1.0,
    rounding: 'up1000',
    players: [
      player({ name: 'Tuấn', gender: 'male' }),
      player({ name: 'Hùng', gender: 'male' }),
      player({ name: 'Minh', gender: 'male', halfSession: true }),
      player({ name: 'Lan', gender: 'female' }),
      player({ name: 'Hoa', gender: 'female' }),
    ],
    ...over,
  }
}

test('roundAmount', () => {
  expect(roundAmount(78260.87, 'up1000')).toBe(79000)
  expect(roundAmount(78260.87, 'exact')).toBe(78261)
  expect(roundAmount(79000, 'up1000')).toBe(79000)
})

test('mode 1: approved spec example (300k, ratios 1.5/1.0, Minh half-session)', () => {
  const r = calcRatioMode(ratioInput())
  expect(r.totalCost).toBe(300000)
  expect(r.players.map((p) => p.amount)).toEqual([79000, 79000, 40000, 53000, 53000])
  expect(r.totalCollected).toBe(304000)
  expect(r.surplus).toBe(4000)
  expect(r.emptyHours).toBe(0)
})

test('mode 1: exact rounding keeps collected equal to cost for this example', () => {
  const r = calcRatioMode(ratioInput({ rounding: 'exact' }))
  expect(r.players.map((p) => p.amount)).toEqual([78261, 78261, 39130, 52174, 52174])
  expect(r.totalCollected).toBe(300000)
  expect(r.surplus).toBe(0)
})

test('mode 1: all-male group splits evenly', () => {
  const r = calcRatioMode(
    ratioInput({
      players: [player({ name: 'A', gender: 'male' }), player({ name: 'B', gender: 'male' })],
    }),
  )
  expect(r.players.map((p) => p.amount)).toEqual([150000, 150000])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/calc.test.ts`
Expected: FAIL — cannot resolve `./calc`.

- [ ] **Step 3: Write minimal implementation**

Write `src/lib/types.ts` exactly as shown in **Interfaces** above, then `src/lib/calc.ts`:
```ts
import type { CalcResult, Gender, PlayerResult, Rounding, SessionInput } from './types'

export function roundAmount(raw: number, rounding: Rounding): number {
  return rounding === 'up1000' ? Math.ceil(raw / 1000) * 1000 : Math.round(raw)
}

export function shuttleTotal(input: SessionInput): number {
  return input.shuttleCount * input.shuttlePrice
}

function ratioOf(input: SessionInput, gender: Gender): number {
  return gender === 'male' ? input.maleRatio : input.femaleRatio
}

interface Share {
  courtShare: number
  shuttleShare: number
  hours: number | null
}

function buildResult(input: SessionInput, shares: Share[], emptyHours: number): CalcResult {
  const totalCost = shuttleTotal(input) + input.courtFee
  const players: PlayerResult[] = input.players.map((p, i) => {
    const raw = shares[i].courtShare + shares[i].shuttleShare
    return {
      playerId: p.id,
      name: p.name,
      gender: p.gender,
      halfSession: p.halfSession,
      hours: shares[i].hours,
      courtShare: shares[i].courtShare,
      shuttleShare: shares[i].shuttleShare,
      raw,
      amount: roundAmount(raw, input.rounding),
    }
  })
  const totalCollected = players.reduce((s, p) => s + p.amount, 0)
  return { totalCost, totalCollected, surplus: totalCollected - totalCost, emptyHours, players }
}

export function calcRatioMode(input: SessionInput): CalcResult {
  const parts = input.players.map(
    (p) => ratioOf(input, p.gender) * (p.halfSession ? 0.5 : 1),
  )
  const totalParts = parts.reduce((a, b) => a + b, 0)
  const shuttle = shuttleTotal(input)
  const shares: Share[] = input.players.map((_, i) => ({
    courtShare: totalParts > 0 ? (input.courtFee * parts[i]) / totalParts : 0,
    shuttleShare: totalParts > 0 ? (shuttle * parts[i]) / totalParts : 0,
    hours: null,
  }))
  return buildResult(input, shares, 0)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/calc.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/calc.ts src/lib/calc.test.ts
git commit -m "feat: mode 1 ratio-split calculation with half-session"
```

---

### Task 5: Mode 2 hourly calculation + validation (extend `src/lib/calc.ts`)

**Files:**
- Modify: `src/lib/calc.ts` (append)
- Test: `src/lib/calc.test.ts` (append)

**Interfaces:**
- Consumes: `durationHours`, `toMinutes` from `./time`; types/`buildResult` from Task 4
- Produces:
  - `calcHourlyMode(input: SessionInput): CalcResult` — court fee split by played hours; idle rental time (emptyHours) split equally per head; shuttle by gender ratio (no half-session)
  - `calcSession(input: SessionInput): CalcResult` — dispatch on `input.mode`
  - `validateSession(input: SessionInput): string[]` — Vietnamese error strings; empty array = valid

- [ ] **Step 1: Write the failing tests (append to `src/lib/calc.test.ts`)**

```ts
import { calcHourlyMode, calcSession, validateSession } from './calc'

function hourlyInput(over: Partial<SessionInput> = {}): SessionInput {
  return {
    mode: 'hourly',
    shuttleCount: 6,
    shuttlePrice: 25000,
    courtFee: 300000,
    courtStart: '19:00',
    courtEnd: '21:00',
    maleRatio: 1.5,
    femaleRatio: 1.0,
    rounding: 'up1000',
    players: [
      player({ name: 'Tuấn', gender: 'male' }),
      player({ name: 'Hùng', gender: 'male' }),
      player({ name: 'Minh', gender: 'male', startTime: '20:00', endTime: '21:00' }),
      player({ name: 'Lan', gender: 'female' }),
      player({ name: 'Hoa', gender: 'female', startTime: '19:00', endTime: '20:30' }),
    ],
    ...over,
  }
}

test('mode 2: approved spec example (court 300k by hours, shuttle 150k by ratio)', () => {
  const r = calcHourlyMode(hourlyInput())
  expect(r.totalCost).toBe(450000)
  expect(r.players.map((p) => p.amount)).toEqual([106000, 106000, 70000, 94000, 77000])
  expect(r.players.map((p) => p.hours)).toEqual([2, 2, 1, 2, 1.5])
  expect(r.totalCollected).toBe(453000)
  expect(r.surplus).toBe(3000)
  expect(r.emptyHours).toBe(0)
  // breakdown shown in UI
  expect(r.players[0].courtShare).toBeCloseTo(70588.235, 2)
  expect(r.players[0].shuttleShare).toBeCloseTo(34615.385, 2)
})

test('mode 2: idle court time is split equally per head', () => {
  // court 19:00–21:00 fee 200k; both players 19:00–20:00 → 20:00–21:00 idle
  const r = calcHourlyMode(
    hourlyInput({
      courtFee: 200000,
      shuttleCount: 0,
      players: [
        player({ name: 'A', gender: 'male', startTime: '19:00', endTime: '20:00' }),
        player({ name: 'B', gender: 'male', startTime: '19:00', endTime: '20:00' }),
      ],
    }),
  )
  expect(r.emptyHours).toBe(1)
  // idle 100k split equally (50k each) + played 100k split by hours (50k each)
  expect(r.players.map((p) => p.courtShare)).toEqual([100000, 100000])
})

test('mode 2: zero-hour player pays no court time but still pays shuttle', () => {
  const r = calcHourlyMode(
    hourlyInput({
      players: [
        player({ name: 'A', gender: 'male' }),
        player({ name: 'B', gender: 'male', startTime: '19:00', endTime: '19:00' }),
      ],
    }),
  )
  expect(r.players[1].courtShare).toBe(0)
  expect(r.players[1].shuttleShare).toBe(75000)
})

test('mode 2: overnight rental', () => {
  const r = calcHourlyMode(
    hourlyInput({
      courtStart: '23:00',
      courtEnd: '01:00',
      players: [
        player({ name: 'A', gender: 'male' }),
        player({ name: 'B', gender: 'male', startTime: '23:30', endTime: '00:30' }),
      ],
    }),
  )
  expect(r.players.map((p) => p.hours)).toEqual([2, 1])
})

test('calcSession dispatches on mode', () => {
  expect(calcSession(ratioInput()).emptyHours).toBe(0)
  expect(calcSession(hourlyInput()).totalCost).toBe(450000)
})

test('validateSession catches invalid input', () => {
  expect(validateSession(ratioInput())).toEqual([])
  expect(validateSession(ratioInput({ players: [] }))).toContain('Cần ít nhất 1 người chơi')
  expect(
    validateSession(ratioInput({ shuttleCount: 0, shuttlePrice: 0, courtFee: 0 })),
  ).toContain('Tổng chi phải lớn hơn 0')
  expect(validateSession(ratioInput({ maleRatio: 0 }))).toContain('Hệ số phải lớn hơn 0')
  expect(validateSession(hourlyInput({ courtEnd: '19:00' }))).toContain(
    'Giờ thuê sân chưa hợp lệ',
  )
  expect(
    validateSession(
      hourlyInput({
        players: [player({ name: 'A', gender: 'male', startTime: '18:00', endTime: '20:00' })],
      }),
    ),
  ).toContain('Giờ chơi của A nằm ngoài giờ thuê sân')
})
```

- [ ] **Step 2: Run tests to verify new ones fail**

Run: `npx vitest run src/lib/calc.test.ts`
Expected: previous 4 PASS; new tests FAIL — `calcHourlyMode` not exported.

- [ ] **Step 3: Append implementation to `src/lib/calc.ts`**

```ts
import { durationHours, toMinutes } from './time'

/** Offset (hours) of time t from court start, wrapping midnight. */
function offsetFromCourtStart(t: string, courtStart: string): number {
  return (((toMinutes(t) - toMinutes(courtStart)) % 1440) + 1440) % 1440 / 60
}

export function calcHourlyMode(input: SessionInput): CalcResult {
  const courtHours = durationHours(input.courtStart, input.courtEnd)
  const n = input.players.length

  const intervals = input.players.map((p) => {
    const s = p.startTime ?? input.courtStart
    const e = p.endTime ?? input.courtEnd
    const start = offsetFromCourtStart(s, input.courtStart)
    return [start, start + durationHours(s, e)] as [number, number]
  })
  const hours = intervals.map(([s, e]) => e - s)
  const totalHours = hours.reduce((a, b) => a + b, 0)

  // merged coverage of player intervals
  const sorted = intervals.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0])
  let covered = 0
  let curS = 0
  let curE = -1
  for (const [s, e] of sorted) {
    if (curE < 0) {
      curS = s
      curE = e
    } else if (s > curE) {
      covered += curE - curS
      curS = s
      curE = e
    } else if (e > curE) {
      curE = e
    }
  }
  if (curE >= 0) covered += curE - curS
  const emptyHours = Math.max(0, courtHours - covered)

  const unitPrice = courtHours > 0 ? input.courtFee / courtHours : 0
  const emptyFee = unitPrice * emptyHours
  const playedFee = input.courtFee - emptyFee

  const shuttle = shuttleTotal(input)
  const totalRatio = input.players.reduce((s, p) => s + ratioOf(input, p.gender), 0)

  const shares: Share[] = input.players.map((p, i) => ({
    courtShare:
      (n > 0 ? emptyFee / n : 0) +
      (totalHours > 0 ? (playedFee * hours[i]) / totalHours : n > 0 ? playedFee / n : 0),
    shuttleShare: totalRatio > 0 ? (shuttle * ratioOf(input, p.gender)) / totalRatio : 0,
    hours: hours[i],
  }))
  return buildResult(input, shares, emptyHours)
}

export function calcSession(input: SessionInput): CalcResult {
  return input.mode === 'hourly' ? calcHourlyMode(input) : calcRatioMode(input)
}

export function validateSession(input: SessionInput): string[] {
  const errors: string[] = []
  if (input.players.length === 0) errors.push('Cần ít nhất 1 người chơi')
  if (shuttleTotal(input) + input.courtFee <= 0) errors.push('Tổng chi phải lớn hơn 0')
  if (input.maleRatio <= 0 || input.femaleRatio <= 0) errors.push('Hệ số phải lớn hơn 0')
  if (input.mode === 'hourly') {
    const courtHours = durationHours(input.courtStart, input.courtEnd)
    if (courtHours <= 0) {
      errors.push('Giờ thuê sân chưa hợp lệ')
    } else {
      for (const p of input.players) {
        if ((p.startTime === null) !== (p.endTime === null)) {
          errors.push(`Giờ chơi của ${p.name} chưa đủ 2 mốc`)
          continue
        }
        if (p.startTime !== null && p.endTime !== null) {
          const off = offsetFromCourtStart(p.startTime, input.courtStart)
          const len = durationHours(p.startTime, p.endTime)
          if (off + len > courtHours + 1e-9) {
            errors.push(`Giờ chơi của ${p.name} nằm ngoài giờ thuê sân`)
          }
        }
      }
    }
  }
  return errors
}
```

Note: `ratioOf`, `Share`, `buildResult`, `shuttleTotal` already exist in this file from Task 4 — do not redefine them.

- [ ] **Step 4: Run all lib tests to verify they pass**

Run: `npx vitest run src/lib`
Expected: PASS (all format/time/calc tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/calc.ts src/lib/calc.test.ts
git commit -m "feat: mode 2 hourly court split, session dispatch, validation"
```

---

### Task 6: localStorage persistence (`src/lib/storage.ts`)

**Files:**
- Create: `src/lib/storage.ts`
- Test: `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: types from `./types`
- Produces:
  - `interface RosterEntry { name: string; gender: Gender }`
  - `interface Settings { mode: Mode; maleRatio: number; femaleRatio: number; shuttlePrice: number; rounding: Rounding }`
  - `interface SavedSession { id: string; savedAt: string; input: SessionInput; result: CalcResult }`
  - `DEFAULT_SETTINGS: Settings` — `{ mode: 'ratio', maleRatio: 1.5, femaleRatio: 1.0, shuttlePrice: 25000, rounding: 'up1000' }`
  - `loadRoster(): RosterEntry[]` / `saveRoster(r: RosterEntry[]): void`
  - `addToRoster(roster: RosterEntry[], name: string, gender: Gender): RosterEntry[]` — dedup case-insensitive by name, updates gender
  - `loadSettings(): Settings` / `saveSettings(s: Settings): void`
  - `loadCurrentSession(): SessionInput | null` / `saveCurrentSession(s: SessionInput): void`
  - `loadHistory(): SavedSession[]` / `saveHistory(h: SavedSession[]): void`

- [ ] **Step 1: Write the failing test**

`src/lib/storage.test.ts`:
```ts
import {
  addToRoster,
  DEFAULT_SETTINGS,
  loadCurrentSession,
  loadHistory,
  loadRoster,
  loadSettings,
  saveRoster,
  saveSettings,
} from './storage'

beforeEach(() => localStorage.clear())

test('roster roundtrip and defaults', () => {
  expect(loadRoster()).toEqual([])
  saveRoster([{ name: 'Tuấn', gender: 'male' }])
  expect(loadRoster()).toEqual([{ name: 'Tuấn', gender: 'male' }])
})

test('corrupt data falls back to defaults without throwing', () => {
  localStorage.setItem('roster', '{not json')
  localStorage.setItem('settings', '"just a string"')
  localStorage.setItem('history', '42')
  localStorage.setItem('currentSession', '[]')
  expect(loadRoster()).toEqual([])
  expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  expect(loadHistory()).toEqual([])
  expect(loadCurrentSession()).toBeNull()
})

test('addToRoster dedups case-insensitively and updates gender', () => {
  let r = addToRoster([], 'Tuấn', 'male')
  r = addToRoster(r, 'tuấn', 'female')
  r = addToRoster(r, 'Lan', 'female')
  expect(r).toEqual([
    { name: 'tuấn', gender: 'female' },
    { name: 'Lan', gender: 'female' },
  ])
})

test('settings roundtrip', () => {
  saveSettings({ ...DEFAULT_SETTINGS, maleRatio: 2 })
  expect(loadSettings().maleRatio).toBe(2)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — cannot resolve `./storage`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/storage.ts`:
```ts
import type { CalcResult, Gender, Mode, Rounding, SessionInput } from './types'

export interface RosterEntry {
  name: string
  gender: Gender
}

export interface Settings {
  mode: Mode
  maleRatio: number
  femaleRatio: number
  shuttlePrice: number
  rounding: Rounding
}

export interface SavedSession {
  id: string
  savedAt: string
  input: SessionInput
  result: CalcResult
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'ratio',
  maleRatio: 1.5,
  femaleRatio: 1.0,
  shuttlePrice: 25000,
  rounding: 'up1000',
}

function load<T>(key: string, guard: (v: unknown) => boolean, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    return guard(parsed) ? (parsed as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full/unavailable — app keeps working in memory
  }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isRoster = (v: unknown): boolean =>
  Array.isArray(v) &&
  v.every(
    (e) =>
      isObject(e) && typeof e.name === 'string' && (e.gender === 'male' || e.gender === 'female'),
  )

const isSettings = (v: unknown): boolean =>
  isObject(v) &&
  (v.mode === 'ratio' || v.mode === 'hourly') &&
  typeof v.maleRatio === 'number' &&
  typeof v.femaleRatio === 'number' &&
  typeof v.shuttlePrice === 'number' &&
  (v.rounding === 'up1000' || v.rounding === 'exact')

const isSession = (v: unknown): boolean =>
  isObject(v) && (v.mode === 'ratio' || v.mode === 'hourly') && Array.isArray(v.players)

const isHistory = (v: unknown): boolean =>
  Array.isArray(v) &&
  v.every((e) => isObject(e) && typeof e.id === 'string' && isSession(e.input))

export const loadRoster = (): RosterEntry[] => load('roster', isRoster, [])
export const saveRoster = (r: RosterEntry[]): void => save('roster', r)

export function addToRoster(roster: RosterEntry[], name: string, gender: Gender): RosterEntry[] {
  const trimmed = name.trim()
  const key = trimmed.toLowerCase()
  return [...roster.filter((r) => r.name.toLowerCase() !== key), { name: trimmed, gender }]
}

export const loadSettings = (): Settings => load('settings', isSettings, DEFAULT_SETTINGS)
export const saveSettings = (s: Settings): void => save('settings', s)

export const loadCurrentSession = (): SessionInput | null =>
  load<SessionInput | null>('currentSession', isSession, null)
export const saveCurrentSession = (s: SessionInput): void => save('currentSession', s)

export const loadHistory = (): SavedSession[] => load('history', isHistory, [])
export const saveHistory = (h: SavedSession[]): void => save('history', h)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: localStorage persistence with schema guards"
```

---

### Task 7: Input controls — MoneyInput, ModeSwitch, RatioInputs, RoundingToggle, CostForm

**Files:**
- Create: `src/components/MoneyInput.tsx`, `src/components/ModeSwitch.tsx`, `src/components/RatioInputs.tsx`, `src/components/RoundingToggle.tsx`, `src/components/CostForm.tsx`
- Test: `src/components/CostForm.test.tsx`

**Interfaces:**
- Consumes: `formatNumber`, `formatVND`, `parseMoney` (Task 2); `durationHours`, `formatHours` (Task 3); `shuttleTotal` (Task 4); types (Task 4)
- Produces (App in Task 10 composes these):
  - `MoneyInput({ value, onChange, className?, 'aria-label'? })` — formatted numeric text input
  - `ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void })`
  - `RatioInputs({ maleRatio, femaleRatio, note, onChange }: { maleRatio: number; femaleRatio: number; note?: string; onChange: (p: { maleRatio?: number; femaleRatio?: number }) => void })`
  - `RoundingToggle({ rounding, onChange }: { rounding: Rounding; onChange: (r: Rounding) => void })`
  - `CostForm({ input, onPatch }: { input: SessionInput; onPatch: (p: Partial<SessionInput>) => void })` — shuttle count × price, court fee, court time range (hourly mode only), tiền cầu + TỔNG CHI rows

- [ ] **Step 1: Write the failing test**

`src/components/CostForm.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { CostForm } from './CostForm'
import type { SessionInput } from '../lib/types'

function Harness({ initial }: { initial: SessionInput }) {
  const [input, setInput] = useState(initial)
  return <CostForm input={input} onPatch={(p) => setInput((s) => ({ ...s, ...p }))} />
}

const base: SessionInput = {
  mode: 'ratio',
  shuttleCount: 6,
  shuttlePrice: 25000,
  courtFee: 150000,
  courtStart: '19:00',
  courtEnd: '21:00',
  maleRatio: 1.5,
  femaleRatio: 1,
  rounding: 'up1000',
  players: [],
}

test('shows computed shuttle money and total', () => {
  render(<Harness initial={base} />)
  expect(screen.getByText('150.000đ')).toBeInTheDocument() // tiền cầu
  expect(screen.getByText('300.000đ')).toBeInTheDocument() // TỔNG CHI
})

test('money input reformats with separators', () => {
  render(<Harness initial={base} />)
  const court = screen.getByLabelText('Tiền sân')
  fireEvent.change(court, { target: { value: '200000' } })
  expect((court as HTMLInputElement).value).toBe('200.000')
  expect(screen.getByText('350.000đ')).toBeInTheDocument()
})

test('hourly mode shows court time range and duration', () => {
  render(<Harness initial={{ ...base, mode: 'hourly' }} />)
  expect(screen.getByLabelText('Giờ bắt đầu')).toBeInTheDocument()
  expect(screen.getByText(/= 2 giờ/)).toBeInTheDocument()
})

test('ratio mode hides court time range', () => {
  render(<Harness initial={base} />)
  expect(screen.queryByLabelText('Giờ bắt đầu')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/CostForm.test.tsx`
Expected: FAIL — cannot resolve `./CostForm`.

- [ ] **Step 3: Write the components**

`src/components/MoneyInput.tsx`:
```tsx
import { formatNumber, parseMoney } from '../lib/format'

interface Props {
  value: number
  onChange: (v: number) => void
  className?: string
  'aria-label'?: string
}

export function MoneyInput({ value, onChange, className = '', ...rest }: Props) {
  return (
    <input
      inputMode="numeric"
      value={value === 0 ? '' : formatNumber(value)}
      onChange={(e) => onChange(parseMoney(e.target.value))}
      placeholder="0"
      className={`h-12 rounded-xl border border-gray-300 px-3 text-lg font-semibold text-gray-900 text-right ${className}`}
      {...rest}
    />
  )
}
```

`src/components/ModeSwitch.tsx`:
```tsx
import type { Mode } from '../lib/types'

const LABELS: Record<Mode, string> = { ratio: 'Chia theo tỉ lệ', hourly: 'Sân theo giờ' }

export function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="grid grid-cols-2 bg-white rounded-2xl shadow-sm p-1">
      {(Object.keys(LABELS) as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`h-12 rounded-xl text-sm font-semibold ${
            m === mode ? 'bg-emerald-600 text-white' : 'text-gray-500'
          }`}
        >
          {LABELS[m]}
        </button>
      ))}
    </div>
  )
}
```

`src/components/RatioInputs.tsx`:
```tsx
interface Props {
  maleRatio: number
  femaleRatio: number
  note?: string
  onChange: (p: { maleRatio?: number; femaleRatio?: number }) => void
}

export function RatioInputs({ maleRatio, femaleRatio, note, onChange }: Props) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-4">
      <h2 className="text-base font-bold text-gray-900 mb-1">Hệ số nam / nữ</h2>
      {note && <p className="text-xs text-gray-400 mb-3">{note}</p>}
      <div className="flex gap-3 mt-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1" htmlFor="ratio-male">Nam</label>
          <input
            id="ratio-male"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0.1"
            value={maleRatio}
            onChange={(e) => onChange({ maleRatio: Number(e.target.value) })}
            className="w-full h-12 rounded-xl border border-gray-300 px-3 text-lg font-semibold text-center"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1" htmlFor="ratio-female">Nữ</label>
          <input
            id="ratio-female"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0.1"
            value={femaleRatio}
            onChange={(e) => onChange({ femaleRatio: Number(e.target.value) })}
            className="w-full h-12 rounded-xl border border-gray-300 px-3 text-lg font-semibold text-center"
          />
        </div>
      </div>
    </section>
  )
}
```

`src/components/RoundingToggle.tsx`:
```tsx
import type { Rounding } from '../lib/types'

const LABELS: Record<Rounding, string> = {
  up1000: 'Làm tròn lên 1.000đ',
  exact: 'Giữ chính xác',
}

export function RoundingToggle({
  rounding,
  onChange,
}: {
  rounding: Rounding
  onChange: (r: Rounding) => void
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-4">
      <h2 className="text-base font-bold text-gray-900 mb-3">Làm tròn</h2>
      <div className="grid grid-cols-2 bg-gray-100 rounded-xl p-1">
        {(Object.keys(LABELS) as Rounding[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={`h-11 rounded-lg text-sm font-semibold ${
              r === rounding ? 'bg-emerald-600 text-white' : 'text-gray-500'
            }`}
          >
            {LABELS[r]}
          </button>
        ))}
      </div>
    </section>
  )
}
```

`src/components/CostForm.tsx`:
```tsx
import { shuttleTotal } from '../lib/calc'
import { formatVND } from '../lib/format'
import { durationHours, formatHours } from '../lib/time'
import type { SessionInput } from '../lib/types'
import { MoneyInput } from './MoneyInput'

interface Props {
  input: SessionInput
  onPatch: (p: Partial<SessionInput>) => void
}

export function CostForm({ input, onPatch }: Props) {
  const courtHours = durationHours(input.courtStart, input.courtEnd)
  return (
    <section className="bg-white rounded-2xl shadow-sm p-4">
      <h2 className="text-base font-bold text-gray-900 mb-3">Chi phí</h2>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1" htmlFor="shuttle-count">Số quả cầu</label>
          <input
            id="shuttle-count"
            inputMode="numeric"
            value={input.shuttleCount === 0 ? '' : input.shuttleCount}
            placeholder="0"
            onChange={(e) =>
              onPatch({ shuttleCount: Number(e.target.value.replace(/\D/g, '') || 0) })
            }
            className="w-full h-12 rounded-xl border border-gray-300 px-3 text-lg font-semibold text-gray-900 text-center"
          />
        </div>
        <div className="pb-3 text-gray-400 font-bold">×</div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1" htmlFor="shuttle-price">Giá / quả</label>
          <MoneyInput
            aria-label="Giá / quả"
            value={input.shuttlePrice}
            onChange={(v) => onPatch({ shuttlePrice: v })}
            className="w-full"
          />
        </div>
      </div>
      <div className="flex justify-between items-center mt-2 px-1">
        <span className="text-sm text-gray-500">Tiền cầu</span>
        <span className="text-sm font-semibold text-gray-900">{formatVND(shuttleTotal(input))}</span>
      </div>
      <div className="mt-3">
        <label className="text-xs text-gray-500 block mb-1" htmlFor="court-fee">Tiền sân</label>
        <MoneyInput
          aria-label="Tiền sân"
          value={input.courtFee}
          onChange={(v) => onPatch({ courtFee: v })}
          className="w-full"
        />
      </div>
      {input.mode === 'hourly' && (
        <div className="mt-3">
          <label className="text-xs text-gray-500 block mb-1">Giờ thuê sân</label>
          <div className="flex gap-2 items-center">
            <input
              type="time"
              aria-label="Giờ bắt đầu"
              value={input.courtStart}
              onChange={(e) => onPatch({ courtStart: e.target.value })}
              className="flex-1 h-12 rounded-xl border border-gray-300 px-3 text-lg font-semibold text-center"
            />
            <span className="text-gray-400">→</span>
            <input
              type="time"
              aria-label="Giờ kết thúc"
              value={input.courtEnd}
              onChange={(e) => onPatch({ courtEnd: e.target.value })}
              className="flex-1 h-12 rounded-xl border border-gray-300 px-3 text-lg font-semibold text-center"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            = {formatHours(courtHours)} · người chơi mặc định theo giờ này
          </p>
        </div>
      )}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
        <span className="text-sm font-bold text-gray-900">TỔNG CHI</span>
        <span className="text-xl font-bold text-emerald-600">
          {formatVND(shuttleTotal(input) + input.courtFee)}
        </span>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/CostForm.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components
git commit -m "feat: cost form and input controls"
```

---

### Task 8: PlayerList with roster suggestions, half-session, time editor

**Files:**
- Create: `src/components/PlayerList.tsx`
- Test: `src/components/PlayerList.test.tsx`

**Interfaces:**
- Consumes: types (Task 4); `RosterEntry` (Task 6); `durationHours`, `formatHours` (Task 3)
- Produces:
  - `PlayerList({ input, roster, onPatch, onAddPlayer }: { input: SessionInput; roster: RosterEntry[]; onPatch: (p: Partial<SessionInput>) => void; onAddPlayer: (name: string, gender: Gender) => void })`
  - Behavior: add via input + Nam/Nữ toggle + "Thêm" (blocks empty and case-insensitive duplicates with message "đã có trong buổi"); roster suggestions under the input (filter by prefix, excludes players already in session, click fills name+gender and adds); × removes from session only; mode `ratio` → "½ buổi" pill per row; mode `hourly` → time text per row, tap row to expand editor (2 time inputs + "Cả buổi" reset button)

- [ ] **Step 1: Write the failing test**

`src/components/PlayerList.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { PlayerList } from './PlayerList'
import type { Gender, Player, SessionInput } from '../lib/types'
import type { RosterEntry } from '../lib/storage'

function Harness({ initial, roster = [] }: { initial: SessionInput; roster?: RosterEntry[] }) {
  const [input, setInput] = useState(initial)
  const onPatch = (p: Partial<SessionInput>) => setInput((s) => ({ ...s, ...p }))
  const onAddPlayer = (name: string, gender: Gender) => {
    const player: Player = {
      id: name,
      name,
      gender,
      halfSession: false,
      startTime: null,
      endTime: null,
    }
    setInput((s) => ({ ...s, players: [...s.players, player] }))
  }
  return <PlayerList input={input} roster={roster} onPatch={onPatch} onAddPlayer={onAddPlayer} />
}

const base: SessionInput = {
  mode: 'ratio',
  shuttleCount: 6,
  shuttlePrice: 25000,
  courtFee: 150000,
  courtStart: '19:00',
  courtEnd: '21:00',
  maleRatio: 1.5,
  femaleRatio: 1,
  rounding: 'up1000',
  players: [
    { id: '1', name: 'Tuấn', gender: 'male', halfSession: false, startTime: null, endTime: null },
  ],
}

test('adds a player and blocks duplicates', () => {
  render(<Harness initial={base} />)
  const nameInput = screen.getByPlaceholderText('Tên người chơi')
  fireEvent.change(nameInput, { target: { value: 'Lan' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  expect(screen.getByText('Lan')).toBeInTheDocument()

  fireEvent.change(nameInput, { target: { value: 'tuấn' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  expect(screen.getByText(/đã có trong buổi/)).toBeInTheDocument()
})

test('remove button removes from session', () => {
  render(<Harness initial={base} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa Tuấn' }))
  expect(screen.queryByText('Tuấn')).not.toBeInTheDocument()
})

test('half-session pill toggles in ratio mode', () => {
  render(<Harness initial={base} />)
  const pill = screen.getByRole('button', { name: '½ buổi Tuấn' })
  fireEvent.click(pill)
  expect(screen.getByText('½ buổi ✓')).toBeInTheDocument()
})

test('roster suggestion fills name and gender', () => {
  render(<Harness initial={base} roster={[{ name: 'Hoa', gender: 'female' }]} />)
  const nameInput = screen.getByPlaceholderText('Tên người chơi')
  fireEvent.change(nameInput, { target: { value: 'h' } })
  fireEvent.click(screen.getByRole('button', { name: /Hoa · Nữ/ }))
  expect(screen.getByText('Hoa')).toBeInTheDocument()
})

test('hourly mode shows default time and expands editor', () => {
  render(<Harness initial={{ ...base, mode: 'hourly' }} />)
  expect(screen.getByText(/19:00–21:00 · cả buổi/)).toBeInTheDocument()
  fireEvent.click(screen.getByText('Tuấn'))
  expect(screen.getByLabelText('Giờ vào của Tuấn')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PlayerList.test.tsx`
Expected: FAIL — cannot resolve `./PlayerList`.

- [ ] **Step 3: Write the component**

`src/components/PlayerList.tsx`:
```tsx
import { useState } from 'react'
import type { RosterEntry } from '../lib/storage'
import { durationHours, formatHours } from '../lib/time'
import type { Gender, Player, SessionInput } from '../lib/types'

interface Props {
  input: SessionInput
  roster: RosterEntry[]
  onPatch: (p: Partial<SessionInput>) => void
  onAddPlayer: (name: string, gender: Gender) => void
}

export function PlayerList({ input, roster, onPatch, onAddPlayer }: Props) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const males = input.players.filter((p) => p.gender === 'male').length
  const females = input.players.length - males

  const inSession = (n: string) =>
    input.players.some((p) => p.name.toLowerCase() === n.trim().toLowerCase())

  const suggestions = name.trim()
    ? roster.filter(
        (r) => r.name.toLowerCase().startsWith(name.trim().toLowerCase()) && !inSession(r.name),
      )
    : []

  const add = (n: string, g: Gender) => {
    const trimmed = n.trim()
    if (!trimmed) return
    if (inSession(trimmed)) {
      setError(`"${trimmed}" đã có trong buổi`)
      return
    }
    setError('')
    setName('')
    onAddPlayer(trimmed, g)
  }

  const updatePlayer = (id: string, patch: Partial<Player>) =>
    onPatch({ players: input.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) })

  const removePlayer = (id: string) =>
    onPatch({ players: input.players.filter((p) => p.id !== id) })

  const timeLabel = (p: Player) => {
    const s = p.startTime ?? input.courtStart
    const e = p.endTime ?? input.courtEnd
    const full = p.startTime === null && p.endTime === null
    return `${s}–${e} · ${full ? 'cả buổi' : formatHours(durationHours(s, e))}`
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-bold text-gray-900">Người chơi</h2>
        <span className="text-xs font-semibold text-white bg-emerald-600 rounded-full px-2.5 py-1">
          {males} nam · {females} nữ
        </span>
      </div>

      <div className="flex gap-2">
        <input
          placeholder="Tên người chơi"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && add(name, gender)}
          className="flex-1 min-w-0 h-12 rounded-xl border border-gray-300 px-3 text-base"
        />
        <div className="flex rounded-xl border border-gray-300 overflow-hidden shrink-0">
          {(['male', 'female'] as Gender[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`h-12 px-3 text-sm font-semibold ${
                gender === g ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500'
              }`}
            >
              {g === 'male' ? 'Nam' : 'Nữ'}
            </button>
          ))}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {suggestions.slice(0, 6).map((r) => (
            <button
              key={r.name}
              type="button"
              onClick={() => add(r.name, r.gender)}
              className="h-9 px-3 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium"
            >
              {r.name} · {r.gender === 'male' ? 'Nam' : 'Nữ'}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      <button
        type="button"
        onClick={() => add(name, gender)}
        className="w-full h-12 mt-2 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-600 font-semibold text-sm"
      >
        + Thêm người chơi
      </button>

      <ul className="mt-3 divide-y divide-gray-100">
        {input.players.map((p) => (
          <li key={p.id} className="py-2.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="flex items-center gap-2 text-left"
                onClick={() =>
                  input.mode === 'hourly' && setExpandedId(expandedId === p.id ? null : p.id)
                }
              >
                <span
                  className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center ${
                    p.gender === 'male'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-pink-100 text-pink-700'
                  }`}
                >
                  {p.gender === 'male' ? 'N' : 'Nữ'}
                </span>
                <span>
                  <span className="font-medium text-gray-900 block">{p.name}</span>
                  {input.mode === 'hourly' && (
                    <span
                      className={`text-xs ${
                        p.startTime === null ? 'text-gray-400' : 'font-semibold text-emerald-700'
                      }`}
                    >
                      {timeLabel(p)}
                    </span>
                  )}
                </span>
              </button>
              <div className="flex items-center gap-1">
                {input.mode === 'ratio' && (
                  <button
                    type="button"
                    aria-label={`½ buổi ${p.name}`}
                    onClick={() => updatePlayer(p.id, { halfSession: !p.halfSession })}
                    className={`h-8 px-2.5 rounded-full text-xs font-semibold ${
                      p.halfSession
                        ? 'bg-emerald-600 text-white'
                        : 'border border-gray-200 text-gray-400'
                    }`}
                  >
                    {p.halfSession ? '½ buổi ✓' : '½ buổi'}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Xóa ${p.name}`}
                  onClick={() => removePlayer(p.id)}
                  className="w-8 h-8 text-gray-300 text-xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            {input.mode === 'hourly' && expandedId === p.id && (
              <div className="flex gap-2 items-center mt-2">
                <input
                  type="time"
                  aria-label={`Giờ vào của ${p.name}`}
                  value={p.startTime ?? input.courtStart}
                  onChange={(e) =>
                    updatePlayer(p.id, {
                      startTime: e.target.value,
                      endTime: p.endTime ?? input.courtEnd,
                    })
                  }
                  className="flex-1 h-11 rounded-xl border border-emerald-300 bg-white px-2 text-base font-semibold text-center"
                />
                <span className="text-gray-400">→</span>
                <input
                  type="time"
                  aria-label={`Giờ ra của ${p.name}`}
                  value={p.endTime ?? input.courtEnd}
                  onChange={(e) =>
                    updatePlayer(p.id, {
                      endTime: e.target.value,
                      startTime: p.startTime ?? input.courtStart,
                    })
                  }
                  className="flex-1 h-11 rounded-xl border border-emerald-300 bg-white px-2 text-base font-semibold text-center"
                />
                <button
                  type="button"
                  onClick={() => updatePlayer(p.id, { startTime: null, endTime: null })}
                  className="h-11 px-3 rounded-xl bg-white border border-emerald-300 text-emerald-700 text-xs font-semibold whitespace-nowrap"
                >
                  Cả buổi
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {input.mode === 'hourly' && (
        <p className="text-xs text-gray-400 mt-2">
          Bấm vào tên để sửa giờ chơi của người đến muộn / về sớm
        </p>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/PlayerList.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/PlayerList.tsx src/components/PlayerList.test.tsx
git commit -m "feat: player list with roster suggestions, half-session and time editor"
```

---

### Task 9: ResultPanel with hidden surplus

**Files:**
- Create: `src/components/ResultPanel.tsx`, `src/components/EyeButton.tsx`
- Test: `src/components/ResultPanel.test.tsx`

**Interfaces:**
- Consumes: `CalcResult`, `Mode` (Task 4); `formatVND`, `formatNumber` (Task 2); `formatHours` (Task 3)
- Produces:
  - `EyeButton({ shown, onToggle }: { shown: boolean; onToggle: () => void })` — eye/eye-off SVG icon button, `aria-label` "Hiện số dư" / "Ẩn số dư" (reused by HistoryPage)
  - `SurplusRow({ surplus }: { surplus: number })` (exported from ResultPanel.tsx) — "Số dư (để dành mua cầu)" row, hidden by default (`•••••`), toggled by EyeButton; shows `+4.000đ` style sign (reused by HistoryPage)
  - `ResultPanel({ result, mode, errors, onSave }: { result: CalcResult | null; mode: Mode; errors: string[]; onSave: () => void })` — per-player rows (`½ buổi` note in ratio mode; hours + `sân X + cầu Y` breakdown in hourly mode), tổng thu, surplus row, idle-hours warning, "Lưu buổi này" button (disabled when result null); when result null shows the error list instead

- [ ] **Step 1: Write the failing test**

`src/components/ResultPanel.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultPanel } from './ResultPanel'
import { calcRatioMode } from '../lib/calc'
import type { SessionInput } from '../lib/types'

const input: SessionInput = {
  mode: 'ratio',
  shuttleCount: 6,
  shuttlePrice: 25000,
  courtFee: 150000,
  courtStart: '19:00',
  courtEnd: '21:00',
  maleRatio: 1.5,
  femaleRatio: 1,
  rounding: 'up1000',
  players: [
    { id: '1', name: 'Tuấn', gender: 'male', halfSession: false, startTime: null, endTime: null },
    { id: '2', name: 'Lan', gender: 'female', halfSession: false, startTime: null, endTime: null },
  ],
}

test('shows per-player amounts and total collected', () => {
  const result = calcRatioMode(input)
  render(<ResultPanel result={result} mode="ratio" errors={[]} onSave={() => {}} />)
  expect(screen.getByText('180.000đ')).toBeInTheDocument() // Tuấn: 300k×1.5/2.5
  expect(screen.getByText('120.000đ')).toBeInTheDocument() // Lan
  expect(screen.getByText('300.000đ')).toBeInTheDocument() // tổng thu
})

test('surplus hidden behind eye toggle by default', () => {
  const result = calcRatioMode({ ...input, courtFee: 151000 })
  render(<ResultPanel result={result} mode="ratio" errors={[]} onSave={() => {}} />)
  expect(screen.getByText('•••••')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Hiện số dư' }))
  expect(screen.queryByText('•••••')).not.toBeInTheDocument()
  expect(screen.getByText(/\+\d/)).toBeInTheDocument()
})

test('shows errors and disables save when result is null', () => {
  render(
    <ResultPanel result={null} mode="ratio" errors={['Cần ít nhất 1 người chơi']} onSave={() => {}} />,
  )
  expect(screen.getByText('Cần ít nhất 1 người chơi')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Lưu buổi này' })).toBeDisabled()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ResultPanel.test.tsx`
Expected: FAIL — cannot resolve `./ResultPanel`.

- [ ] **Step 3: Write the components**

`src/components/EyeButton.tsx`:
```tsx
export function EyeButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={shown ? 'Ẩn số dư' : 'Hiện số dư'}
      onClick={onToggle}
      className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {shown ? (
          <>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </>
        ) : (
          <>
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" x2="22" y1="2" y2="22" />
          </>
        )}
      </svg>
    </button>
  )
}
```

`src/components/ResultPanel.tsx`:
```tsx
import { useState } from 'react'
import { formatNumber, formatVND } from '../lib/format'
import { formatHours } from '../lib/time'
import type { CalcResult, Mode } from '../lib/types'
import { EyeButton } from './EyeButton'

export function SurplusRow({ surplus }: { surplus: number }) {
  const [shown, setShown] = useState(false)
  const sign = surplus >= 0 ? '+' : '−'
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">Số dư (để dành mua cầu)</span>
      <span className="flex items-center gap-1">
        <span className="font-semibold text-emerald-600 tracking-wider">
          {shown ? `${sign}${formatVND(Math.abs(surplus))}` : '•••••'}
        </span>
        <EyeButton shown={shown} onToggle={() => setShown(!shown)} />
      </span>
    </div>
  )
}

interface Props {
  result: CalcResult | null
  mode: Mode
  errors: string[]
  onSave: () => void
}

export function ResultPanel({ result, mode, errors, onSave }: Props) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-4 border-2 border-emerald-100">
      <h2 className="text-base font-bold text-gray-900 mb-3">Kết quả</h2>

      {result === null ? (
        <ul className="space-y-1">
          {errors.map((e) => (
            <li key={e} className="text-sm text-amber-600">
              {e}
            </li>
          ))}
        </ul>
      ) : (
        <>
          {mode === 'hourly' && result.emptyHours > 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-2">
              Có {formatHours(result.emptyHours)} sân thuê không ai chơi — phần này được chia đều.
            </p>
          )}
          <ul className="space-y-2">
            {result.players.map((p) => (
              <li
                key={p.playerId}
                className="flex justify-between items-center bg-gray-50 rounded-xl px-3 py-2.5"
              >
                <div>
                  <span className="font-medium text-gray-900 block">
                    {p.name}{' '}
                    <span className="text-xs text-gray-400">
                      ({p.gender === 'male' ? 'Nam' : 'Nữ'}
                      {mode === 'ratio' && p.halfSession ? ' · ½ buổi' : ''}
                      {mode === 'hourly' && p.hours !== null ? ` · ${formatHours(p.hours)}` : ''})
                    </span>
                  </span>
                  {mode === 'hourly' && (
                    <span className="text-xs text-gray-400">
                      sân {formatNumber(p.courtShare)} + cầu {formatNumber(p.shuttleShare)}
                    </span>
                  )}
                </div>
                <span className="font-bold text-gray-900">{formatVND(p.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tổng thu</span>
              <span className="font-semibold text-gray-900">{formatVND(result.totalCollected)}</span>
            </div>
            <SurplusRow surplus={result.surplus} />
          </div>
        </>
      )}

      <button
        type="button"
        disabled={result === null}
        onClick={onSave}
        className="w-full h-14 mt-4 rounded-2xl bg-emerald-600 text-white text-base font-bold shadow-md disabled:bg-gray-300"
      >
        Lưu buổi này
      </button>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ResultPanel.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ResultPanel.tsx src/components/EyeButton.tsx src/components/ResultPanel.test.tsx
git commit -m "feat: result panel with hidden surplus eye toggle"
```

---

### Task 10: App main page — composition + persistence

**Files:**
- Modify: `src/App.tsx` (replace placeholder)
- Modify: `src/smoke.test.tsx` (extend)

**Interfaces:**
- Consumes: everything above
- Produces:
  - `App` renders the main page (mobile 1-column): header → ModeSwitch → CostForm → RatioInputs (note "Chỉ áp dụng cho tiền cầu — tiền sân chia theo giờ chơi" in hourly mode) → PlayerList → RoundingToggle → ResultPanel → link "Xem lịch sử các buổi →"
  - State: `SessionInput` initialized from `loadCurrentSession() ?? defaults(loadSettings())`; roster and history loaded on mount; every session change auto-saves `currentSession` and `settings`; roster/history saved when changed
  - `handleSave`: pushes `SavedSession` (`crypto.randomUUID()`, `new Date().toISOString()`) to front of history, adds all players to roster
  - `handleAddPlayer(name, gender)`: appends `Player` with `crypto.randomUUID()` id + adds to roster
  - Page switching state `'main' | 'history'` (HistoryPage rendered in Task 11 — for now the link switches page to a stub `<div>Lịch sử</div>`)

- [ ] **Step 1: Extend the smoke test (replace `src/smoke.test.tsx`)**

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

beforeEach(() => localStorage.clear())

test('full flow: add players, see results, save session persists to history', () => {
  render(<App />)
  // costs: 6 shuttles ×25k default price, court 150k
  fireEvent.change(screen.getByLabelText('Số quả cầu'), { target: { value: '6' } })
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '150000' } })
  // players
  const nameInput = screen.getByPlaceholderText('Tên người chơi')
  fireEvent.change(nameInput, { target: { value: 'Tuấn' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  fireEvent.click(screen.getByRole('button', { name: 'Nữ' }))
  fireEvent.change(nameInput, { target: { value: 'Lan' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  // results appear (300k, ratios 1.5/1 → 180k / 120k)
  expect(screen.getByText('180.000đ')).toBeInTheDocument()
  expect(screen.getByText('120.000đ')).toBeInTheDocument()
  // save
  fireEvent.click(screen.getByRole('button', { name: 'Lưu buổi này' }))
  expect(JSON.parse(localStorage.getItem('history')!)).toHaveLength(1)
  expect(JSON.parse(localStorage.getItem('roster')!)).toHaveLength(2)
})

test('session state is restored from localStorage', () => {
  const { unmount } = render(<App />)
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '999000' } })
  unmount()
  render(<App />)
  expect(screen.getByLabelText('Tiền sân')).toHaveValue('999.000')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/smoke.test.tsx`
Expected: FAIL — App is still the placeholder header.

- [ ] **Step 3: Write App**

`src/App.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { CostForm } from './components/CostForm'
import { ModeSwitch } from './components/ModeSwitch'
import { PlayerList } from './components/PlayerList'
import { RatioInputs } from './components/RatioInputs'
import { ResultPanel } from './components/ResultPanel'
import { RoundingToggle } from './components/RoundingToggle'
import { calcSession, validateSession } from './lib/calc'
import {
  addToRoster,
  loadCurrentSession,
  loadHistory,
  loadRoster,
  loadSettings,
  saveCurrentSession,
  saveHistory,
  saveRoster,
  saveSettings,
  type RosterEntry,
  type SavedSession,
  type Settings,
} from './lib/storage'
import type { Gender, Player, SessionInput } from './lib/types'

function defaultSession(s: Settings): SessionInput {
  return {
    mode: s.mode,
    shuttleCount: 0,
    shuttlePrice: s.shuttlePrice,
    courtFee: 0,
    courtStart: '19:00',
    courtEnd: '21:00',
    maleRatio: s.maleRatio,
    femaleRatio: s.femaleRatio,
    rounding: s.rounding,
    players: [],
  }
}

export default function App() {
  const [page, setPage] = useState<'main' | 'history'>('main')
  const [roster, setRoster] = useState<RosterEntry[]>(() => loadRoster())
  const [history, setHistory] = useState<SavedSession[]>(() => loadHistory())
  const [session, setSession] = useState<SessionInput>(
    () => loadCurrentSession() ?? defaultSession(loadSettings()),
  )

  useEffect(() => {
    saveCurrentSession(session)
    saveSettings({
      mode: session.mode,
      maleRatio: session.maleRatio,
      femaleRatio: session.femaleRatio,
      shuttlePrice: session.shuttlePrice,
      rounding: session.rounding,
    })
  }, [session])
  useEffect(() => saveRoster(roster), [roster])
  useEffect(() => saveHistory(history), [history])

  const onPatch = (p: Partial<SessionInput>) => setSession((s) => ({ ...s, ...p }))

  const handleAddPlayer = (name: string, gender: Gender) => {
    const player: Player = {
      id: crypto.randomUUID(),
      name,
      gender,
      halfSession: false,
      startTime: null,
      endTime: null,
    }
    setSession((s) => ({ ...s, players: [...s.players, player] }))
    setRoster((r) => addToRoster(r, name, gender))
  }

  const errors = validateSession(session)
  const result = errors.length === 0 ? calcSession(session) : null

  const handleSave = () => {
    if (!result) return
    setHistory((h) => [
      { id: crypto.randomUUID(), savedAt: new Date().toISOString(), input: session, result },
      ...h,
    ])
    setRoster((r) =>
      session.players.reduce((acc, p) => addToRoster(acc, p.name, p.gender), r),
    )
  }

  if (page === 'history') {
    return <div>Lịch sử</div> // replaced in Task 11
  }

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center">
      <div className="w-full max-w-[390px] bg-gray-50 min-h-screen pb-8">
        <header className="bg-emerald-600 px-4 pt-8 pb-6 rounded-b-3xl">
          <h1 className="text-white text-2xl font-bold">🏸 Tính tiền cầu lông</h1>
          <p className="text-emerald-100 text-sm mt-1">Chia tiền nhanh sau buổi chơi</p>
        </header>
        <main className="px-4 -mt-2 space-y-4">
          <div className="mt-4">
            <ModeSwitch mode={session.mode} onChange={(mode) => onPatch({ mode })} />
          </div>
          <CostForm input={session} onPatch={onPatch} />
          <RatioInputs
            maleRatio={session.maleRatio}
            femaleRatio={session.femaleRatio}
            note={
              session.mode === 'hourly'
                ? 'Chỉ áp dụng cho tiền cầu — tiền sân chia theo giờ chơi'
                : undefined
            }
            onChange={onPatch}
          />
          <PlayerList
            input={session}
            roster={roster}
            onPatch={onPatch}
            onAddPlayer={handleAddPlayer}
          />
          <RoundingToggle rounding={session.rounding} onChange={(rounding) => onPatch({ rounding })} />
          <ResultPanel result={result} mode={session.mode} errors={errors} onSave={handleSave} />
          <button
            type="button"
            onClick={() => setPage('history')}
            className="w-full h-12 text-emerald-700 text-sm font-semibold"
          >
            Xem lịch sử các buổi →
          </button>
        </main>
      </div>
    </div>
  )
}
```

Also add `id="shuttle-count"`-matching label association: `CostForm` already links "Số quả cầu" via `htmlFor="shuttle-count"` (done in Task 7).

- [ ] **Step 4: Run full suite, then check in the browser**

Run: `npm test`
Expected: ALL PASS.

Run: `npm run dev` and open the printed URL — verify visually against `superdesign/design_iterations/mobile_first_vietnam_1.html` (narrow window): mode switch, costs, ratios, players, rounding, results, hidden surplus.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/smoke.test.tsx
git commit -m "feat: main page composition with persistence"
```

---

### Task 11: HistoryPage + navigation

**Files:**
- Create: `src/components/HistoryPage.tsx`
- Modify: `src/App.tsx` (wire page)
- Test: `src/components/HistoryPage.test.tsx`

**Interfaces:**
- Consumes: `SavedSession` (Task 6); `formatVND`, `formatNumber` (Task 2); `formatHours` (Task 3); `SurplusRow` (Task 9); types
- Produces:
  - `HistoryPage({ history, onBack, onDelete, onReuse }: { history: SavedSession[]; onBack: () => void; onDelete: (id: string) => void; onReuse: (s: SavedSession) => void })`
  - Header: ← back button + "Lịch sử các buổi" + "{n} buổi đã lưu · tháng này: {m} buổi"
  - Cards newest-first: weekday + date + time (vi-VN locale), "{count} người · {males} nam, {females} nữ", total cost. Click toggles detail: mode label, tiền cầu (count × price), tiền sân, giờ thuê (hourly only), hệ số, làm tròn, tổng thu, SurplusRow, per-player amounts (with ½ buổi / hours note). Buttons: "Dùng lại danh sách này cho buổi mới" and "Xóa" (uses `window.confirm('Xóa buổi này?')`)
  - App wiring: `onDelete` filters history; `onReuse` copies `input.players` into current session (fresh session otherwise keeps current costs) and navigates to main

- [ ] **Step 1: Write the failing test**

`src/components/HistoryPage.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { HistoryPage } from './HistoryPage'
import { calcRatioMode } from '../lib/calc'
import type { SavedSession } from '../lib/storage'
import type { SessionInput } from '../lib/types'

const input: SessionInput = {
  mode: 'ratio',
  shuttleCount: 6,
  shuttlePrice: 25000,
  courtFee: 150000,
  courtStart: '19:00',
  courtEnd: '21:00',
  maleRatio: 1.5,
  femaleRatio: 1,
  rounding: 'up1000',
  players: [
    { id: '1', name: 'Tuấn', gender: 'male', halfSession: false, startTime: null, endTime: null },
    { id: '2', name: 'Lan', gender: 'female', halfSession: false, startTime: null, endTime: null },
  ],
}

const saved: SavedSession = {
  id: 's1',
  savedAt: '2026-08-13T20:15:00.000Z',
  input,
  result: calcRatioMode(input),
}

test('newest session is expanded by default; click collapses it', () => {
  render(<HistoryPage history={[saved]} onBack={() => {}} onDelete={() => {}} onReuse={() => {}} />)
  expect(screen.getByText(/1 buổi đã lưu/)).toBeInTheDocument()
  // most recent card starts expanded
  expect(screen.getByText('Tiền cầu (6 quả × 25.000đ)')).toBeInTheDocument()
  expect(screen.getByText('Tổng thu')).toBeInTheDocument()
  fireEvent.click(screen.getByText(/2 người · 1 nam, 1 nữ/))
  expect(screen.queryByText('Tổng thu')).not.toBeInTheDocument()
})

test('delete asks for confirmation', () => {
  const onDelete = vi.fn()
  vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
  render(<HistoryPage history={[saved]} onBack={() => {}} onDelete={onDelete} onReuse={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa buổi này' }))
  expect(onDelete).not.toHaveBeenCalled()
  vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa buổi này' }))
  expect(onDelete).toHaveBeenCalledWith('s1')
})

test('reuse passes the session', () => {
  const onReuse = vi.fn()
  render(<HistoryPage history={[saved]} onBack={() => {}} onDelete={() => {}} onReuse={onReuse} />)
  fireEvent.click(screen.getByRole('button', { name: 'Dùng lại danh sách này cho buổi mới' }))
  expect(onReuse).toHaveBeenCalledWith(saved)
})

test('empty history shows hint', () => {
  render(<HistoryPage history={[]} onBack={() => {}} onDelete={() => {}} onReuse={() => {}} />)
  expect(screen.getByText(/Chưa có buổi nào được lưu/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/HistoryPage.test.tsx`
Expected: FAIL — cannot resolve `./HistoryPage`.

- [ ] **Step 3: Write the component and wire App**

`src/components/HistoryPage.tsx`:
```tsx
import { useState } from 'react'
import { formatVND } from '../lib/format'
import type { SavedSession } from '../lib/storage'
import { formatHours } from '../lib/time'
import { durationHours } from '../lib/time'
import { SurplusRow } from './ResultPanel'

interface Props {
  history: SavedSession[]
  onBack: () => void
  onDelete: (id: string) => void
  onReuse: (s: SavedSession) => void
}

function sessionDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HistoryPage({ history, onBack, onDelete, onReuse }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(history[0]?.id ?? null)

  const now = new Date()
  const thisMonth = history.filter((s) => {
    const d = new Date(s.savedAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center">
      <div className="w-full max-w-[390px] md:max-w-5xl bg-gray-50 min-h-screen pb-8">
        <header className="bg-emerald-600 px-4 pt-8 pb-6 rounded-b-3xl md:rounded-none">
          <div className="flex items-center gap-3 md:max-w-5xl md:mx-auto">
            <button
              type="button"
              aria-label="Quay lại"
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center text-xl shrink-0"
            >
              ←
            </button>
            <div>
              <h1 className="text-white text-xl font-bold">Lịch sử các buổi</h1>
              <p className="text-emerald-100 text-sm">
                {history.length} buổi đã lưu · tháng này: {thisMonth} buổi
              </p>
            </div>
          </div>
        </header>

        <main className="px-4 mt-4 space-y-3 md:max-w-5xl md:mx-auto md:grid md:grid-cols-2 md:gap-3 md:space-y-0 md:items-start">
          {history.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8 md:col-span-2">
              Chưa có buổi nào được lưu — quay lại màn hình chính và bấm "Lưu buổi này".
            </p>
          )}
          {history.map((s) => {
            const males = s.input.players.filter((p) => p.gender === 'male').length
            const females = s.input.players.length - males
            const expanded = expandedId === s.id
            return (
              <section
                key={s.id}
                className={`bg-white rounded-2xl shadow-sm ${
                  expanded ? 'border-2 border-emerald-200 md:col-span-2' : ''
                }`}
              >
                <button
                  type="button"
                  className="w-full p-4 flex items-center justify-between text-left"
                  onClick={() => setExpandedId(expanded ? null : s.id)}
                >
                  <div>
                    <h2 className="font-bold text-gray-900 text-sm">{sessionDate(s.savedAt)}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {s.input.players.length} người · {males} nam, {females} nữ
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-emerald-600">
                      {formatVND(s.result.totalCost)}
                    </div>
                    <div className="text-xs text-gray-400">{expanded ? '▲ thu gọn' : '▼ chi tiết'}</div>
                  </div>
                </button>

                {expanded && (
                  <>
                    <div className="border-t border-gray-100 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Chi phí</h3>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Tiền cầu ({s.input.shuttleCount} quả × {formatVND(s.input.shuttlePrice)})
                            </span>
                            <span className="font-semibold text-gray-900">
                              {formatVND(s.input.shuttleCount * s.input.shuttlePrice)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tiền sân</span>
                            <span className="font-semibold text-gray-900">{formatVND(s.input.courtFee)}</span>
                          </div>
                          {s.input.mode === 'hourly' && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Giờ thuê sân</span>
                              <span className="font-semibold text-gray-900">
                                {s.input.courtStart}–{s.input.courtEnd} (
                                {formatHours(durationHours(s.input.courtStart, s.input.courtEnd))})
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-500">Chế độ tính</span>
                            <span className="font-semibold text-gray-900">
                              {s.input.mode === 'ratio' ? 'Chia theo tỉ lệ' : 'Sân theo giờ'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Hệ số nam / nữ</span>
                            <span className="font-semibold text-gray-900">
                              {s.input.maleRatio} / {s.input.femaleRatio}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Làm tròn</span>
                            <span className="font-semibold text-gray-900">
                              {s.input.rounding === 'up1000' ? 'Tròn lên 1.000đ' : 'Giữ chính xác'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tổng thu</span>
                            <span className="font-semibold text-gray-900">
                              {formatVND(s.result.totalCollected)}
                            </span>
                          </div>
                          <SurplusRow surplus={s.result.surplus} />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Mỗi người trả</h3>
                        <ul className="space-y-1.5 text-sm">
                          {s.result.players.map((p) => (
                            <li
                              key={p.playerId}
                              className="flex justify-between bg-gray-50 rounded-lg px-3 py-2"
                            >
                              <span className="text-gray-900">
                                {p.name}{' '}
                                <span className="text-xs text-gray-400">
                                  ({p.gender === 'male' ? 'Nam' : 'Nữ'}
                                  {p.halfSession ? ' · ½ buổi' : ''}
                                  {p.hours !== null ? ` · ${formatHours(p.hours)}` : ''})
                                </span>
                              </span>
                              <span className="font-bold">{formatVND(p.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 p-4 space-y-2 md:space-y-0 md:flex md:gap-2">
                      <button
                        type="button"
                        onClick={() => onReuse(s)}
                        className="w-full md:flex-1 h-12 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
                      >
                        Dùng lại danh sách này cho buổi mới
                      </button>
                      <button
                        type="button"
                        onClick={() => window.confirm('Xóa buổi này?') && onDelete(s.id)}
                        className="w-full md:w-auto md:px-4 h-12 rounded-xl border border-red-200 text-red-500 text-sm font-semibold"
                      >
                        Xóa buổi này
                      </button>
                    </div>
                  </>
                )}
              </section>
            )
          })}
          <p className="text-center text-xs text-gray-400 pt-3 md:col-span-2">
            Dữ liệu lưu trên máy của bạn (localStorage)
          </p>
        </main>
      </div>
    </div>
  )
}
```

In `src/App.tsx`, replace the history stub:
```tsx
import { HistoryPage } from './components/HistoryPage'
```
```tsx
  if (page === 'history') {
    return (
      <HistoryPage
        history={history}
        onBack={() => setPage('main')}
        onDelete={(id) => setHistory((h) => h.filter((s) => s.id !== id))}
        onReuse={(s) => {
          setSession((cur) => ({ ...cur, players: s.input.players }))
          setPage('main')
        }}
      />
    )
  }
```

- [ ] **Step 4: Run full suite and check in the browser**

Run: `npm test`
Expected: ALL PASS.

Run: `npm run dev` — save a session, open Lịch sử, expand/collapse, reuse list, delete with confirm. Compare with `history_1_1.html` (mobile width) and `history_1.html` (wide).

- [ ] **Step 5: Commit**

```bash
git add src/components/HistoryPage.tsx src/components/HistoryPage.test.tsx src/App.tsx
git commit -m "feat: history page with reuse and delete"
```

---

### Task 12: Desktop/tablet responsive layout + final verification

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: all components
- Produces: at `md:` (≥768px) the main page becomes the approved desktop layout (`mobile_first_vietnam_1_1.html` / `mode2_hourly_1_1.html`): full-width emerald header bar with "Lịch sử các buổi" button on the right; content in `max-w-5xl` 5-column grid — inputs in `md:col-span-3`, sticky ResultPanel in `md:col-span-2`; bottom history link hidden on `md:`. Mobile layout unchanged.

- [ ] **Step 1: Restructure App layout**

Replace the returned JSX of the main page in `src/App.tsx` with:
```tsx
  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="max-w-[390px] mx-auto bg-gray-50 min-h-screen pb-8 md:max-w-none md:bg-gray-100 md:pb-0">
        <header className="bg-emerald-600 px-4 pt-8 pb-6 rounded-b-3xl md:rounded-none md:px-0 md:py-5">
          <div className="md:max-w-5xl md:mx-auto md:px-6 md:flex md:items-center md:justify-between">
            <div>
              <h1 className="text-white text-2xl font-bold">🏸 Tính tiền cầu lông</h1>
              <p className="text-emerald-100 text-sm mt-1">Chia tiền nhanh sau buổi chơi</p>
            </div>
            <button
              type="button"
              onClick={() => setPage('history')}
              className="hidden md:block h-11 px-4 rounded-xl bg-emerald-700 text-white text-sm font-semibold"
            >
              Lịch sử các buổi
            </button>
          </div>
        </header>
        <main className="px-4 -mt-2 space-y-4 md:max-w-5xl md:mx-auto md:px-6 md:mt-0 md:py-6 md:grid md:grid-cols-5 md:gap-6 md:space-y-0 md:items-start">
          <div className="mt-4 md:mt-0 md:col-span-5 md:max-w-md">
            <ModeSwitch mode={session.mode} onChange={(mode) => onPatch({ mode })} />
          </div>
          <div className="space-y-4 mt-4 md:mt-0 md:col-span-3">
            <CostForm input={session} onPatch={onPatch} />
            <RatioInputs
              maleRatio={session.maleRatio}
              femaleRatio={session.femaleRatio}
              note={
                session.mode === 'hourly'
                  ? 'Chỉ áp dụng cho tiền cầu — tiền sân chia theo giờ chơi'
                  : undefined
              }
              onChange={onPatch}
            />
            <PlayerList
              input={session}
              roster={roster}
              onPatch={onPatch}
              onAddPlayer={handleAddPlayer}
            />
            <RoundingToggle
              rounding={session.rounding}
              onChange={(rounding) => onPatch({ rounding })}
            />
          </div>
          <div className="mt-4 md:mt-0 md:col-span-2 md:sticky md:top-6 space-y-4">
            <ResultPanel result={result} mode={session.mode} errors={errors} onSave={handleSave} />
            <button
              type="button"
              onClick={() => setPage('history')}
              className="w-full h-12 text-emerald-700 text-sm font-semibold md:hidden"
            >
              Xem lịch sử các buổi →
            </button>
          </div>
        </main>
      </div>
    </div>
  )
```

Note: mobile spacing moves from the removed `space-y-4` behavior to explicit `mt-4` on the three top-level grid children plus inner `space-y-4` — verify visually on a narrow window that section gaps still look like the mockup.

- [ ] **Step 2: Run full suite**

Run: `npm test`
Expected: ALL PASS (layout change must not break behavior tests).

- [ ] **Step 3: Manual verification checklist (dev server, both narrow ~390px and wide ≥1024px windows)**

Run: `npm run dev`, then verify each item:
1. Mode 1 spec example: 6 cầu × 25.000, sân 150.000, thêm Tuấn/Hùng/Minh (nam) + Lan/Hoa (nữ), bật ½ buổi cho Minh → 79k/79k/40k/53k/53k, tổng thu 304.000đ.
2. Số dư hiện `•••••`, bấm mắt → `+4.000đ`, bấm lại → ẩn. Reload trang → ẩn lại.
3. Chuyển "Giữ chính xác" → tổng thu 300.000đ.
4. Mode 2 spec example: sân 300.000, giờ 19:00→21:00, Minh 20:00–21:00, Hoa 19:00–20:30 → 106k/106k/70k/94k/77k; mỗi dòng có breakdown `sân … + cầu …`.
5. Nút "Cả buổi" reset giờ của một người về mặc định.
6. Sửa giờ thuê sân → người "cả buổi" cập nhật theo, người đã sửa giữ nguyên.
7. Thêm tên trùng (khác hoa thường) → báo "đã có trong buổi".
8. Gõ 1 chữ cái → gợi ý từ danh bạ hiện, bấm gợi ý → thêm đúng giới tính.
9. Reload trang → danh sách người chơi + chi phí còn nguyên (currentSession).
10. Lưu buổi → vào Lịch sử: buổi hiện đúng ngày giờ vi-VN, mở chi tiết khớp số; "Dùng lại danh sách" → về trang chính với đúng người; Xóa có confirm.
11. Desktop ≥768px: header bar full-width có nút Lịch sử, 2 cột, kết quả sticky khi cuộn; mobile: 1 cột, link lịch sử cuối trang.
12. `npm run build` chạy sạch không lỗi TS.

- [ ] **Step 4: Fix anything found, re-run `npm test` + `npm run build`**

Expected: ALL PASS, clean build.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: responsive desktop layout and final polish"
```

---

## Out of scope (per spec §10)

Login, multi-device sync, payment QR, roster management screen, per-time-slot court splitting, PWA/offline, i18n.
