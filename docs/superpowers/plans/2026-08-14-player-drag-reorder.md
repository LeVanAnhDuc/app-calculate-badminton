# Player Drag-and-Drop Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users reorder players in the "Người chơi" list by dragging a per-row ⠿ handle, on both mobile (priority) and desktop.

**Architecture:** Replace the current `<ul>`/`<motion.li>` list in `PlayerList.tsx` with `Reorder.Group`/`Reorder.Item` from the already-installed `motion` library. Each row is extracted into a new `PlayerRow` component that owns its own `useDragControls` (drag starts only from the handle) and its own swipe-to-delete tracking. New order is written straight back into `input.players` via the existing `onPatch`, so results, PNG export, and history pick it up automatically. A small `useEdgeAutoScroll` hook scrolls the window when a drag approaches the viewport edge.

**Tech Stack:** React 19, TypeScript, `motion` v13 (`motion/react` import path), Tailwind CSS v4, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-08-14-player-drag-reorder-design.md`

## Global Constraints

- No new dependencies — use `motion` (already in package.json), import from `'motion/react'`.
- All UI copy is Vietnamese; new strings copied verbatim from this plan: drag-handle label `Sắp xếp {tên}`, handle title `Kéo để sắp xếp`, hint line `💡 Kéo ⠿ để sắp xếp thứ tự`.
- Preserve every existing behavior: swipe-left to delete (mobile), tap avatar to toggle gender, tap name to open edit drawer, desktop pencil/× buttons, `data-testid="swipe-row-{id}"`.
- Drag must start ONLY from the ⠿ handle; the handle gets `touch-action: none` (Tailwind class `touch-none`); the rest of the row must keep scrolling/swiping normally.
- Run tests with `npm test -- <file>` (vitest run). Full suite: `npm test`. The suite is slow (~100s) — prefer single-file runs inside tasks.
- Commit after every green test run. Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Extract GenderBadge into its own file

**Files:**
- Create: `src/components/GenderBadge.tsx`
- Modify: `src/components/PlayerList.tsx` (remove local `GenderBadge`, import it)
- Test: existing `src/components/PlayerList.test.tsx` (characterization — no new tests)

**Interfaces:**
- Consumes: `Gender` from `src/lib/types.ts`
- Produces: `export function GenderBadge({ gender }: { gender: Gender })` — used by Task 2's `PlayerRow` and by the suggestions list in `PlayerList.tsx`.

- [ ] **Step 1: Create the new component file**

`src/components/GenderBadge.tsx`:

```tsx
import type { Gender } from '../lib/types'

