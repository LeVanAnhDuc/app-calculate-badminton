import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { MoneyInput } from './MoneyInput'

function Harness({ initial }: { initial: number }) {
  const [value, setValue] = useState(initial)
  return <MoneyInput aria-label="Tiền sân" value={value} onChange={setValue} />
}

test('formats the value with thousands separators', () => {
  render(<Harness initial={300000} />)
  const input = screen.getByLabelText('Tiền sân') as HTMLInputElement
  expect(input.value).toBe('300.000')
})

test('typing a digit in the middle of the formatted value reformats correctly and does not push the caret to the end', () => {
  render(<Harness initial={300000} />)
  const input = screen.getByLabelText('Tiền sân') as HTMLInputElement
  expect(input.value).toBe('300.000')

  // Simulate the browser having already spliced a new "5" into the displayed
  // "300.000" right after "300" (before the "." separator), with the caret
  // landing right after the inserted digit.
  fireEvent.change(input, { target: { value: '3005.000', selectionStart: 4 } })

  expect(input.value).toBe('3.005.000')
  // The caret should sit right after the newly typed digit, not at the end.
  expect(input.selectionStart).toBe(5)
  expect(input.selectionStart).not.toBe(input.value.length)
})

test('clearing the input reports 0 without crashing', () => {
  render(<Harness initial={300000} />)
  const input = screen.getByLabelText('Tiền sân') as HTMLInputElement
  fireEvent.change(input, { target: { value: '', selectionStart: 0 } })
  expect(input.value).toBe('')
})
