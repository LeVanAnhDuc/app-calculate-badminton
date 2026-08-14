import {
  buildQRItems,
  extraShareLine,
  formatDateLabel,
  formatFilenameDate,
  playerNote,
  qrSectionHeight,
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
    { playerId: 'a', name: 'Tuấn', gender: 'male', halfSession: false, hours: null, courtShare: 0, shuttleShare: 0, extrasTotal: 0, raw: 57000, amount: 57000 },
    { playerId: 'b', name: 'Lan', gender: 'female', halfSession: false, hours: null, courtShare: 0, shuttleShare: 0, extrasTotal: 0, raw: 43000, amount: 43000 },
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
  // every extra is now printed on its own line, rows grow instead).
  // async: renderResultImage returns a Promise since the VietQR merge.
  test('rows grow by one line per extra, so the canvas is exactly as tall as it needs to be', async () => {
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

    const a = await renderResultImage(plain, 'ratio', '13/08/2026', players)
    const b = await renderResultImage(withExtras, 'ratio', '13/08/2026', players)

    // header 90 + two plain 64px rows + footer 44 = 262 CSS px, ×2 for SCALE
    expect(a.height).toBe(262 * 2)
    // 90 + (64 + 2×20) + (64 + 1×20) + 44 = 322 CSS px
    expect(b.height).toBe(322 * 2)
    expect(b.width).toBe(a.width)
  })

  test('rendering a result that carries extras does not crash', async () => {
    stubCanvas()
    const withExtras = result([
      playerResult({
        extras: [share('Nước', 20000)],
        extrasTotal: 20000,
        raw: 170000,
        amount: 170000,
      }),
    ])
    await expect(renderResultImage(withExtras, 'hourly', '13/08/2026', players)).resolves.toBeDefined()
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
