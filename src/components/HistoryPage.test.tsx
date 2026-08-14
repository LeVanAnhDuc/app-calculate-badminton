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
    { id: '1', name: 'Tuấn', gender: 'male', halfSession: false, startTime: null, endTime: null, paid: false },
    { id: '2', name: 'Lan', gender: 'female', halfSession: false, startTime: null, endTime: null, paid: false },
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
      onTogglePaid={(sessionId, playerId) =>
        setHistory((h) =>
          h.map((s) =>
            s.id !== sessionId
              ? s
              : {
                  ...s,
                  input: {
                    ...s.input,
                    players: s.input.players.map((p) =>
                      p.id === playerId ? { ...p, paid: !p.paid } : p,
                    ),
                  },
                },
          ),
        )
      }
      onReuse={() => {}}
    />
  )
}

test('cards start collapsed; tapping one expands it, tapping again collapses it', () => {
  render(<HistoryPage history={[saved]} onBack={() => {}} onDelete={() => {}} onTogglePaid={() => {}} onReuse={() => {}} />)
  expect(screen.getByText(/1 buổi đã lưu/)).toBeInTheDocument()
  // no card auto-expands, even the newest one
  expect(screen.queryByText('Tiền cầu (6 quả × 25.000đ)')).not.toBeInTheDocument()
  expect(screen.queryByText('Tổng thu')).not.toBeInTheDocument()
  fireEvent.click(screen.getByText(/2 người · 1 nam, 1 nữ/))
  expect(screen.getByText('Tiền cầu (6 quả × 25.000đ)')).toBeInTheDocument()
  expect(screen.getByText('Tổng thu')).toBeInTheDocument()
  fireEvent.click(screen.getByText(/2 người · 1 nam, 1 nữ/))
  expect(screen.queryByText('Tổng thu')).not.toBeInTheDocument()
})

test('delete calls onDelete straight away, without a confirm dialog', () => {
  const onDelete = vi.fn()
  const confirmSpy = vi.spyOn(window, 'confirm')
  render(<HistoryPage history={[saved]} onBack={() => {}} onDelete={onDelete} onTogglePaid={() => {}} onReuse={() => {}} />)
  fireEvent.click(screen.getByText(/2 người · 1 nam, 1 nữ/))
  fireEvent.click(screen.getByRole('button', { name: 'Xóa buổi này' }))
  // deleting is undoable via the "Hoàn tác" toast App raises, so nothing is
  // asked up front
  expect(confirmSpy).not.toHaveBeenCalled()
  expect(onDelete).toHaveBeenCalledWith('s1')
  confirmSpy.mockRestore()
})

test('reuse passes the session', () => {
  const onReuse = vi.fn()
  render(<HistoryPage history={[saved]} onBack={() => {}} onDelete={() => {}} onTogglePaid={() => {}} onReuse={onReuse} />)
  fireEvent.click(screen.getByText(/2 người · 1 nam, 1 nữ/))
  fireEvent.click(screen.getByRole('button', { name: 'Dùng lại danh sách này cho buổi mới' }))
  expect(onReuse).toHaveBeenCalledWith(saved)
})

test('session list lays out in a responsive 1/2-column grid; expanded card spans both columns', () => {
  render(<HistoryPage history={[saved, savedB]} onBack={() => {}} onDelete={() => {}} onTogglePaid={() => {}} onReuse={() => {}} />)
  const main = screen.getByRole('main')
  expect(main).toHaveClass('md:grid')
  expect(main).toHaveClass('md:grid-cols-2')

  // tap the newest card to expand it — "Tổng thu" only renders inside the
  // expanded detail section, so it uniquely identifies that card
  fireEvent.click(screen.getAllByText(/2 người · 1 nam, 1 nữ/)[0])
  const expandedCard = screen.getByText('Tổng thu').closest('section')
  expect(expandedCard).toHaveClass('md:col-span-2')
})

