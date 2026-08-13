import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { PlayerList } from './PlayerList'
import type { Gender, Player, SessionInput } from '../lib/types'
import type { RosterEntry } from '../lib/storage'

function Harness({ initial, roster = [] }: { initial: SessionInput; roster?: RosterEntry[] }) {
  const [input, setInput] = useState(initial)
  const onPatch = (p: Partial<SessionInput>) => setInput((s) => ({ ...s, ...p }))
  const onAddPlayer = (name: string, gender: Gender) => {
    const player: Player = {
      id: name,
      name,
      gender,
      halfSession: false,
      startTime: null,
      endTime: null,
    }
    setInput((s) => ({ ...s, players: [...s.players, player] }))
  }
  return <PlayerList input={input} roster={roster} onPatch={onPatch} onAddPlayer={onAddPlayer} />
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
  players: [
    { id: '1', name: 'Tuấn', gender: 'male', halfSession: false, startTime: null, endTime: null },
  ],
}

test('adds a player and blocks duplicates', () => {
  render(<Harness initial={base} />)
  const nameInput = screen.getByPlaceholderText('Tên người chơi')
  fireEvent.change(nameInput, { target: { value: 'Lan' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  expect(screen.getByText('Lan')).toBeInTheDocument()

  fireEvent.change(nameInput, { target: { value: 'tuấn' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  expect(screen.getByText(/đã có trong buổi/)).toBeInTheDocument()
})

test('remove button removes from session', () => {
  render(<Harness initial={base} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa Tuấn' }))
  expect(screen.queryByText('Tuấn')).not.toBeInTheDocument()
})

test('half-session pill toggles in ratio mode', () => {
  render(<Harness initial={base} />)
  const pill = screen.getByRole('button', { name: '½ buổi Tuấn' })
  fireEvent.click(pill)
  expect(screen.getByText('½ buổi ✓')).toBeInTheDocument()
})

test('roster suggestion fills name and gender', () => {
  render(<Harness initial={base} roster={[{ name: 'Hoa', gender: 'female' }]} />)
  const nameInput = screen.getByPlaceholderText('Tên người chơi')
  fireEvent.change(nameInput, { target: { value: 'h' } })
  fireEvent.click(screen.getByRole('button', { name: /Hoa · Nữ/ }))
  expect(screen.getByText('Hoa')).toBeInTheDocument()
})

test('hourly mode shows default time and expands editor', () => {
  render(<Harness initial={{ ...base, mode: 'hourly' }} />)
  expect(screen.getByText(/19:00–21:00 · cả buổi/)).toBeInTheDocument()
  fireEvent.click(screen.getByText('Tuấn'))
  expect(screen.getByLabelText('Giờ vào của Tuấn')).toBeInTheDocument()
})