export function GenderBadge({ gender }: { gender: Gender }) {
  return (
    <span
      className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
        gender === 'male' ? 'bg-emerald-100 text-emerald-700' : 'bg-pink-100 text-pink-700'
      }`}
    >
      {gender === 'male' ? 'N' : 'Nữ'}
    </span>
  )
}
```

- [ ] **Step 2: Update PlayerList.tsx**

Delete the local `function GenderBadge(...) {...}` definition (lines ~21–31) and add to the imports:

```tsx
import { GenderBadge } from './GenderBadge'
```

- [ ] **Step 3: Run the PlayerList tests**

Run: `npm test -- src/components/PlayerList.test.tsx`
Expected: all tests PASS (pure refactor).

- [ ] **Step 4: Commit**

```bash
git add src/components/GenderBadge.tsx src/components/PlayerList.tsx
git commit -m "refactor: extract GenderBadge component"
```

---

### Task 2: Extract PlayerRow component (no behavior change)

**Files:**
- Create: `src/components/PlayerRow.tsx`
- Modify: `src/components/PlayerList.tsx` (row markup + swipe logic move out)
- Test: existing `src/components/PlayerList.test.tsx` (characterization — no new tests)

**Interfaces:**
- Consumes: `GenderBadge` from Task 1; `Gender`, `Mode`, `Player` from `src/lib/types.ts`.
- Produces: `export function PlayerRow(props: PlayerRowProps)` with exactly these props (Task 3 adds one more):

```tsx
interface PlayerRowProps {
  player: Player
  mode: Mode
  timeLabel: string            // precomputed by parent, e.g. "19:00–21:00 · cả buổi"
  isSwipeOpen: boolean
  onSwipeOpenChange: (id: string | null) => void
  onRemove: (id: string) => void
  onChangeGender: (id: string, gender: Gender) => void
  onEdit: (player: Player) => void
  onToggleHalf: (player: Player) => void
}
```

- [ ] **Step 1: Create PlayerRow.tsx**

Swipe tracking becomes per-row local state (`swipe`), while "which row is open" stays in the parent (`isSwipeOpen`/`onSwipeOpenChange`) so only one row can be open at a time — identical net behavior to today.

`src/components/PlayerRow.tsx`:

```tsx
import { useState, type TouchEvent } from 'react'
import { motion } from 'motion/react'
import type { Gender, Mode, Player } from '../lib/types'
import { GenderBadge } from './GenderBadge'

const SWIPE_OPEN_PX = 80
const SWIPE_THRESHOLD_PX = 40

interface PlayerRowProps {
  player: Player
  mode: Mode
  timeLabel: string
  isSwipeOpen: boolean
  onSwipeOpenChange: (id: string | null) => void
  onRemove: (id: string) => void
  onChangeGender: (id: string, gender: Gender) => void
  onEdit: (player: Player) => void
  onToggleHalf: (player: Player) => void
}

function PencilIcon() {
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
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  )
}

export function PlayerRow({
  player,
  mode,
  timeLabel,
  isSwipeOpen,
  onSwipeOpenChange,
  onRemove,
  onChangeGender,
  onEdit,
  onToggleHalf,
}: PlayerRowProps) {
  const [swipe, setSwipe] = useState<{ startX: number; deltaX: number } | null>(null)

  const translate = swipe ? swipe.deltaX : isSwipeOpen ? -SWIPE_OPEN_PX : 0

  const handleTouchStart = (e: TouchEvent) => {
    setSwipe({ startX: e.touches[0].clientX, deltaX: 0 })
  }

  const handleTouchMove = (e: TouchEvent) => {
    const x = e.touches[0].clientX
    setSwipe((s) =>
      s ? { ...s, deltaX: Math.min(0, Math.max(x - s.startX, -SWIPE_OPEN_PX)) } : s,
    )
  }

  const handleTouchEnd = () => {
    setSwipe((s) => {
      if (!s) return null
      onSwipeOpenChange(s.deltaX <= -SWIPE_THRESHOLD_PX ? player.id : null)
      return null
    })
  }

  return (
    <motion.li
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative overflow-hidden">
        <button
          type="button"
          aria-label={`Xóa nhanh ${player.name}`}
          onClick={() => onRemove(player.id)}
          className="absolute inset-y-0 right-0 w-20 bg-red-500 text-white text-sm font-semibold flex items-center justify-center"
        >
          Xóa
        </button>
        <div
          data-testid={`swipe-row-${player.id}`}
          className="relative bg-white py-2.5 transition-transform duration-150 ease-out"
          style={{ transform: `translateX(${translate}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClickCapture={(e) => {
            if (isSwipeOpen) {
              onSwipeOpenChange(null)
              e.stopPropagation()
            }
          }}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                aria-label={`Đổi giới tính ${player.name}`}
                title="Đổi giới tính"
                onClick={() => onChangeGender(player.id, player.gender === 'male' ? 'female' : 'male')}
              >
                <GenderBadge gender={player.gender} />
              </button>
              <button type="button" className="text-left min-w-0" onClick={() => onEdit(player)}>
                <span className="font-medium text-gray-900 block truncate">{player.name}</span>
                {mode === 'hourly' && (
                  <span
                    className={`text-xs ${
                      player.startTime === null ? 'text-gray-400' : 'font-semibold text-emerald-700'
                    }`}
                  >
                    {timeLabel}
                  </span>
                )}
              </button>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {mode === 'ratio' && (
                <motion.button
                  type="button"
                  aria-pressed={player.halfSession}
                  aria-label={`½ buổi ${player.name}`}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onToggleHalf(player)}
                  className={`h-9 px-2.5 rounded-full text-xs font-semibold transition-colors duration-200 ${
                    player.halfSession
                      ? 'bg-emerald-600 text-white'
                      : 'border border-gray-200 text-gray-400'
                  }`}
                >
                  {player.halfSession ? '½ buổi ✓' : '½ buổi'}
                </motion.button>
              )}
              <button
                type="button"
                aria-label={`Sửa ${player.name}`}
                title="Sửa"
                onClick={() => onEdit(player)}
                className="hidden md:flex md:w-10 md:h-10 items-center justify-center text-gray-400 hover:bg-gray-100 rounded-lg"
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                aria-label={`Xóa ${player.name}`}
                onClick={() => onRemove(player.id)}
                className="hidden md:flex md:w-10 md:h-10 items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.li>
  )
}
```

- [ ] **Step 2: Slim down PlayerList.tsx**

In `src/components/PlayerList.tsx`:

1. Remove: `PencilIcon` function, `SWIPE_OPEN_PX`/`SWIPE_THRESHOLD_PX` constants, the `swipe` state, `rowTranslate`, `handleTouchStart`, `handleTouchMove`, `handleTouchEnd`. Keep `openSwipeId` state and `openEdit` (which already does `setOpenSwipeId(null)`).
2. Remove `type TouchEvent` from the react import (no longer used here).
3. Add import: `import { PlayerRow } from './PlayerRow'`.
4. Replace the entire `<ul>…</ul>` block (the `input.players.map` with `motion.li`) with:

```tsx
<ul className="mt-3 divide-y divide-gray-100">
  <AnimatePresence initial={false}>
    {input.players.map((p) => (
      <PlayerRow
        key={p.id}
        player={p}
        mode={input.mode}
        timeLabel={timeLabel(p)}
        isSwipeOpen={openSwipeId === p.id}
        onSwipeOpenChange={setOpenSwipeId}
        onRemove={removePlayer}
        onChangeGender={onChangeGender}
        onEdit={openEdit}
        onToggleHalf={(pl) => updatePlayer(pl.id, { halfSession: !pl.halfSession })}
      />
    ))}
  </AnimatePresence>
