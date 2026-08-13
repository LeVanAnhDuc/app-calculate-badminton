import { render, screen, fireEvent } from '@testing-library/react'
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
