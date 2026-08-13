import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import App from './App'
import { loadHistory } from './lib/storage'

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
  expect(JSON.parse(localStorage.getItem('roster')!)).toHaveLength(2)
  // verify through the REAL loader (guards against the app writing a
  // result the loader would then reject and wipe on next load)
  const savedHistory = loadHistory()
  expect(savedHistory).toHaveLength(1)
  expect(savedHistory[0].result.players[0].amount).toBe(180000)
})

test('hourly mode: save persists finite amounts, verified through the real loader', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Sân theo giờ' }))
  // default court times 19:00–21:00 are left untouched
  fireEvent.change(screen.getByLabelText('Số quả cầu'), { target: { value: '6' } })
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '150000' } })
  const nameInput = screen.getByPlaceholderText('Tên người chơi')
  fireEvent.change(nameInput, { target: { value: 'Tuấn' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  fireEvent.click(screen.getByRole('button', { name: 'Nữ' }))
  fireEvent.change(nameInput, { target: { value: 'Lan' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  fireEvent.click(screen.getByRole('button', { name: 'Lưu buổi này' }))

  const savedHistory = loadHistory()
  expect(savedHistory).toHaveLength(1)
  expect(savedHistory[0].input.mode).toBe('hourly')
  expect(Number.isFinite(savedHistory[0].result.surplus)).toBe(true)
  for (const p of savedHistory[0].result.players) {
    expect(Number.isFinite(p.amount)).toBe(true)
  }
})

test('saving shows a toast and disables the save button briefly to prevent duplicate saves', () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  render(<App />)
  fireEvent.change(screen.getByLabelText('Số quả cầu'), { target: { value: '6' } })
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '150000' } })
  const nameInput = screen.getByPlaceholderText('Tên người chơi')
  fireEvent.change(nameInput, { target: { value: 'Tuấn' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))

  const saveButton = screen.getByRole('button', { name: 'Lưu buổi này' })
  fireEvent.click(saveButton)

  expect(screen.getByText('Đã lưu buổi ✓')).toBeInTheDocument()
  expect(saveButton).toBeDisabled()

  act(() => {
    vi.advanceTimersByTime(2500)
  })

  expect(screen.queryByText('Đã lưu buổi ✓')).not.toBeInTheDocument()
  expect(saveButton).not.toBeDisabled()
  vi.useRealTimers()
})

test('session state is restored from localStorage', () => {
  const { unmount } = render(<App />)
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '999000' } })
  unmount()
  render(<App />)
  expect(screen.getByLabelText('Tiền sân')).toHaveValue('999.000')
})

test('opening history pushes browser state; the in-app ← button navigates back', async () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Xem lịch sử các buổi →' }))
  expect(screen.getByRole('heading', { name: 'Lịch sử các buổi' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
  // onBack triggers window.history.back(); popstate dispatch is async in jsdom
  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'Lịch sử các buổi' })).not.toBeInTheDocument(),
  )
})

test('browser back button (popstate) closes the history page', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Xem lịch sử các buổi →' }))
  expect(screen.getByRole('heading', { name: 'Lịch sử các buổi' })).toBeInTheDocument()

  fireEvent(window, new PopStateEvent('popstate'))
  expect(screen.queryByRole('heading', { name: 'Lịch sử các buổi' })).not.toBeInTheDocument()
})
