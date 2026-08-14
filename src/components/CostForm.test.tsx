import { render, screen, fireEvent, within } from '@testing-library/react'
import { useState } from 'react'
import { CostForm } from './CostForm'
import type { SessionInput } from '../lib/types'

function Harness({ initial }: { initial: SessionInput }) {
  const [input, setInput] = useState(initial)
  return <CostForm input={input} onPatch={(p) => setInput((s) => ({ ...s, ...p }))} />
}

const base: SessionInput = {
  mode: 'ratio',
  shuttleCount: 6,
  shuttlePrice: 25000,
  courtFee: 150000,
  courtStart: '19:00',
  courtEnd: '21:00',
  maleRatio: 1.5,
  femaleRatio: 1,
  rounding: 'up1000',
  players: [],
  extras: [],
}

test('shows computed shuttle money and total', () => {
  render(<Harness initial={base} />)
  expect(screen.getByText('150.000đ')).toBeInTheDocument() // tiền cầu
  expect(screen.getByText('300.000đ')).toBeInTheDocument() // TỔNG CHI
})

test('money input reformats with separators', () => {
  render(<Harness initial={base} />)
  const court = screen.getByLabelText('Tiền sân')
  fireEvent.change(court, { target: { value: '200000' } })
  expect((court as HTMLInputElement).value).toBe('200.000')
  expect(screen.getByText('350.000đ')).toBeInTheDocument()
})

test('hourly mode shows court time range and duration', () => {
  render(<Harness initial={{ ...base, mode: 'hourly' }} />)
  expect(screen.getByLabelText('Giờ bắt đầu')).toBeInTheDocument()
  expect(screen.getByText(/= 2 giờ/)).toBeInTheDocument()
})

test('ratio mode hides court time range', () => {
  render(<Harness initial={base} />)
  expect(screen.queryByLabelText('Giờ bắt đầu')).not.toBeInTheDocument()
})

describe('chi phí phát sinh khác', () => {
  const withPlayers: SessionInput = {
    ...base,
    players: [
      { id: 'p1', name: 'Hùng', gender: 'male', halfSession: false, startTime: null, endTime: null, paid: false },
      { id: 'p2', name: 'Lan', gender: 'female', halfSession: false, startTime: null, endTime: null, paid: false },
    ],
  }

  // 16
  test('adding a row, typing an amount, switching payer and deleting the row', () => {
    render(<Harness initial={withPlayers} />)
    // no summary line until there is at least one row
    expect(screen.queryByText('Phát sinh')).not.toBeInTheDocument()
    expect(screen.getByText('300.000đ')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+ Thêm khoản' }))
    const label = screen.getByLabelText('Tên khoản phát sinh')
    expect(label).toBeInTheDocument()
    // the new row defaults to the first player
    expect(screen.getByLabelText('Người trả khoản này')).toHaveValue('p1')

    fireEvent.change(screen.getByLabelText('Số tiền của khoản khác'), {
      target: { value: '20000' },
    })
    expect(screen.getByText('Phát sinh')).toBeInTheDocument()
    expect(screen.getByText('20.000đ')).toBeInTheDocument()
    expect(screen.getByText('320.000đ')).toBeInTheDocument() // TỔNG CHI

    // naming the row re-labels its money field
    fireEvent.change(label, { target: { value: 'Nước' } })
    expect(screen.getByLabelText('Số tiền của Nước')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Người trả khoản này'), { target: { value: 'p2' } })
    expect(screen.getByLabelText('Người trả khoản này')).toHaveValue('p2')

    fireEvent.click(screen.getByRole('button', { name: 'Xóa khoản Nước' }))
    expect(screen.queryByLabelText('Tên khoản phát sinh')).not.toBeInTheDocument()
    expect(screen.queryByText('Phát sinh')).not.toBeInTheDocument()
    expect(screen.getByText('300.000đ')).toBeInTheDocument()
  })

  test('changing the payer reports the new playerId through onPatch', () => {
    const onPatch = vi.fn()
    render(
      <CostForm
        input={{
          ...withPlayers,
          extras: [{ id: 'e1', label: 'Nước', amount: 20000, playerId: 'p1' }],
        }}
        onPatch={onPatch}
      />,
    )
    fireEvent.change(screen.getByLabelText('Người trả khoản này'), { target: { value: 'p2' } })
    expect(onPatch).toHaveBeenCalledWith({
      extras: [{ id: 'e1', label: 'Nước', amount: 20000, playerId: 'p2' }],
    })
  })

  test('with nobody in the session the add button is disabled and explains why', () => {
    render(<Harness initial={base} />)
    expect(screen.getByRole('button', { name: '+ Thêm khoản' })).toBeDisabled()
    expect(screen.getByText('Thêm người chơi trước để gán khoản phát sinh')).toBeInTheDocument()
  })
})

test('picking a new court start time via the (non-nested) wheel sheet updates the duration', () => {
  render(<Harness initial={{ ...base, mode: 'hourly' }} />)
  fireEvent.click(screen.getByLabelText('Giờ bắt đầu'))
  const sheet = screen.getByRole('dialog')
  fireEvent.click(within(within(sheet).getByTestId('time-wheel-hour')).getByText('20'))
  fireEvent.click(within(sheet).getByRole('button', { name: 'Xong' }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Giờ bắt đầu')).toHaveTextContent('20:00')
  expect(screen.getByText(/= 1 giờ/)).toBeInTheDocument()
})
