import { render, screen, fireEvent, within } from '@testing-library/react'
import { useState } from 'react'
import { TimeSelect } from './TimeSelect'

function Harness({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial)
  return <TimeSelect aria-label="Giờ vào" value={value} onChange={setValue} />
}

test('renders 24h hour options (no AM/PM) and reflects the current value', () => {
  render(<Harness initial="19:00" />)
  expect(screen.getByLabelText('Giờ vào')).toBeInTheDocument()
  expect(screen.getByLabelText('Giờ vào (giờ)')).toHaveValue('19')
  expect(screen.getByLabelText('Giờ vào (phút)')).toHaveValue('00')
  // a couple of 24h-only hours must be present as plain zero-padded numbers
  expect(screen.getByRole('option', { name: '23' })).toBeInTheDocument()
  expect(screen.queryByText(/AM|PM/)).not.toBeInTheDocument()
})

test('changing the hour keeps the minute and produces an "HH:mm" string', () => {
  render(<Harness initial="19:30" />)
  fireEvent.change(screen.getByLabelText('Giờ vào (giờ)'), { target: { value: '07' } })
  expect(screen.getByLabelText('Giờ vào (giờ)')).toHaveValue('07')
  expect(screen.getByLabelText('Giờ vào (phút)')).toHaveValue('30')
})

test('changing the minute keeps the hour and produces an "HH:mm" string', () => {
  render(<Harness initial="19:00" />)
  fireEvent.change(screen.getByLabelText('Giờ vào (phút)'), { target: { value: '45' } })
  expect(screen.getByLabelText('Giờ vào (giờ)')).toHaveValue('19')
  expect(screen.getByLabelText('Giờ vào (phút)')).toHaveValue('45')
})

test('an off-grid stored minute (not a multiple of 5) is kept as an extra option instead of being silently changed', () => {
  render(<Harness initial="19:07" />)
  const minuteSelect = screen.getByLabelText('Giờ vào (phút)')
  expect(minuteSelect).toHaveValue('07')
  expect(within(minuteSelect).getByRole('option', { name: '07' })).toBeInTheDocument()
})
