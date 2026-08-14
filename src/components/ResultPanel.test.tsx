import { useState } from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { ResultPanel } from './ResultPanel'
import { calcRatioMode } from '../lib/calc'
import type { SessionInput } from '../lib/types'

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,TEST') },
}))

beforeEach(() => localStorage.clear())

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
    { id: '1', name: 'Tuấn', gender: 'male', halfSession: false, startTime: null, endTime: null, paid: false },
    { id: '2', name: 'Lan', gender: 'female', halfSession: false, startTime: null, endTime: null, paid: false },
  ],
}

// Mirrors how App.tsx wires ResultPanel: onPatch persists a players patch back
// onto the session, which is exactly what the paid-toggle needs to round-trip.
function Harness({ initialInput }: { initialInput: SessionInput }) {
  const [inp, setInput] = useState(initialInput)
  const onPatch = (p: Partial<SessionInput>) => setInput((s) => ({ ...s, ...p }))
  const result = calcRatioMode(inp)
  return (
    <ResultPanel
      result={result}
      mode="ratio"
      errors={[]}
      players={inp.players}
      onSave={() => {}}
      onNewSession={() => {}}
      onPatch={onPatch}
    />
  )
}

test('shows per-player amounts; total collected is hidden until revealed', () => {
  const result = calcRatioMode(input)
  // everyone paid so the settlement summary renders "✓ Đã thu đủ" instead of an
  // amount — otherwise "còn thiếu 300.000đ" would coincidentally match the
  // hidden tổng thu figure this test is asserting about
  const paidPlayers = input.players.map((p) => ({ ...p, paid: true }))
  render(<ResultPanel result={result} mode="ratio" errors={[]} players={paidPlayers} onSave={() => {}}
      onNewSession={() => {}} onPatch={() => {}} />)
  expect(screen.getByText('180.000đ')).toBeInTheDocument() // Tuấn: 300k×1.5/2.5
  expect(screen.getByText('120.000đ')).toBeInTheDocument() // Lan
  expect(screen.queryByText('300.000đ')).not.toBeInTheDocument() // tổng thu hidden by default
  fireEvent.click(screen.getByRole('button', { name: 'Hiện tổng thu' }))
  expect(screen.getByText('300.000đ')).toBeInTheDocument() // tổng thu revealed
})

test('surplus hidden behind eye toggle by default', () => {
  const result = calcRatioMode({ ...input, courtFee: 151000 })
  render(<ResultPanel result={result} mode="ratio" errors={[]} players={input.players} onSave={() => {}}
      onNewSession={() => {}} onPatch={() => {}} />)
  // both Tổng thu and Số dư are hidden by default
  expect(screen.getAllByText('•••••')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'Hiện số dư' }))
  // Tổng thu stays hidden; only the surplus row was revealed
  expect(screen.getAllByText('•••••')).toHaveLength(1)
  expect(screen.getByText(/\+\d/)).toBeInTheDocument()
})

test('negative surplus is rendered in red, not green', () => {
  const result = { ...calcRatioMode(input), surplus: -500 }
  render(<ResultPanel result={result} mode="ratio" errors={[]} players={input.players} onSave={() => {}}
      onNewSession={() => {}} onPatch={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Hiện số dư' }))
  const surplusText = screen.getByText('−500đ')
  expect(surplusText).toHaveClass('text-red-500')
  expect(surplusText).not.toHaveClass('text-emerald-600')
})

test('shows errors and disables save when result is null', () => {
  render(
    <ResultPanel
      result={null}
      mode="ratio"
      errors={['Tổng chi phải lớn hơn 0']}
      players={[]}
      onSave={() => {}}
      onNewSession={() => {}}
      onPatch={() => {}}
    />,
  )
  expect(screen.getByText('Tổng chi phải lớn hơn 0')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Lưu buổi này' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Xem toàn màn hình' })).not.toBeInTheDocument()
})

