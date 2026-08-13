import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { HistoryPage } from './HistoryPage'
import { calcHourlyMode, calcRatioMode } from '../lib/calc'
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

const savedB: SavedSession = {
  id: 's0',
  savedAt: '2026-08-11T20:15:00.000Z',
  input,
  result: calcRatioMode(input),
}

function Harness({ initial }: { initial: SavedSession[] }) {
  const [history, setHistory] = useState(initial)
  return (
    <HistoryPage
      history={history}
      onBack={() => {}}
      onDelete={(id) => setHistory((h) => h.filter((s) => s.id !== id))}
      onReuse={() => {}}
    />
  )
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

test('session list lays out in a responsive 1/2-column grid; expanded card spans both columns', () => {
  render(<HistoryPage history={[saved, savedB]} onBack={() => {}} onDelete={() => {}} onReuse={() => {}} />)
  const main = screen.getByRole('main')
  expect(main).toHaveClass('md:grid')
  expect(main).toHaveClass('md:grid-cols-2')

  // the expanded (newest) card spans both columns — "Tổng thu" only renders
  // inside the expanded detail section, so it uniquely identifies that card
  const expandedCard = screen.getByText('Tổng thu').closest('section')
  expect(expandedCard).toHaveClass('md:col-span-2')
})

test('empty history shows hint', () => {
  render(<HistoryPage history={[]} onBack={() => {}} onDelete={() => {}} onReuse={() => {}} />)
  expect(screen.getByText(/Chưa có buổi nào được lưu/)).toBeInTheDocument()
})

test('hourly-mode detail shows hours and never shows leftover ½ buổi note', () => {
  const hourlyInput: SessionInput = {
    mode: 'hourly',
    shuttleCount: 6,
    shuttlePrice: 25000,
    courtFee: 150000,
    courtStart: '19:00',
    courtEnd: '21:00',
    maleRatio: 1.5,
    femaleRatio: 1,
    rounding: 'up1000',
    players: [
      {
        id: '1',
        name: 'Tuấn',
        gender: 'male',
        halfSession: true, // stale flag from a ratio-mode session reused into hourly mode
        startTime: null,
        endTime: null,
      },
      {
        id: '2',
        name: 'Lan',
        gender: 'female',
        halfSession: false,
        startTime: null,
        endTime: null,
      },
    ],
  }
  const hourlySaved: SavedSession = {
    id: 'h1',
    savedAt: '2026-08-13T20:15:00.000Z',
    input: hourlyInput,
    result: calcHourlyMode(hourlyInput),
  }
  render(
    <HistoryPage history={[hourlySaved]} onBack={() => {}} onDelete={() => {}} onReuse={() => {}} />,
  )
  expect(screen.getAllByText(/2 giờ/).length).toBeGreaterThan(0)
  expect(screen.queryByText(/½ buổi/)).not.toBeInTheDocument()
})

test('deleting the expanded newest session re-expands the new newest session', () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<Harness initial={[saved, savedB]} />)
  // saved (newest, id s1) starts expanded
  expect(screen.getByText('Tổng thu')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Xóa buổi này' }))
  // savedB (now the only/newest remaining session) should be expanded automatically
  expect(screen.getByText('Tổng thu')).toBeInTheDocument()
})