</ul>
```

- [ ] **Step 3: Run the PlayerList tests**

Run: `npm test -- src/components/PlayerList.test.tsx`
Expected: all tests PASS (pure refactor — swipe, gender toggle, edit drawer, half-session all still work).

- [ ] **Step 4: Commit**

```bash
git add src/components/PlayerRow.tsx src/components/PlayerList.tsx
git commit -m "refactor: extract PlayerRow from PlayerList"
```

---

### Task 3: Drag-and-drop reorder via motion Reorder + drag handle

**Files:**
- Modify: `src/components/PlayerRow.tsx` (motion.li → Reorder.Item, add ⠿ handle)
- Modify: `src/components/PlayerList.tsx` (ul → Reorder.Group, dragging state, hint line)
- Test: `src/components/PlayerList.test.tsx` (new tests)

**Interfaces:**
- Consumes: `PlayerRow` props from Task 2.
- Produces: `PlayerRowProps` gains `onDraggingChange: (dragging: boolean) => void` (Task 4 consumes the parent's `isDragging` state). Drag handle button has `aria-label={`Sắp xếp ${player.name}`}`.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/PlayerList.test.tsx`:

```tsx
test('each row has a drag handle labeled "Sắp xếp {tên}" with touch-action none', () => {
  const initial: SessionInput = {
    ...base,
    players: [
      ...base.players,
      { id: '2', name: 'Lan', gender: 'female', halfSession: false, startTime: null, endTime: null },
    ],
  }
  render(<Harness initial={initial} />)
  const handle = screen.getByRole('button', { name: 'Sắp xếp Tuấn' })
  expect(handle).toBeInTheDocument()
  expect(handle).toHaveClass('touch-none')
  expect(screen.getByRole('button', { name: 'Sắp xếp Lan' })).toBeInTheDocument()
})

test('hint banner mentions drag-to-reorder', () => {
  render(<Harness initial={base} />)
  expect(screen.getByText('💡 Kéo ⠿ để sắp xếp thứ tự')).toBeInTheDocument()
})

test('players render as list items inside a list, in players-array order', () => {
  const initial: SessionInput = {
    ...base,
    players: [
      ...base.players,
      { id: '2', name: 'Lan', gender: 'female', halfSession: false, startTime: null, endTime: null },
    ],
  }
  render(<Harness initial={initial} />)
  const items = screen.getAllByRole('listitem')
  expect(items[0]).toHaveTextContent('Tuấn')
  expect(items[1]).toHaveTextContent('Lan')
})
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm test -- src/components/PlayerList.test.tsx`
Expected: first two new tests FAIL (`Unable to find an accessible element with the role "button" and name "Sắp xếp Tuấn"`, hint text not found); the listitem-order test may already pass. All pre-existing tests still PASS.

- [ ] **Step 3: Convert PlayerRow to Reorder.Item with a handle**

In `src/components/PlayerRow.tsx`:

1. Change the motion import and add `useState` usage for dragging:

```tsx
import { Reorder, useDragControls, motion } from 'motion/react'
```

2. Add to `PlayerRowProps`:

```tsx
  onDraggingChange: (dragging: boolean) => void
```