test('shows a friendly empty state instead of an amber error when there are no players yet', () => {
  render(
    <ResultPanel result={null} mode="ratio" errors={['Cần ít nhất 1 người chơi']} players={[]} onSave={() => {}}
      onNewSession={() => {}} onPatch={() => {}} />,
  )
  expect(screen.getByText('Chưa có ai trong buổi này')).toBeInTheDocument()
  expect(screen.getByText('Thêm người chơi ở mục bên trên để bắt đầu chia tiền')).toBeInTheDocument()
  expect(screen.queryByText('Cần ít nhất 1 người chơi')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Lưu buổi này' })).toBeDisabled()
})

test('other validation errors still show as the amber list even alongside more issues', () => {
  render(
    <ResultPanel
      result={null}
      mode="ratio"
      errors={['Tổng chi phải lớn hơn 0', 'Hệ số phải lớn hơn 0']}
      players={[]}
      onSave={() => {}}
      onNewSession={() => {}}
      onPatch={() => {}}
    />,
  )
  expect(screen.getByText('Tổng chi phải lớn hơn 0')).toBeInTheDocument()
  expect(screen.getByText('Hệ số phải lớn hơn 0')).toBeInTheDocument()
  expect(screen.queryByText('Chưa có ai trong buổi này')).not.toBeInTheDocument()
})

test('fullscreen overlay shows player names and closes on Đóng', async () => {
  const result = calcRatioMode(input)
  render(<ResultPanel result={result} mode="ratio" errors={[]} players={input.players} onSave={() => {}}
      onNewSession={() => {}} onPatch={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xem toàn màn hình' }))
  expect(screen.getAllByText('Tuấn').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Lan').length).toBeGreaterThan(0)
  fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
  // the overlay exits with a motion fade/scale animation, which keeps it
  // mounted in jsdom for a tick past the click
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Đóng' })).not.toBeInTheDocument(),
  )
})

test('fullscreen overlay is portaled to document.body so ancestor stacking contexts cannot cover it', () => {
  const result = calcRatioMode(input)
  const { container } = render(<ResultPanel result={result} mode="ratio" errors={[]} players={input.players} onSave={() => {}}
      onNewSession={() => {}} onPatch={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xem toàn màn hình' }))
  const overlay = screen.getByTestId('fullscreen-overlay')
  // the app renders the result column inside an md:sticky container, which
  // creates its own stacking context — a fixed z-50 overlay nested there
  // loses to z-10 elements elsewhere on the page, so it must escape via portal
  expect(container.contains(overlay)).toBe(false)
  expect(overlay.parentElement).toBe(document.body)
})

test('fullscreen overlay lays out players in a responsive 1/2-column grid', () => {
  const result = calcRatioMode(input)
  render(<ResultPanel result={result} mode="ratio" errors={[]} players={input.players} onSave={() => {}}
      onNewSession={() => {}} onPatch={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xem toàn màn hình' }))
  const list = screen.getByTestId('fullscreen-player-grid')
  expect(list).toHaveClass('grid-cols-1')
  expect(list).toHaveClass('md:grid-cols-2')
})

test('Esc key closes the fullscreen overlay', async () => {
  const result = calcRatioMode(input)
  render(<ResultPanel result={result} mode="ratio" errors={[]} players={input.players} onSave={() => {}}
      onNewSession={() => {}} onPatch={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xem toàn màn hình' }))
  expect(screen.getByRole('button', { name: 'Đóng' })).toBeInTheDocument()
  fireEvent.keyDown(window, { key: 'Escape' })
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Đóng' })).not.toBeInTheDocument(),
  )
})

describe('paid tracking', () => {
  test('no settlement line is shown when there is no result (validation error state)', () => {
    render(
      <ResultPanel
        result={null}
        mode="ratio"
        errors={['Cần ít nhất 1 người chơi']}
        players={[]}
        onSave={() => {}}
        onNewSession={() => {}}
        onPatch={() => {}}
      />,
    )
    expect(screen.queryByText(/Đã thu/)).not.toBeInTheDocument()
    expect(screen.queryByText('✓ Đã thu đủ')).not.toBeInTheDocument()
  })

  test('starts with nobody paid: summary shows "Đã thu 0/2 · còn thiếu" and toggle buttons show the empty ○ state', () => {
    render(<Harness initialInput={input} />)
    expect(screen.getByText(/Đã thu 0\/2 · còn thiếu/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đánh dấu Tuấn đã trả' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đánh dấu Lan đã trả' })).toBeInTheDocument()
  })

  test('toggling one player paid updates the summary to 1/2, flips the row background and aria-label', () => {
    render(<Harness initialInput={input} />)
    const row = screen.getByText('Tuấn').closest('li')!
    expect(row).not.toHaveClass('bg-emerald-50')
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu Tuấn đã trả' }))
    expect(screen.getByText(/Đã thu 1\/2 · còn thiếu/)).toBeInTheDocument()
    expect(row).toHaveClass('bg-emerald-50')
    expect(screen.getByRole('button', { name: 'Bỏ đánh dấu Tuấn đã trả' })).toBeInTheDocument()
  })

  test('tapping the toggle again un-marks the player and the summary reverts', () => {
    render(<Harness initialInput={input} />)
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu Tuấn đã trả' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ đánh dấu Tuấn đã trả' }))
    expect(screen.getByText(/Đã thu 0\/2 · còn thiếu/)).toBeInTheDocument()
  })

  test('marking everyone paid shows "✓ Đã thu đủ" instead of the amount owed', () => {
    render(<Harness initialInput={input} />)
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu Tuấn đã trả' }))
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu Lan đã trả' }))
    expect(screen.getByText('✓ Đã thu đủ')).toBeInTheDocument()
    expect(screen.queryByText(/còn thiếu/)).not.toBeInTheDocument()
  })

  test('the fullscreen overlay shows the same settlement summary and toggle works there too', () => {
    render(<Harness initialInput={input} />)
    fireEvent.click(screen.getByRole('button', { name: 'Xem toàn màn hình' }))
    expect(screen.getAllByText(/Đã thu 0\/2 · còn thiếu/).length).toBeGreaterThan(0)
    // there are two "Tuấn" toggle buttons on screen now (main panel + overlay);
    // clicking either one flips the same underlying player via onPatch
    const toggles = screen.getAllByRole('button', { name: 'Đánh dấu Tuấn đã trả' })
    fireEvent.click(toggles[toggles.length - 1])
    expect(screen.getAllByText(/Đã thu 1\/2 · còn thiếu/).length).toBeGreaterThan(0)
  })
})

test('"Buổi mới" button is always clickable, even with no result', () => {
  const onNewSession = vi.fn()
  render(
    <ResultPanel
      result={null}
      mode="ratio"
      errors={['Cần ít nhất 1 người chơi']}
      players={[]}
      onSave={() => {}}
      onNewSession={onNewSession}
      onPatch={() => {}}
    />,
  )
  const button = screen.getByRole('button', { name: 'Buổi mới' })
  expect(button).not.toBeDisabled()
  fireEvent.click(button)
  expect(onNewSession).toHaveBeenCalledTimes(1)
})

describe('PNG result download', () => {
  // jsdom doesn't implement the canvas 2D context; stub only the methods
  // exportImage.ts actually calls so renderResultImage/downloadResultImage
  // can run against a real (fake-drawing) HTMLCanvasElement.
  function stubCanvas() {
    const ctx = {
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      scale: vi.fn(),
      roundRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      set fillStyle(_v: string) {},
      set font(_v: string) {},
      set textAlign(_v: string) {},
      set textBaseline(_v: string) {},
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (callback: BlobCallback) => {
        callback(new Blob(['fake-png'], { type: 'image/png' }))
      },
    )
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('clicking the download button triggers an anchor download with the expected filename and shows a toast', async () => {
    stubCanvas()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const toastSpy = vi.spyOn(toast, 'success').mockImplementation(() => '')
    let downloadedFilename: string | null = null
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedFilename = this.download
    })

    const result = calcRatioMode(input)
    render(
      <ResultPanel result={result} mode="ratio" errors={[]} players={input.players} onSave={() => {}} onNewSession={() => {}} onPatch={() => {}} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tải ảnh kết quả' }))

    await waitFor(() =>
      expect(downloadedFilename).toMatch(/^tinh-tien-cau-long-\d{4}-\d{2}-\d{2}\.png$/),
    )
    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith('Đã tải ảnh kết quả'))
  })

  test('downloading with a mix of paid and unpaid players does not crash and still names the file correctly', async () => {
    stubCanvas()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(toast, 'success').mockImplementation(() => '')
    let downloadedFilename: string | null = null
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedFilename = this.download
    })

    const mixedInput: SessionInput = {
      ...input,
      players: [
        { ...input.players[0], paid: true },
        { ...input.players[1], paid: false },
      ],
    }
    const result = calcRatioMode(mixedInput)
    render(
      <ResultPanel
        result={result}
        mode="ratio"
        errors={[]}
        players={mixedInput.players}
        onSave={() => {}}
        onNewSession={() => {}}
        onPatch={() => {}}
      />,
    )
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: 'Tải ảnh kết quả' })),
    ).not.toThrow()

    await waitFor(() =>
      expect(downloadedFilename).toMatch(/^tinh-tien-cau-long-\d{4}-\d{2}-\d{2}\.png$/),
    )
  })

  test('the download button is also available inside the fullscreen overlay', async () => {
    stubCanvas()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(toast, 'success').mockImplementation(() => '')
    let downloadedFilename: string | null = null
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedFilename = this.download
    })

    const result = calcRatioMode(input)
    render(
      <ResultPanel result={result} mode="ratio" errors={[]} players={input.players} onSave={() => {}} onNewSession={() => {}} onPatch={() => {}} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Xem toàn màn hình' }))
    // the overlay stacks on top of the (still-mounted) main panel, so there
    // are now two download buttons — scope to the one inside the overlay,
    // which shares its immediate parent with the overlay's "Đóng" close button
    const overlayButtonGroup = screen.getByRole('button', { name: 'Đóng' }).closest('div')!
    fireEvent.click(within(overlayButtonGroup).getByRole('button', { name: 'Tải ảnh kết quả' }))

    await waitFor(() =>
      expect(downloadedFilename).toMatch(/^tinh-tien-cau-long-\d{4}-\d{2}-\d{2}\.png$/),
    )
  })

  test('no download button is shown when there is no result', () => {
    render(
      <ResultPanel
        result={null}
        mode="ratio"
        errors={['Cần ít nhất 1 người chơi']}
        players={[]}
        onSave={() => {}}
        onNewSession={() => {}}
        onPatch={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Tải ảnh kết quả' })).not.toBeInTheDocument()
  })
})

test('QR button opens the QR sheet; without a stored account the setup form appears', async () => {
  const result = calcRatioMode(input)
  render(
    <ResultPanel result={result} mode="ratio" errors={[]} players={input.players} onSave={() => {}}
      onNewSession={() => {}} onPatch={() => {}} />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Mã QR cho Tuấn' }))
  expect(await screen.findByPlaceholderText('Số tài khoản')).toBeInTheDocument()
})