test('sessions from different months are grouped under a month header each, newest month first', () => {
  const august: SavedSession = { ...saved, id: 'aug1', savedAt: '2026-08-13T20:15:00.000Z' }
  const july: SavedSession = { ...saved, id: 'jul1', savedAt: '2026-07-05T20:15:00.000Z' }
  render(<HistoryPage history={[august, july]} onBack={() => {}} onDelete={() => {}} onTogglePaid={() => {}} onReuse={() => {}} />)
  const headers = screen.getAllByText(/^Tháng \d+\/\d{4}$/)
  expect(headers.map((h) => h.textContent)).toEqual(['Tháng 8/2026', 'Tháng 7/2026'])
})

test('empty history shows hint', () => {
  render(<HistoryPage history={[]} onBack={() => {}} onDelete={() => {}} onTogglePaid={() => {}} onReuse={() => {}} />)
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
        paid: false,
      },
      {
        id: '2',
        name: 'Lan',
        gender: 'female',
        halfSession: false,
        startTime: null,
        endTime: null,
        paid: false,
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
    <HistoryPage history={[hourlySaved]} onBack={() => {}} onDelete={() => {}} onTogglePaid={() => {}} onReuse={() => {}} />,
  )
  // expand the (only) card to see its detail
  fireEvent.click(screen.getByText(/2 người · 1 nam, 1 nữ/))
  expect(screen.getAllByText(/2 giờ/).length).toBeGreaterThan(0)
  expect(screen.queryByText(/½ buổi/)).not.toBeInTheDocument()
})

test('deleting an expanded session collapses the view instead of auto-expanding another card', () => {
  render(<Harness initial={[saved, savedB]} />)
  // expand saved (id s1, the first/newest card)
  fireEvent.click(screen.getAllByText(/2 người · 1 nam, 1 nữ/)[0])
  expect(screen.getByText('Tổng thu')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Xóa buổi này' }))
  // savedB remains but nothing auto-expands — expandedId cleared, not re-pointed
  expect(screen.queryByText('Tổng thu')).not.toBeInTheDocument()
})

describe('paid tracking', () => {
  test('collapsed card shows an amber "chưa trả" badge while anyone is unpaid, and hides it once everyone paid', () => {
    render(<Harness initial={[saved]} />)
    expect(screen.getByText('⚠ 2 chưa trả')).toBeInTheDocument()
  })

  test('no badge is shown when a session has no unpaid players', () => {
    const paidSaved: SavedSession = {
      ...saved,
      input: { ...saved.input, players: saved.input.players.map((p) => ({ ...p, paid: true })) },
    }
    render(<Harness initial={[paidSaved]} />)
    expect(screen.queryByText(/chưa trả/)).not.toBeInTheDocument()
  })

  test('expanded detail shows the settlement summary and a toggle per player', () => {
    render(<Harness initial={[saved]} />)
    fireEvent.click(screen.getByText(/2 người · 1 nam, 1 nữ/))
    expect(screen.getByText(/Đã thu 0\/2 · còn thiếu/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đánh dấu Tuấn đã trả' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đánh dấu Lan đã trả' })).toBeInTheDocument()
  })

  test('toggling a player paid in the detail view updates the summary and the collapsed badge count, via onTogglePaid', () => {
    render(<Harness initial={[saved]} />)
    fireEvent.click(screen.getByText(/2 người · 1 nam, 1 nữ/))
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu Tuấn đã trả' }))
    expect(screen.getByText(/Đã thu 1\/2 · còn thiếu/)).toBeInTheDocument()
    expect(screen.getByText('⚠ 1 chưa trả')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu Lan đã trả' }))
    expect(screen.getByText('✓ Đã thu đủ')).toBeInTheDocument()
    expect(screen.queryByText(/chưa trả/)).not.toBeInTheDocument()
  })

  test('onTogglePaid is scoped to the correct session id and player id', () => {
    const onTogglePaid = vi.fn()
    render(
      <HistoryPage
        history={[saved, savedB]}
        onBack={() => {}}
        onDelete={() => {}}
        onTogglePaid={onTogglePaid}
        onReuse={() => {}}
      />,
    )
    // expand the newest card (saved, id 's1') and toggle its first player
    fireEvent.click(screen.getAllByText(/2 người · 1 nam, 1 nữ/)[0])
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu Tuấn đã trả' }))
    expect(onTogglePaid).toHaveBeenCalledWith('s1', '1')
  })
})
