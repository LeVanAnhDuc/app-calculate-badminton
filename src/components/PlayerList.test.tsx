import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
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
  const onChangeGender = (playerId: string, gender: Gender) => {
    setInput((s) => ({
      ...s,
      players: s.players.map((p) => (p.id === playerId ? { ...p, gender } : p)),
    }))
  }
  const onRenamePlayer = (playerId: string, newName: string) => {
    setInput((s) => ({
      ...s,
      players: s.players.map((p) => (p.id === playerId ? { ...p, name: newName } : p)),
    }))
  }
  return (
    <PlayerList
      input={input}
      roster={roster}
      onPatch={onPatch}
      onAddPlayer={onAddPlayer}
      onChangeGender={onChangeGender}
      onRenamePlayer={onRenamePlayer}
    />
  )
}

beforeEach(() => localStorage.clear())

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

test('roster suggestion fills name and gender', async () => {
  render(<Harness initial={base} roster={[{ name: 'Hoa', gender: 'female' }]} />)
  const nameInput = screen.getByPlaceholderText('Tên người chơi')
  fireEvent.change(nameInput, { target: { value: 'h' } })
  fireEvent.click(screen.getByRole('button', { name: /Hoa · Nữ/ }))
  // the suggestion dropdown exits with a motion fade/slide animation, which
  // keeps its (now-stale) "Hoa" button mounted in jsdom for a tick
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: /Hoa · Nữ/ })).not.toBeInTheDocument(),
  )
  expect(screen.getByText('Hoa')).toBeInTheDocument()
})

test('hourly mode shows default time; tapping the name opens the edit drawer', () => {
  render(<Harness initial={{ ...base, mode: 'hourly' }} />)
  expect(screen.getByText(/19:00–21:00 · cả buổi/)).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('Tuấn'))
  const drawer = screen.getByRole('dialog')
  expect(within(drawer).getByLabelText('Giờ vào của Tuấn')).toBeInTheDocument()
})

test('blocks empty names', () => {
  render(<Harness initial={base} />)
  const nameInput = screen.getByPlaceholderText('Tên người chơi')
  const addButton = screen.getByRole('button', { name: '+ Thêm người chơi' })

  // Try to add with empty input
  fireEvent.click(addButton)
  expect(screen.queryByText('undefined')).not.toBeInTheDocument()

  // Try to add with whitespace only
  fireEvent.change(nameInput, { target: { value: '   ' } })
  fireEvent.click(addButton)
  const playerCount = screen.getByText(/^1 nam · 0 nữ$/)
  expect(playerCount).toBeInTheDocument() // Count should still be 1 (only Tuấn)
})

test('time-bound coupling: typing start time auto-sets end time', () => {
  render(<Harness initial={{ ...base, mode: 'hourly' }} />)

  // Open the edit drawer
  fireEvent.click(screen.getByText('Tuấn'))
  const drawer = screen.getByRole('dialog')
  const startInput = within(drawer).getByLabelText('Giờ vào của Tuấn') as HTMLInputElement

  // Type a new start time
  fireEvent.change(startInput, { target: { value: '19:30' } })

  // Assert the time label changes from "cả buổi" to show the custom duration
  // Expected: "19:30–21:00 · 1.5 giờ" or similar
  expect(screen.queryByText(/cả buổi/)).not.toBeInTheDocument()
  expect(screen.getByText(/19:30–21:00/)).toBeInTheDocument()
})

