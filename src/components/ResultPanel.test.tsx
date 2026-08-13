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

test('shows per-player amounts; total collected is hidden until revealed', () => {
  const result = calcRatioMode(input)
  render(<ResultPanel result={result} mode="ratio" errors={[]} onSave={() => {}} />)
  expect(screen.getByText('180.000đ')).toBeInTheDocument() // Tuấn: 300k×1.5/2.5
  expect(screen.getByText('120.000đ')).toBeInTheDocument() // Lan
  expect(screen.queryByText('300.000đ')).not.toBeInTheDocument() // tổng thu hidden by default
  fireEvent.click(screen.getByRole('button', { name: 'Hiện tổng thu' }))
  expect(screen.getByText('300.000đ')).toBeInTheDocument() // tổng thu revealed
})

test('surplus hidden behind eye toggle by default', () => {
  const result = calcRatioMode({ ...input, courtFee: 151000 })
  render(<ResultPanel result={result} mode="ratio" errors={[]} onSave={() => {}} />)
  // both Tổng thu and Số dư are hidden by default
  expect(screen.getAllByText('•••••')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'Hiện số dư' }))
  // Tổng thu stays hidden; only the surplus row was revealed
  expect(screen.getAllByText('•••••')).toHaveLength(1)
  expect(screen.getByText(/\+\d/)).toBeInTheDocument()
})

test('negative surplus is rendered in red, not green', () => {
  const result = { ...calcRatioMode(input), surplus: -500 }
  render(<ResultPanel result={result} mode="ratio" errors={[]} onSave={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Hiện số dư' }))
  const surplusText = screen.getByText('−500đ')
  expect(surplusText).toHaveClass('text-red-500')
  expect(surplusText).not.toHaveClass('text-emerald-600')
})

test('shows errors and disables save when result is null', () => {
  render(
    <ResultPanel result={null} mode="ratio" errors={['Cần ít nhất 1 người chơi']} onSave={() => {}} />,
  )
  expect(screen.getByText('Cần ít nhất 1 người chơi')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Lưu buổi này' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Xem toàn màn hình' })).not.toBeInTheDocument()
})

test('fullscreen overlay shows player names and closes on Đóng', () => {
  const result = calcRatioMode(input)
  render(<ResultPanel result={result} mode="ratio" errors={[]} onSave={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xem toàn màn hình' }))
  expect(screen.getAllByText('Tuấn').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Lan').length).toBeGreaterThan(0)
  fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
  expect(screen.queryByRole('button', { name: 'Đóng' })).not.toBeInTheDocument()
})

test('Esc key closes the fullscreen overlay', () => {
  const result = calcRatioMode(input)
  render(<ResultPanel result={result} mode="ratio" errors={[]} onSave={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xem toàn màn hình' }))
  expect(screen.getByRole('button', { name: 'Đóng' })).toBeInTheDocument()
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(screen.queryByRole('button', { name: 'Đóng' })).not.toBeInTheDocument()
})
