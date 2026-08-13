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