test('clicking the gender badge toggles the player gender and updates the count chip', () => {
  render(<Harness initial={base} />)
  expect(screen.getByText(/^1 nam · 0 nữ$/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Đổi giới tính Tuấn' }))
  expect(screen.getByText(/^0 nam · 1 nữ$/)).toBeInTheDocument()
  // toggling back works too, and the badge button is still reachable by the same label
  fireEvent.click(screen.getByRole('button', { name: 'Đổi giới tính Tuấn' }))
  expect(screen.getByText(/^1 nam · 0 nữ$/)).toBeInTheDocument()
})

test('gender toggle does not reset other player fields', () => {
  render(<Harness initial={base} />)
  fireEvent.click(screen.getByRole('button', { name: '½ buổi Tuấn' }))
  expect(screen.getByText('½ buổi ✓')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Đổi giới tính Tuấn' }))
  expect(screen.getByText('½ buổi ✓')).toBeInTheDocument()
})

test('swipe-left on a row reveals the red Xóa button; tapping it removes the player', () => {
  render(<Harness initial={base} />)
  const row = screen.getByTestId('swipe-row-1')
  fireEvent.touchStart(row, { touches: [{ clientX: 200 }] })
  fireEvent.touchMove(row, { touches: [{ clientX: 100 }] })
  fireEvent.touchEnd(row)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa nhanh Tuấn' }))
  expect(screen.queryByText('Tuấn')).not.toBeInTheDocument()
})

test('rename via edit drawer commits on blur; duplicate name is blocked', () => {
  const initial: SessionInput = {
    ...base,
    players: [
      ...base.players,
      { id: '2', name: 'Lan', gender: 'female', halfSession: false, startTime: null, endTime: null },
    ],
  }
  render(<Harness initial={initial} />)

  // open the edit drawer by tapping the name
  fireEvent.click(screen.getByText('Tuấn'))
  const drawer = screen.getByRole('dialog')
  const nameInput = within(drawer).getByLabelText('Tên của Tuấn') as HTMLInputElement

  // committing a valid new name on blur renames the player
  fireEvent.change(nameInput, { target: { value: 'Nam Anh' } })
  fireEvent.blur(nameInput)
  expect(screen.getByText('Nam Anh')).toBeInTheDocument()
  expect(screen.queryByText('Tuấn')).not.toBeInTheDocument()

  // attempting to rename to an existing name is blocked with an inline error
  fireEvent.change(nameInput, { target: { value: 'lan' } })
  fireEvent.blur(nameInput)
  expect(within(drawer).getByText('"lan" đã có trong buổi')).toBeInTheDocument()
  expect(screen.getByText('Nam Anh')).toBeInTheDocument()
})

test('blank rename reverts to the original name without an error', () => {
  render(<Harness initial={base} />)
  fireEvent.click(screen.getByText('Tuấn'))
  const drawer = screen.getByRole('dialog')
  const nameInput = within(drawer).getByLabelText('Tên của Tuấn') as HTMLInputElement
  fireEvent.change(nameInput, { target: { value: '   ' } })
  fireEvent.blur(nameInput)
  expect(screen.getByText('Tuấn')).toBeInTheDocument()
  expect(screen.queryByText(/đã có trong buổi/)).not.toBeInTheDocument()
})

test('Xong closes the edit drawer', () => {
  render(<Harness initial={base} />)
  fireEvent.click(screen.getByText('Tuấn'))
  const drawer = screen.getByRole('dialog')
  fireEvent.click(within(drawer).getByRole('button', { name: 'Xong' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('swipe no longer reveals a Sửa button — only Xóa', () => {
  render(<Harness initial={{ ...base, mode: 'hourly' }} />)
  const row = screen.getByTestId('swipe-row-1')
  fireEvent.touchStart(row, { touches: [{ clientX: 200 }] })
  fireEvent.touchMove(row, { touches: [{ clientX: 20 }] })
  fireEvent.touchEnd(row)
  expect(screen.queryByRole('button', { name: /^Sửa nhanh/ })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Xóa nhanh Tuấn' })).toBeInTheDocument()
})

test('no per-row Nam/Nữ segmented switch remains; the edit drawer still has one', () => {
  render(<Harness initial={base} />)
  expect(screen.queryByRole('button', { name: 'Nam Tuấn' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Nữ Tuấn' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('Tuấn'))
  const drawer = screen.getByRole('dialog')
  expect(within(drawer).getByRole('button', { name: 'Đặt Nam cho Tuấn' })).toBeInTheDocument()
  expect(within(drawer).getByRole('button', { name: 'Đặt Nữ cho Tuấn' })).toBeInTheDocument()
  // the segmented gender switch inside the drawer still works
  fireEvent.click(within(drawer).getByRole('button', { name: 'Đặt Nữ cho Tuấn' }))
  expect(screen.getByText(/^0 nam · 1 nữ$/)).toBeInTheDocument()
})

test('empty player list shows a centered hint instead of an empty list', () => {
  render(<Harness initial={{ ...base, players: [] }} />)
  expect(screen.getByText('Chưa có người chơi nào')).toBeInTheDocument()
})

test('hint banner is always visible, one tip per line, with no dismiss button', () => {
  render(<Harness initial={base} />)
  expect(screen.getByText('💡 Bấm avatar để đổi giới tính')).toBeInTheDocument()
  expect(screen.getByText('💡 Bấm tên để sửa thông tin người chơi')).toBeInTheDocument()
  expect(screen.getByText('💡 Vuốt trái để xóa')).toBeInTheDocument()
  expect(screen.getByText('💡 Bấm nút × để xóa')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Đóng gợi ý' })).not.toBeInTheDocument()
})

test('the edit drawer renders as a bottom sheet outside the swipe-clipped (overflow-hidden) row', () => {
  render(<Harness initial={{ ...base, mode: 'hourly' }} />)
  fireEvent.click(screen.getByText('Tuấn'))
  const drawer = screen.getByRole('dialog')
  const startInput = within(drawer).getByLabelText('Giờ vào của Tuấn')
  // the drawer content is portaled out of the swipe row's clipped container
  expect(startInput.closest('.overflow-hidden')).toBeNull()
  expect(drawer.closest('[data-testid^="swipe-row-"]')).toBeNull()
  // it renders as a rounded-top bottom sheet with a drag handle
  expect(drawer).toHaveClass('rounded-t-3xl')
})

test('cả buổi button resets time labels', () => {
  render(<Harness initial={{ ...base, mode: 'hourly' }} />)

  // Open the edit drawer
  fireEvent.click(screen.getByText('Tuấn'))
  const drawer = screen.getByRole('dialog')
  const startInput = within(drawer).getByLabelText('Giờ vào của Tuấn') as HTMLInputElement

  // Set a custom start time
  fireEvent.change(startInput, { target: { value: '19:30' } })
  expect(screen.getByText(/19:30–21:00/)).toBeInTheDocument()

  // Click "Cả buổi" button to reset
  fireEvent.click(within(drawer).getByRole('button', { name: 'Cả buổi' }))

  // Assert label is back to "cả buổi"
  expect(screen.getByText(/19:00–21:00 · cả buổi/)).toBeInTheDocument()
})
