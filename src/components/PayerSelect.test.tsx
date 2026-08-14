import { render, screen, fireEvent, within } from '@testing-library/react'
import { useState } from 'react'
import { PayerSelect, payerSummary } from './PayerSelect'
import type { Player } from '../lib/types'

const player = (id: string, name: string, gender: Player['gender'] = 'male'): Player => ({
  id,
  name,
  gender,
  halfSession: false,
  startTime: null,
  endTime: null,
  paid: false,
})

const three = [player('1', 'An'), player('2', 'Bình'), player('3', 'Hoa', 'female')]

function Harness({ initial, players = three }: { initial: string[]; players?: Player[] }) {
  const [value, setValue] = useState(initial)
  return (
    <PayerSelect
      players={players}
      value={value}
      onChange={setValue}
      aria-label="Người trả khoản Nước"
    />
  )
}

// 27
describe('payerSummary', () => {
  test('renders the empty, single, partial and full cases', () => {
    expect(payerSummary(three, [])).toBe('Chọn người trả')
    expect(payerSummary(three, ['id-rac'])).toBe('Chọn người trả')
    expect(payerSummary(three, ['2'])).toBe('Bình')
    expect(payerSummary(three, ['1', '2'])).toBe('An +1')
    expect(payerSummary(three, ['1', '2', '3'])).toBe('Cả nhóm')
  })

  test('follows the players order, not the order the ids were ticked', () => {
    expect(payerSummary(three, ['3', '1'])).toBe('An +1')
  })

  test('takes a custom empty label (HistoryPage shows "?" for hand-edited data)', () => {
    expect(payerSummary(three, [], '?')).toBe('?')
  })
})

// 27
test('the trigger shows the summary and greys out while nobody is picked', () => {
  render(<Harness initial={[]} />)
  const trigger = screen.getByLabelText('Người trả khoản Nước')
  expect(trigger).toHaveTextContent('Chọn người trả')
  expect(trigger).toHaveClass('text-gray-400')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('the trigger shows a name once someone is picked', () => {
  render(<Harness initial={['2']} />)
  expect(screen.getByLabelText('Người trả khoản Nước')).toHaveTextContent('Bình')
})

// 26
test('ticking a second player applies immediately, without waiting for "Xong"', () => {
  const onChange = vi.fn()
  render(
    <PayerSelect
      players={three}
      value={['1']}
      onChange={onChange}
      aria-label="Người trả khoản Nước"
    />,
  )
  fireEvent.click(screen.getByLabelText('Người trả khoản Nước'))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText('Người trả khoản Nước')).toBeInTheDocument() // sheet title

  fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Bình · Nam' }))
  expect(onChange).toHaveBeenCalledWith(['1', '2'])
})

// 26
test('unticking a player removes just that id', () => {
  const onChange = vi.fn()
  render(
    <PayerSelect
      players={three}
      value={['1', '2']}
      onChange={onChange}
      aria-label="Người trả khoản Nước"
    />,
  )
  fireEvent.click(screen.getByLabelText('Người trả khoản Nước'))
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('checkbox', { name: 'An · Nam' }),
  )
  expect(onChange).toHaveBeenCalledWith(['2'])
})

// 26
test('"Cả nhóm" selects everyone in players order, and clears the lot when tapped again', () => {
  const onChange = vi.fn()
  const { rerender } = render(
    <PayerSelect players={three} value={['1']} onChange={onChange} aria-label="Người trả khoản Nước" />,
  )
  fireEvent.click(screen.getByLabelText('Người trả khoản Nước'))
  const all = () => within(screen.getByRole('dialog')).getByRole('checkbox', { name: 'Cả nhóm' })
  expect(all()).toHaveAttribute('aria-checked', 'false')
  fireEvent.click(all())
  expect(onChange).toHaveBeenLastCalledWith(['1', '2', '3'])

  rerender(
    <PayerSelect
      players={three}
      value={['1', '2', '3']}
      onChange={onChange}
      aria-label="Người trả khoản Nước"
    />,
  )
  expect(all()).toHaveAttribute('aria-checked', 'true')
  fireEvent.click(all())
  expect(onChange).toHaveBeenLastCalledWith([])
})

// 26
test('"Xong" only closes the sheet — the ticks made along the way are kept', () => {
  render(<Harness initial={['1']} />)
  fireEvent.click(screen.getByLabelText('Người trả khoản Nước'))
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('checkbox', { name: 'Hoa · Nữ' }),
  )
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xong' }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Người trả khoản Nước')).toHaveTextContent('An +1')
})

test('dismissing with Esc keeps the ticks too — there is no cancel here', () => {
  render(<Harness initial={['1']} />)
  fireEvent.click(screen.getByLabelText('Người trả khoản Nước'))
  const dialog = screen.getByRole('dialog')
  fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Bình · Nam' }))
  fireEvent.keyDown(dialog, { key: 'Escape' })

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Người trả khoản Nước')).toHaveTextContent('An +1')
})

test('unticking everyone inside the sheet is allowed; the trigger reports the empty state', () => {
  render(<Harness initial={['1', '2', '3']} />)
  fireEvent.click(screen.getByLabelText('Người trả khoản Nước'))
  const dialog = screen.getByRole('dialog')
  fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Cả nhóm' }))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Xong' }))
  expect(screen.getByLabelText('Người trả khoản Nước')).toHaveTextContent('Chọn người trả')
})