(and add `onDraggingChange` to the destructured props.)

3. Inside the component add:

```tsx
  const dragControls = useDragControls()
  const [dragging, setDragging] = useState(false)
```

4. Guard swipe against drag — first line of `handleTouchStart`:

```tsx
    if (dragging) return
```

5. Add the `DragHandleIcon` next to `PencilIcon`:

```tsx
function DragHandleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  )
}
```

6. Replace `<motion.li initial=… exit=… transition=…>` opening tag with:

```tsx
    <Reorder.Item
      value={player}
      dragListener={false}
      dragControls={dragControls}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      whileDrag={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)' }}
      onDragStart={() => {
        setDragging(true)
        setSwipe(null)
        onSwipeOpenChange(null)
        onDraggingChange(true)
      }}
      onDragEnd={() => {
        setDragging(false)
        onDraggingChange(false)
      }}
      className={`relative ${dragging ? 'z-10' : ''}`}
    >
```

and the closing `</motion.li>` with `</Reorder.Item>`. (`Reorder.Item` renders an `<li>` by default.)

7. Insert the handle button as the FIRST child of `<div className="flex items-center gap-2 min-w-0">`, before the gender-badge button:

```tsx
              <button
                type="button"
                aria-label={`Sắp xếp ${player.name}`}
                title="Kéo để sắp xếp"
                onPointerDown={(e) => {
                  e.preventDefault()
                  dragControls.start(e)
                }}
                onTouchStart={(e) => e.stopPropagation()}
                className="w-11 h-11 -my-2 -ml-2 flex items-center justify-center text-gray-300 touch-none cursor-grab active:cursor-grabbing shrink-0"
              >
                <DragHandleIcon />
              </button>
```

Notes: `touch-none` stops the page from scrolling when the drag starts on the handle; `onTouchStart` stopPropagation keeps the handle from arming the row's swipe-to-delete tracking; `-my-2` keeps the 44px hit target from inflating the row height.

- [ ] **Step 4: Convert the list to Reorder.Group in PlayerList.tsx**

1. Add imports:

```tsx
import { AnimatePresence, motion, Reorder } from 'motion/react'
```

2. Add dragging state next to `openSwipeId`:

```tsx
  const [isDragging, setIsDragging] = useState(false)
```

3. Replace the `<ul className="mt-3 divide-y divide-gray-100">` opening tag with:

```tsx
        <Reorder.Group
          axis="y"
          values={input.players}
          onReorder={(players: Player[]) => onPatch({ players })}
          className="mt-3 divide-y divide-gray-100"
        >
```

and `</ul>` with `</Reorder.Group>` (it renders a `<ul>` by default). Pass the new prop on each row:

```tsx
        onDraggingChange={setIsDragging}
```

(`isDragging` is consumed in Task 4; until then a `void isDragging` statement or using it in Task 4 directly is fine — prefer doing Tasks 3+4 back-to-back so no suppression is needed. If the TS build complains in this task, add `void isDragging` right after the state declaration and remove it in Task 4.)

4. Add the hint line inside the hint banner `motion.div`, after the "Bấm tên để sửa" line:

```tsx
        <p>💡 Kéo ⠿ để sắp xếp thứ tự</p>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/components/PlayerList.test.tsx`
Expected: ALL tests PASS, including the three new ones and every pre-existing characterization test (swipe still works, `swipe-row-1` testid intact).

- [ ] **Step 6: Commit**

```bash
git add src/components/PlayerRow.tsx src/components/PlayerList.tsx src/components/PlayerList.test.tsx
git commit -m "feat: drag-and-drop player reordering with per-row handle"
```

---

### Task 4: Edge auto-scroll while dragging

**Files:**
- Create: `src/lib/useEdgeAutoScroll.ts`
- Create: `src/lib/useEdgeAutoScroll.test.ts`
- Modify: `src/components/PlayerList.tsx` (wire `isDragging` into the hook)

**Interfaces:**
- Consumes: `isDragging` state from Task 3.
- Produces: `export function useEdgeAutoScroll(active: boolean): void` — while `active`, scrolls `window` when the pointer is within 60px of the top/bottom viewport edge.

- [ ] **Step 1: Write the failing test**

`src/lib/useEdgeAutoScroll.test.ts`:

