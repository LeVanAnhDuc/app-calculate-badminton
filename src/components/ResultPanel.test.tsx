import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

test('shows per-player amounts; total collected is hidden until revealed', () => {
  const result = calcRatioMode(input)
  render(<ResultPanel result={result} mode="ratio" errors={[]} onSave={() => {}}
      onNewSession={() => {}} />)
  expect(screen.getByText('180.000đ')).toBeInTheDocument() // Tuấn: 300k×1.5/2.5
  expect(screen.getByText('120.000đ')).toBeInTheDocument() // Lan
  expect(screen.queryByText('300.000đ')).not.toBeInTheDocument() // tổng thu hidden by default
  fireEvent.click(screen.getByRole('button', { name: 'Hiện tổng thu' }))
  expect(screen.getByText('300.000đ')).toBeInTheDocument() // tổng thu revealed
})

test('surplus hidden behind eye toggle by default', () => {
  const result = calcRatioMode({ ...input, courtFee: 151000 })
  render(<ResultPanel result={result} mode="ratio" errors={[]} onSave={() => {}}
      onNewSession={() => {}} />)
  // both Tổng thu and Số dư are hidden by default
  expect(screen.getAllByText('•••••')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'Hiện số dư' }))
  // Tổng thu stays hidden; only the surplus row was revealed
  expect(screen.getAllByText('•••••')).toHaveLength(1)
  expect(screen.getByText(/\+\d/)).toBeInTheDocument()
})

test('negative surplus is rendered in red, not green', () => {
  const result = { ...calcRatioMode(input), surplus: -500 }
  render(<ResultPanel result={result} mode="ratio" errors={[]} onSave={() => {}}
      onNewSession={() => {}} />)
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
      onSave={() => {}}
      onNewSession={() => {}}
    />,
  )
  expect(screen.getByText('Tổng chi phải lớn hơn 0')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Lưu buổi này' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Xem toàn màn hình' })).not.toBeInTheDocument()
})

test('shows a friendly empty state instead of an amber error when there are no players yet', () => {
  render(
    <ResultPanel result={null} mode="ratio" errors={['Cần ít nhất 1 người chơi']} onSave={() => {}}
      onNewSession={() => {}} />,
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
      onSave={() => {}}
      onNewSession={() => {}}
    />,
  )
  expect(screen.getByText('Tổng chi phải lớn hơn 0')).toBeInTheDocument()
  expect(screen.getByText('Hệ số phải lớn hơn 0')).toBeInTheDocument()
  expect(screen.queryByText('Chưa có ai trong buổi này')).not.toBeInTheDocument()
})

test('fullscreen overlay shows player names and closes on Đóng', async () => {
  const result = calcRatioMode(input)
  render(<ResultPanel result={result} mode="ratio" errors={[]} onSave={() => {}}
      onNewSession={() => {}} />)
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

test('fullscreen overlay lays out players in a responsive 1/2-column grid', () => {
  const result = calcRatioMode(input)
  render(<ResultPanel result={result} mode="ratio" errors={[]} onSave={() => {}}
      onNewSession={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xem toàn màn hình' }))
  const list = screen.getByTestId('fullscreen-player-grid')
  expect(list).toHaveClass('grid-cols-1')
  expect(list).toHaveClass('md:grid-cols-2')
})

test('Esc key closes the fullscreen overlay', async () => {
  const result = calcRatioMode(input)
  render(<ResultPanel result={result} mode="ratio" errors={[]} onSave={() => {}}
      onNewSession={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xem toàn màn hình' }))
  expect(screen.getByRole('button', { name: 'Đóng' })).toBeInTheDocument()
  fireEvent.keyDown(window, { key: 'Escape' })
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Đóng' })).not.toBeInTheDocument(),
  )
})

test('"Buổi mới" button is always clickable, even with no result', () => {
  const onNewSession = vi.fn()
  render(
    <ResultPanel
      result={null}
      mode="ratio"
      errors={['Cần ít nhất 1 người chơi']}
      onSave={() => {}}
      onNewSession={onNewSession}
    />,
  )
  const button = screen.getByRole('button', { name: 'Buổi mới' })
  expect(button).not.toBeDisabled()
  fireEvent.click(button)
  expect(onNewSession).toHaveBeenCalledTimes(1)
})
