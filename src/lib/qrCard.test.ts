import { SCALE } from './exportImage'
import { qrCardFilename, renderQRCard, sharePlayerQR } from './qrCard'
import type { QRCardInput } from './qrCard'

// QRCode.toCanvas rasterises with a real 2D context, which jsdom lacks
vi.mock('qrcode', () => ({
  default: { toCanvas: vi.fn().mockResolvedValue(undefined) },
}))

const account = { bankBin: '970422', accountNo: '0011002233', accountName: '' }

const input: QRCardInput = {
  playerName: 'Đức',
  amount: 79000,
  memoDate: new Date(2026, 7, 15),
  account,
}

// jsdom has no canvas 2D context; stub only the calls qrCard.ts makes
function stubCanvas() {
  const ctx = {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    scale: vi.fn(),
    set fillStyle(_v: string) {},
    set font(_v: string) {},
    set textAlign(_v: string) {},
    set textBaseline(_v: string) {},
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  )
  // jsdom's toDataURL/toBlob are "not implemented" stubs returning undefined
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/png;base64,AAAA',
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => {
    cb(new Blob(['x'], { type: 'image/png' }))
  })
  return ctx
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('qrCardFilename bỏ dấu và nối bằng gạch nối', () => {
  expect(qrCardFilename('Đức', new Date(2026, 7, 15))).toBe('qr-duc-2026-08-15.png')
  expect(qrCardFilename('Lê Văn Anh', new Date(2026, 7, 15))).toBe('qr-le-van-anh-2026-08-15.png')
})

test('renderQRCard trả canvas rộng 600 CSS px', async () => {
  stubCanvas()
  const canvas = await renderQRCard(input)
  expect(canvas.width).toBe(600 * SCALE)
})

test('thẻ có tên chủ TK cao hơn thẻ không có đúng 22px', async () => {
  stubCanvas()
  const without = await renderQRCard(input)
  const withName = await renderQRCard({
    ...input,
    account: { ...account, accountName: 'VAN ANH DUC' },
  })
  expect(withName.height - without.height).toBe(22 * SCALE)
})

/** navigator.share/canShare không có trong jsdom → gắn thẳng vào navigator. */
function stubShare(share: ReturnType<typeof vi.fn>, canShare = vi.fn(() => true)) {
  vi.stubGlobal('navigator', Object.assign(Object.create(navigator), { share, canShare }))
}

test('sharePlayerQR chia sẻ đúng một file PNG → "shared"', async () => {
  stubCanvas()
  const share = vi.fn().mockResolvedValue(undefined)
  stubShare(share)

  await expect(sharePlayerQR(input)).resolves.toBe('shared')

  const files = share.mock.calls[0][0].files as File[]
  expect(files).toHaveLength(1)
  expect(files[0].type).toBe('image/png')
  expect(files[0].name).toBe('qr-duc-2026-08-15.png')
})

test('người dùng đóng share sheet (AbortError) → "cancelled"', async () => {
  stubCanvas()
  const err = new Error('cancelled')
  err.name = 'AbortError'
  stubShare(vi.fn().mockRejectedValue(err))

  await expect(sharePlayerQR(input)).resolves.toBe('cancelled')
})

test('máy không có navigator.canShare → tải về, trả "downloaded"', async () => {
  stubCanvas()
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  vi.stubGlobal('URL', Object.assign(Object.create(URL), {
    createObjectURL: vi.fn(() => 'blob:qr'),
    revokeObjectURL: vi.fn(),
  }))

  await expect(sharePlayerQR(input)).resolves.toBe('downloaded')
  expect(click).toHaveBeenCalled()
})
