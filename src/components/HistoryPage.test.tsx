import { render, screen, fireEvent } from '@testing-library/react'
import { HistoryPage } from './HistoryPage'
import { calcRatioMode } from '../lib/calc'
import type { SavedSession } from '../lib/storage'
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

const saved: SavedSession = {
  id: 's1',
  savedAt: '2026-08-13T20:15:00.000Z',
  input,
  result: calcRatioMode(input),
}

test('newest session is expanded by default; click collapses it', () => {
  render(<HistoryPage history={[saved]} onBack={() => {}} onDelete={() => {}} onReuse={() => {}} />)
  expect(screen.getByText(/1 buổi đã lưu/)).toBeInTheDocument()
  // most recent card starts expanded
  expect(screen.getByText('Tiền cầu (6 quả × 25.000đ)')).toBeInTheDocument()
  expect(screen.getByText('Tổng thu')).toBeInTheDocument()
  fireEvent.click(screen.getByText(/2 người · 1 nam, 1 nữ/))
  expect(screen.queryByText('Tổng thu')).not.toBeInTheDocument()
})

test('delete asks for confirmation', () => {
  const onDelete = vi.fn()
  vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
  render(<HistoryPage history={[saved]} onBack={() => {}} onDelete={onDelete} onReuse={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa buổi này' }))
  expect(onDelete).not.toHaveBeenCalled()
  vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa buổi này' }))
  expect(onDelete).toHaveBeenCalledWith('s1')
})

test('reuse passes the session', () => {
  const onReuse = vi.fn()
  render(<HistoryPage history={[saved]} onBack={() => {}} onDelete={() => {}} onReuse={onReuse} />)
  fireEvent.click(screen.getByRole('button', { name: 'Dùng lại danh sách này cho buổi mới' }))
  expect(onReuse).toHaveBeenCalledWith(saved)
})

test('empty history shows hint', () => {
  render(<HistoryPage history={[]} onBack={() => {}} onDelete={() => {}} onReuse={() => {}} />)
  expect(screen.getByText(/Chưa có buổi nào được lưu/)).toBeInTheDocument()
})
