import {
  extraShareLine,
  formatDateLabel,
  formatFilenameDate,
  playerNote,
  renderResultImage,
} from './exportImage'
import type { CalcResult, Player, PlayerResult } from './types'

test('formatDateLabel renders DD/MM/YYYY with zero-padding', () => {
  expect(formatDateLabel(new Date(2026, 7, 13))).toBe('13/08/2026')
  expect(formatDateLabel(new Date(2026, 0, 1))).toBe('01/01/2026')
})

test('formatFilenameDate renders YYYY-MM-DD with zero-padding', () => {
  expect(formatFilenameDate(new Date(2026, 7, 13))).toBe('2026-08-13')
  expect(formatFilenameDate(new Date(2026, 0, 1))).toBe('2026-01-01')
})

describe('chi phí phát sinh khác', () => {
  // jsdom has no canvas 2D context; stub only the calls exportImage.ts makes
  function stubCanvas() {
    const ctx = {
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      scale: vi.fn(),
      set fillStyle(_v: string) {},
      set font(_v: string) {},
      set textAlign(_v: string) {},
      set textBaseline(_v: string) {},
    }
    return vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    )
  }

  afterEach(() => vi.restoreAllMocks())

  function playerResult(over: Partial<PlayerResult> = {}): PlayerResult {
    return {
      playerId: '1',
      name: 'Tuấn',
      gender: 'male',
      halfSession: false,
      hours: null,
      courtShare: 100000,
      shuttleShare: 50000,
      extras: [],
      extrasTotal: 0,
      raw: 150000,
      amount: 150000,
      ...over,
    }
  }

  const share = (label: string, amount: number, sharedCount = 1) => ({
    label,
    share: amount,
    sharedCount,
  })

  function result(players: PlayerResult[]): CalcResult {
    return {
      totalCost: players.reduce((s, p) => s + p.raw, 0),
      totalCollected: players.reduce((s, p) => s + p.amount, 0),
      surplus: 0,
      emptyHours: 0,
      players,
    }
  }

  const players: Player[] = [
    { id: '1', name: 'Tuấn', gender: 'male', halfSession: false, startTime: null, endTime: null, paid: false },
    { id: '2', name: 'Lan', gender: 'female', halfSession: false, startTime: null, endTime: null, paid: false },
  ]

  // 22 (replaces the old assertion that extras never changed the height — since
  // every extra is now printed on its own line, rows grow instead)
  test('rows grow by one line per extra, so the canvas is exactly as tall as it needs to be', () => {
    stubCanvas()
    const plain = result([playerResult(), playerResult({ playerId: '2', name: 'Lan', gender: 'female' })])
    const withExtras = result([
      playerResult({
        extras: [share('Nước', 15000), share('Thuê vợt', 20000)],
        extrasTotal: 35000,
        raw: 185000,
        amount: 185000,
      }),
      playerResult({
        playerId: '2',
        name: 'Lan',
        gender: 'female',
        extras: [share('Nước', 15000)],
        extrasTotal: 15000,
      }),
    ])

    const a = renderResultImage(plain, 'ratio', '13/08/2026', players)
    const b = renderResultImage(withExtras, 'ratio', '13/08/2026', players)

    // header 90 + two plain 64px rows + footer 44 = 262 CSS px, ×2 for SCALE
    expect(a.height).toBe(262 * 2)
    // 90 + (64 + 2×20) + (64 + 1×20) + 44 = 322 CSS px
    expect(b.height).toBe(322 * 2)
    expect(b.width).toBe(a.width)
  })

  test('rendering a result that carries extras does not crash', () => {
    stubCanvas()
    const withExtras = result([
      playerResult({
        extras: [share('Nước', 20000)],
        extrasTotal: 20000,
        raw: 170000,
        amount: 170000,
      }),
    ])
    expect(() => renderResultImage(withExtras, 'hourly', '13/08/2026', players)).not.toThrow()
  })

  // 23
  test('extraShareLine marks a shared extra with its head count and leaves a solo one alone', () => {
    expect(extraShareLine(share('Nước', 15000))).toBe('· Nước 15.000đ')
    expect(extraShareLine(share('Nước', 33333.333, 3))).toBe('· Nước (chung, 3 người) 33.333đ')
  })

  // 24
  test('playerNote never repeats a total that is already itemised, but keeps it for v1.4.0 data', () => {
    const itemised = playerResult({
      extras: [share('Nước', 20000)],
      extrasTotal: 20000,
    })
    expect(playerNote('ratio', itemised)).not.toMatch(/phát sinh/)
    expect(playerNote('ratio', itemised)).toBe('Nam')

    const legacy = playerResult({ extras: [], extrasTotal: 20000 })
    expect(playerNote('ratio', legacy)).toBe('Nam · + 20.000đ phát sinh')
  })
})