```ts
import { renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { useEdgeAutoScroll } from './useEdgeAutoScroll'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubRaf() {
  let tick: FrameRequestCallback = () => {}
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    tick = cb
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  return () => tick(0)
}

test('scrolls up when the pointer is near the top edge while active', () => {
  const scrollBy = vi.fn()
  vi.stubGlobal('scrollBy', scrollBy)
  const runTick = stubRaf()

  renderHook(() => useEdgeAutoScroll(true))
  // jsdom lacks a PointerEvent constructor; MouseEvent carries clientY fine
  window.dispatchEvent(new MouseEvent('pointermove', { clientY: 10 }))
  runTick()

  expect(scrollBy).toHaveBeenCalled()
  expect(scrollBy.mock.calls[0][1]).toBeLessThan(0)
})

test('does not scroll when the pointer is mid-screen', () => {
  const scrollBy = vi.fn()
  vi.stubGlobal('scrollBy', scrollBy)
  const runTick = stubRaf()

  renderHook(() => useEdgeAutoScroll(true))
  window.dispatchEvent(new MouseEvent('pointermove', { clientY: window.innerHeight / 2 }))
  runTick()

  expect(scrollBy).not.toHaveBeenCalled()
})

test('does nothing while inactive', () => {
  const scrollBy = vi.fn()
  vi.stubGlobal('scrollBy', scrollBy)
  const runTick = stubRaf()

  renderHook(() => useEdgeAutoScroll(false))
  window.dispatchEvent(new MouseEvent('pointermove', { clientY: 10 }))
  runTick()

  expect(scrollBy).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/useEdgeAutoScroll.test.ts`
Expected: FAIL — module `./useEdgeAutoScroll` not found.

- [ ] **Step 3: Implement the hook**

`src/lib/useEdgeAutoScroll.ts`:

```ts
import { useEffect, useRef } from 'react'

const EDGE_PX = 60
const MAX_SPEED_PX = 12

/**
 * While `active`, scrolls the window when the pointer approaches the
 * top/bottom viewport edge — lets a drag-reorder keep moving through a
 * list taller than the screen. Speed ramps from 0 at 60px to max at the
 * very edge.
 */
export function useEdgeAutoScroll(active: boolean) {
  const pointerY = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    const onPointerMove = (e: PointerEvent) => {
      pointerY.current = e.clientY
    }
    window.addEventListener('pointermove', onPointerMove)

    let raf = requestAnimationFrame(function tick() {
      const y = pointerY.current
      if (y !== null) {
        if (y < EDGE_PX) {
          window.scrollBy(0, -MAX_SPEED_PX * (1 - y / EDGE_PX))
        } else if (y > window.innerHeight - EDGE_PX) {
          window.scrollBy(0, MAX_SPEED_PX * (1 - (window.innerHeight - y) / EDGE_PX))
        }
      }
      raf = requestAnimationFrame(tick)
    })

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      cancelAnimationFrame(raf)
      pointerY.current = null
    }
  }, [active])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/useEdgeAutoScroll.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Wire into PlayerList**

In `src/components/PlayerList.tsx` add the import and call it right after the `isDragging` state declaration (remove any `void isDragging` left from Task 3):

```tsx
import { useEdgeAutoScroll } from '../lib/useEdgeAutoScroll'
```

```tsx
  useEdgeAutoScroll(isDragging)
```

- [ ] **Step 6: Run the component tests**

Run: `npm test -- src/components/PlayerList.test.tsx src/lib/useEdgeAutoScroll.test.ts`
Expected: ALL PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/useEdgeAutoScroll.ts src/lib/useEdgeAutoScroll.test.ts src/components/PlayerList.tsx
git commit -m "feat: auto-scroll window when dragging a player near the viewport edge"
```

---

### Task 5: Full verification

**Files:** none created — verification only.

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all files pass (109 pre-existing + new tests), 0 failures.

- [ ] **Step 2: Type-check + production build**

Run: `npm run build`
Expected: tsc emits no errors; vite build succeeds.

- [ ] **Step 3: Manual smoke check in a real browser**

Start `npm run dev`, then verify (desktop viewport AND mobile emulation ~390px):
- Dragging the ⠿ handle reorders rows with spring animation; other rows shift out of the way.
- New order shows up in the results panel below.
- Page scroll works when touching/dragging anywhere on a row EXCEPT the handle.
- Swipe-left still reveals the red Xóa button; tap avatar still toggles gender; tap name still opens the edit drawer.
- Deleting a row still animates out cleanly (no layout jump fighting the Reorder animations).

If the AnimatePresence height-collapse fights the Reorder layout animation (visible jitter on delete), simplify the exit animation to `exit={{ opacity: 0 }}` on `Reorder.Item` — drag smoothness wins per the spec.
