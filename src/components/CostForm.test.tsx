import { render, screen, fireEvent, within } from '@testing-library/react'
import { useState } from 'react'
import { CostForm } from './CostForm'
import type { ShuttleType } from '../lib/shuttleTypes'
import type { SessionInput } from '../lib/types'

function Harness({
  initial,
  shuttleTypes = [],
}: {
  initial: SessionInput
  shuttleTypes?: ShuttleType[]
}) {
  const [input, setInput] = useState(initial)
  return (
    <CostForm
      input={input}
      shuttleTypes={shuttleTypes}
      onPatch={(p) => setInput((s) => ({ ...s, ...p }))}
    />
  )
}

const base: SessionInput = {
  mode: 'ratio',
  shuttles: [{ id: 's1', name: '', count: 6, price: 25000 }],
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

  // 16 / 28
  test('adding a row, typing an amount, switching payer and deleting the row', () => {
    render(<Harness initial={withPlayers} />)
    // no summary line until there is at least one row
    expect(screen.queryByText('Phát sinh')).not.toBeInTheDocument()
    expect(screen.getByText('300.000đ')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+ Thêm khoản' }))
    const label = screen.getByLabelText('Tên khoản phát sinh')
    expect(label).toBeInTheDocument()
    // the new row defaults to the FIRST player only, never the whole group
    expect(screen.getByLabelText('Người trả khoản khác')).toHaveTextContent('Hùng')
    expect(label).toHaveFocus()

    fireEvent.change(screen.getByLabelText('Số tiền của khoản khác'), {
      target: { value: '20000' },
    })
    expect(screen.getByText('Phát sinh')).toBeInTheDocument()
    expect(screen.getByText('20.000đ')).toBeInTheDocument()
    expect(screen.getByText('320.000đ')).toBeInTheDocument() // TỔNG CHI

    // naming the row re-labels its money field and its payer field
    fireEvent.change(label, { target: { value: 'Nước' } })
    expect(screen.getByLabelText('Số tiền của Nước')).toBeInTheDocument()

    // switch to the whole group through the bottom sheet
    fireEvent.click(screen.getByLabelText('Người trả khoản Nước'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox', { name: 'Cả nhóm' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xong' }))
    expect(screen.getByLabelText('Người trả khoản Nước')).toHaveTextContent('Cả nhóm')
    // the whole 20.000 is still charged once — sharing does not multiply it
    expect(screen.getByText('320.000đ')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Xóa khoản Nước' }))
    expect(screen.queryByLabelText('Tên khoản phát sinh')).not.toBeInTheDocument()
    expect(screen.queryByText('Phát sinh')).not.toBeInTheDocument()
    expect(screen.getByText('300.000đ')).toBeInTheDocument()
  })

  // 28
  test('typing 100.000 shared by everyone moves "Phát sinh" and TỔNG CHI by the whole amount', () => {
    render(<Harness initial={withPlayers} />)
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm khoản' }))
    fireEvent.change(screen.getByLabelText('Tên khoản phát sinh'), { target: { value: 'Nước' } })
    fireEvent.change(screen.getByLabelText('Số tiền của Nước'), { target: { value: '100000' } })
    fireEvent.click(screen.getByLabelText('Người trả khoản Nước'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox', { name: 'Cả nhóm' }))

    expect(screen.getByText('100.000đ')).toBeInTheDocument() // dòng "Phát sinh"
    expect(screen.getByText('400.000đ')).toBeInTheDocument() // TỔNG CHI
  })

  test('changing the payers reports the new playerIds through onPatch', () => {
    const onPatch = vi.fn()
    render(
      <CostForm
        input={{
          ...withPlayers,
          extras: [{ id: 'e1', label: 'Nước', amount: 20000, playerIds: ['p1'] }],
        }}
        shuttleTypes={[]}
        onPatch={onPatch}
      />,
    )
    fireEvent.click(screen.getByLabelText('Người trả khoản Nước'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox', { name: 'Lan · Nữ' }))
    expect(onPatch).toHaveBeenCalledWith({
      extras: [{ id: 'e1', label: 'Nước', amount: 20000, playerIds: ['p1', 'p2'] }],
    })
  })

  test('the hint line explains that a shared cost is split per head', () => {
    render(<Harness initial={withPlayers} />)
    expect(screen.getByText('Chọn ai cùng chịu — chia đều theo đầu người')).toBeInTheDocument()
  })

  test('with nobody in the session the add button is disabled and explains why', () => {
    render(<Harness initial={base} />)
    expect(screen.getByRole('button', { name: '+ Thêm khoản' })).toBeDisabled()
    expect(screen.getByText('Thêm người chơi trước để gán khoản phát sinh')).toBeInTheDocument()
  })
})

describe('nhiều loại cầu', () => {
  test('thêm dòng, nhập số lượng và giá, tổng cộng đúng', () => {
    render(<Harness initial={base} />)
    expect(screen.getByText('150.000đ')).toBeInTheDocument() // tiền cầu 1 dòng

    fireEvent.click(screen.getByRole('button', { name: '+ Thêm loại cầu' }))
    const counts = screen.getAllByLabelText(/^Số quả của/)
    const prices = screen.getAllByLabelText(/^Giá \/ quả của/)
    expect(counts).toHaveLength(2)

    fireEvent.change(counts[1], { target: { value: '2' } })
    fireEvent.change(prices[1], { target: { value: '20000' } })

    expect(screen.getByText('190.000đ')).toBeInTheDocument() // tiền cầu
    expect(screen.getByText('340.000đ')).toBeInTheDocument() // TỔNG CHI
  })

  test('đặt tên loại cầu qua sheet rồi xóa dòng', () => {
    render(<Harness initial={base} />)
    fireEvent.click(screen.getByRole('button', { name: 'Loại cầu 1' }))
    fireEvent.change(screen.getByLabelText('Tên loại cầu'), { target: { value: 'Hải Yến' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xong' }))

    expect(screen.getByLabelText('Số quả của Hải Yến')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xóa Hải Yến' }))
    expect(screen.getByText('150.000đ')).toBeInTheDocument()
  })

  test('chọn gợi ý điền cả tên và giá', () => {
    render(
      <Harness
        initial={{ ...base, shuttles: [{ id: 's1', name: '', count: 2, price: 0 }] }}
        shuttleTypes={[{ name: 'Ba Sao', price: 20000 }]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Loại cầu 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chọn Ba Sao · 20.000đ' }))

    expect(screen.getByLabelText('Số quả của Ba Sao')).toBeInTheDocument()
    expect(screen.getByText('190.000đ')).toBeInTheDocument() // 40.000 cầu + 150.000 sân
  })

  test('gợi ý bỏ loại cầu đã có ở dòng khác', () => {
    render(
      <Harness
        initial={{
          ...base,
          shuttles: [
            { id: 's1', name: 'Ba Sao', count: 2, price: 20000 },
            { id: 's2', name: '', count: 0, price: 0 },
          ],
        }}
        shuttleTypes={[
          { name: 'Ba Sao', price: 20000 },
          { name: 'Hải Yến', price: 25000 },
        ]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Loại cầu 2' }))
    expect(screen.queryByRole('button', { name: 'Chọn Ba Sao · 20.000đ' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chọn Hải Yến · 25.000đ' })).toBeInTheDocument()
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

test('vuốt trái dòng loại cầu để xóa', () => {
  render(<Harness initial={{ ...base, shuttles: [{ id: 's1', name: 'Hải Yến', count: 6, price: 25000 }] }} />)
  const row = screen.getByTestId('shuttle-swipe-row-s1')
  fireEvent.touchStart(row, { touches: [{ clientX: 200, clientY: 100 }] })
  fireEvent.touchMove(row, { touches: [{ clientX: 100, clientY: 100 }] })
  fireEvent.touchEnd(row)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa nhanh Hải Yến' }))
  expect(screen.queryByLabelText('Số quả của Hải Yến')).not.toBeInTheDocument()
})

test('vuốt trái khoản phát sinh để xóa', () => {
  render(
    <Harness
      initial={{
        ...base,
        players: [{ id: 'p1', name: 'An', gender: 'male', paid: false, halfSession: false, startTime: null, endTime: null }],
        extras: [{ id: 'e1', label: 'Nước', amount: 20000, playerIds: ['p1'] }],
      }}
    />,
  )
  const row = screen.getByTestId('extra-swipe-row-e1')
  fireEvent.touchStart(row, { touches: [{ clientX: 200, clientY: 100 }] })
  fireEvent.touchMove(row, { touches: [{ clientX: 100, clientY: 100 }] })
  fireEvent.touchEnd(row)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa nhanh khoản Nước' }))
  expect(screen.queryByLabelText('Tên khoản phát sinh')).not.toBeInTheDocument()
})

test('gợi ý cách xóa cho cả hai loại thiết bị', () => {
  render(<Harness initial={base} />)
  expect(screen.getByText('💡 Vuốt trái một dòng để xóa')).toBeInTheDocument()
  expect(screen.getByText('💡 Bấm nút thùng rác đỏ để xóa một dòng')).toBeInTheDocument()
})
