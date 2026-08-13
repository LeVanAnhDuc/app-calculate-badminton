import { render, screen, fireEvent, within } from '@testing-library/react'
import { useState } from 'react'
import { TimeSelect } from './TimeSelect'

function Harness({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial)
  return <TimeSelect aria-label="Giờ vào" value={value} onChange={setValue} />
}

function pickHour(dialog: HTMLElement, hour: string) {
  const column = within(dialog).getByTestId('time-wheel-hour')
  fireEvent.click(within(column).getByText(hour))
}

function pickMinute(dialog: HTMLElement, minute: string) {
  const column = within(dialog).getByTestId('time-wheel-minute')
  fireEvent.click(within(column).getByText(minute))
}

test('shows the current value on a button and never renders AM/PM anywhere', () => {
  render(<Harness initial="19:00" />)
  const button = screen.getByLabelText('Giờ vào')
  expect(button).toHaveTextContent('19:00')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByText(/AM|PM/)).not.toBeInTheDocument()
})

test('tapping the button opens a wheel sheet; picking hour+minute and confirming with Xong commits the value', () => {
  render(<Harness initial="19:00" />)
  fireEvent.click(screen.getByLabelText('Giờ vào'))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText('Giờ vào')).toBeInTheDocument() // sheet title

  pickHour(dialog, '07')
  pickMinute(dialog, '45')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Xong' }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Giờ vào')).toHaveTextContent('07:45')
})

test('closing the sheet without Xong (Esc) cancels — the old value is kept', () => {
  render(<Harness initial="19:00" />)
  fireEvent.click(screen.getByLabelText('Giờ vào'))
  const dialog = screen.getByRole('dialog')
  pickHour(dialog, '23')

  // dismiss without confirming — vaul/Radix close the sheet on Escape same
  // as overlay-tap/drag-down, none of which call onChange
  fireEvent.keyDown(dialog, { key: 'Escape' })

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Giờ vào')).toHaveTextContent('19:00')
})

test('reopening the sheet after a cancelled edit starts from the committed value again', () => {
  render(<Harness initial="19:00" />)
  fireEvent.click(screen.getByLabelText('Giờ vào'))
  let dialog = screen.getByRole('dialog')
  pickHour(dialog, '23')
  fireEvent.keyDown(dialog, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  fireEvent.click(screen.getByLabelText('Giờ vào'))
  dialog = screen.getByRole('dialog')
  const hourColumn = within(dialog).getByTestId('time-wheel-hour')
  // the wheel resets to "19", not the cancelled "23"
  expect(within(hourColumn).getByText('19')).toBeInTheDocument()
})

test('an off-grid stored minute (not a multiple of 5) shows up as its own wheel item instead of snapping to the nearest step', () => {
  render(<Harness initial="19:07" />)
  fireEvent.click(screen.getByLabelText('Giờ vào'))
  const dialog = screen.getByRole('dialog')
  const minuteColumn = within(dialog).getByTestId('time-wheel-minute')
  expect(within(minuteColumn).getByText('07')).toBeInTheDocument()
})
