import { canvasToPngFile, copyResultText, formatResultText, shareResultImage } from './shareResult'
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
