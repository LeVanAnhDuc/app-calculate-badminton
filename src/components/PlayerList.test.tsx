import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { PlayerList } from './PlayerList'
import type { Gender, Player, SessionInput } from '../lib/types'
import type { RosterEntry } from '../lib/storage'

function Harness({
  initial,
  roster = [],
  frequent = [],
  onRemovePlayer,
  onAdd,
}: {
  initial: SessionInput
  roster?: RosterEntry[]
  frequent?: RosterEntry[]
  onRemovePlayer?: (playerId: string) => void
  onAdd?: (name: string, gender: Gender) => void
}) {
  const [input, setInput] = useState(initial)
  const onPatch = (p: Partial<SessionInput>) => setInput((s) => ({ ...s, ...p }))
  // App owns the real removal (plus its "Hoàn tác" toast); the harness stands
  // in for it so the list still shrinks in these component-level tests
  const removePlayer = (playerId: string) => {
    onRemovePlayer?.(playerId)
    setInput((s) => ({ ...s, players: s.players.filter((p) => p.id !== playerId) }))
  }
  const onAddPlayer = (name: string, gender: Gender) => {
    onAdd?.(name, gender)
    const player: Player = {
      id: name,
      name,
      gender,
      halfSession: false,
      startTime: null,
      endTime: null,
      paid: false,
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
      frequent={frequent}
      onPatch={onPatch}
      onAddPlayer={onAddPlayer}
      onRemovePlayer={removePlayer}
      onChangeGender={onChangeGender}
      onRenamePlayer={onRenamePlayer}
    />
  )
}

beforeEach(() => localStorage.clear())

const base: SessionInput = {
  mode: 'ratio',
  shuttles: [{ id: 's1', name: '', count: 6, price: 25000 }],
  courtFee: 150000,
  courtStart: '19:00',
  courtEnd: '21:00',
  maleRatio: 1.5,
  femaleRatio: 1,
  rounding: 'up1000',
  players: [
    { id: '1', name: 'Tuấn', gender: 'male', halfSession: false, startTime: null, endTime: null, paid: false },
  ],
  extras: [],
}

test('adds a player and blocks duplicates', () => {
  render(<Harness initial={base} />)
  const nameInput = screen.getByPlaceholderText('Tìm hoặc thêm tên')
  fireEvent.change(nameInput, { target: { value: 'Lan' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  expect(screen.getByText('Lan')).toBeInTheDocument()

  fireEvent.change(nameInput, { target: { value: 'tuấn' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  expect(screen.getByText(/đã có trong buổi/)).toBeInTheDocument()
})

test('remove button reports the player id via onRemovePlayer instead of patching the list itself', () => {
  const onRemovePlayer = vi.fn()
  render(<Harness initial={base} onRemovePlayer={onRemovePlayer} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa Tuấn' }))
  expect(onRemovePlayer).toHaveBeenCalledWith('1')
  expect(screen.queryByText('Tuấn')).not.toBeInTheDocument()
})

test('the quick (swipe) delete button also goes through onRemovePlayer', () => {
  const onRemovePlayer = vi.fn()
  render(<Harness initial={base} onRemovePlayer={onRemovePlayer} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa nhanh Tuấn' }))
  expect(onRemovePlayer).toHaveBeenCalledWith('1')
})

test('no window.confirm is shown before deleting a player', () => {
  const confirmSpy = vi.spyOn(window, 'confirm')
  render(<Harness initial={base} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa Tuấn' }))
  expect(confirmSpy).not.toHaveBeenCalled()
  confirmSpy.mockRestore()
})

test('half-session pill toggles in ratio mode', () => {
  render(<Harness initial={base} />)
  const pill = screen.getByRole('button', { name: '½ buổi Tuấn' })
  fireEvent.click(pill)
  expect(screen.getByText('½ buổi ✓')).toBeInTheDocument()
})

test('typing a brand-new name shows the "Người mới" hint', () => {
  render(<Harness initial={base} roster={[{ name: 'Hoa', gender: 'female' }]} />)
  const nameInput = screen.getByPlaceholderText('Tìm hoặc thêm tên')
  fireEvent.change(nameInput, { target: { value: 'Minh' } })
  expect(screen.getByText('✨ Người mới — sẽ được thêm vào danh bạ')).toBeInTheDocument()
  expect(screen.queryByText(/Có trong danh bạ/)).not.toBeInTheDocument()
})

test('typing an existing roster name (case-insensitive) shows the "Có trong danh bạ" hint', () => {
  render(<Harness initial={base} roster={[{ name: 'Hoa', gender: 'female' }]} />)
  const nameInput = screen.getByPlaceholderText('Tìm hoặc thêm tên')
  fireEvent.change(nameInput, { target: { value: 'hoa' } })
  expect(
    screen.getByText('📇 Có trong danh bạ — bấm thẻ gợi ý để thêm đúng giới tính'),
  ).toBeInTheDocument()
  expect(screen.queryByText(/Người mới/)).not.toBeInTheDocument()
})

test('suggestion dropdown shows a "Từ danh bạ" header above the cards', () => {
  render(<Harness initial={base} roster={[{ name: 'Hoa', gender: 'female' }]} />)
  const nameInput = screen.getByPlaceholderText('Tìm hoặc thêm tên')
  fireEvent.change(nameInput, { target: { value: 'h' } })
  expect(screen.getByText('Từ danh bạ')).toBeInTheDocument()
})

test('no roster hint at all when the input is empty', () => {
  render(<Harness initial={base} roster={[{ name: 'Hoa', gender: 'female' }]} />)
  expect(screen.queryByText(/Người mới/)).not.toBeInTheDocument()
  expect(screen.queryByText(/Có trong danh bạ/)).not.toBeInTheDocument()
})

test('roster suggestion fills name and gender', async () => {
  render(<Harness initial={base} roster={[{ name: 'Hoa', gender: 'female' }]} />)
  const nameInput = screen.getByPlaceholderText('Tìm hoặc thêm tên')
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
  const nameInput = screen.getByPlaceholderText('Tìm hoặc thêm tên')
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

/**
 * Opens the nested time-wheel sheet from inside the already-open edit
 * drawer (by clicking the TimeSelect trigger button with the given
 * aria-label), picks hour/minute values, and confirms with "Xong" —
 * verifying vaul's nested-drawer support. While the nested sheet is open,
 * Radix marks the outer drawer aria-hidden (standard modal-on-modal
 * behavior), so `getByRole('dialog')` resolves to the topmost (nested) one;
 * once it closes, the same query resolves back to the (still-mounted) edit
 * drawer underneath.
 */
function pickTimeInNestedSheet(triggerLabel: string, hour: string, minute: string) {
  fireEvent.click(screen.getByRole('button', { name: triggerLabel }))
  const sheet = screen.getByRole('dialog')
  expect(within(sheet).getByText(triggerLabel)).toBeInTheDocument() // sheet title

  fireEvent.click(within(within(sheet).getByTestId('time-wheel-hour')).getByText(hour))
  fireEvent.click(within(within(sheet).getByTestId('time-wheel-minute')).getByText(minute))
  fireEvent.click(within(sheet).getByRole('button', { name: 'Xong' }))

  // the nested sheet closes; only the edit drawer remains
  expect(screen.getAllByRole('dialog')).toHaveLength(1)
}

test('time-bound coupling: nested time-wheel sheet commits into the edit drawer, which stays open', () => {
  render(<Harness initial={{ ...base, mode: 'hourly' }} />)

  // Open the edit drawer
  fireEvent.click(screen.getByText('Tuấn'))
  const drawer = screen.getByRole('dialog')

  // Open the nested "Giờ vào của Tuấn" wheel sheet, pick 19:30, confirm
  pickTimeInNestedSheet('Giờ vào của Tuấn', '19', '30')

  // the edit drawer (outer dialog) is still open, showing the new time
  expect(screen.getByRole('dialog')).toBe(drawer)
  expect(within(drawer).getByRole('button', { name: 'Giờ vào của Tuấn' })).toHaveTextContent(
    '19:30',
  )

  // Assert the row label changes from "cả buổi" to show the custom duration
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

test('swipe gesture does not trigger a setState-in-render React error', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    render(<Harness initial={base} />)
    const row = screen.getByTestId('swipe-row-1')
    fireEvent.touchStart(row, { touches: [{ clientX: 200 }] })
    fireEvent.touchMove(row, { touches: [{ clientX: 100 }] })
    fireEvent.touchEnd(row)
    const renderPhaseErrors = errorSpy.mock.calls.filter((args) =>
      args.some((a) => typeof a === 'string' && a.includes('while rendering a different component')),
    )
    expect(renderPhaseErrors).toEqual([])
  } finally {
    errorSpy.mockRestore()
  }
})

test('rename via edit drawer commits on blur; duplicate name is blocked', () => {
  const initial: SessionInput = {
    ...base,
    players: [
      ...base.players,
      { id: '2', name: 'Lan', gender: 'female', halfSession: false, startTime: null, endTime: null, paid: false },
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
  expect(screen.getByText('💡 Bấm nút thùng rác đỏ để xóa')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Đóng gợi ý' })).not.toBeInTheDocument()
})

test('the edit drawer renders as a bottom sheet outside the swipe-clipped (overflow-hidden) row', () => {
  render(<Harness initial={{ ...base, mode: 'hourly' }} />)
  fireEvent.click(screen.getByText('Tuấn'))
  const drawer = screen.getByRole('dialog')
  const timeButton = within(drawer).getByLabelText('Giờ vào của Tuấn')
  // the drawer content is portaled out of the swipe row's clipped container
  expect(timeButton.closest('.overflow-hidden')).toBeNull()
  expect(drawer.closest('[data-testid^="swipe-row-"]')).toBeNull()
  // it renders as a rounded-top bottom sheet with a drag handle
  expect(drawer).toHaveClass('rounded-t-3xl')
})

test('cả buổi button resets time labels', () => {
  render(<Harness initial={{ ...base, mode: 'hourly' }} />)

  // Open the edit drawer
  fireEvent.click(screen.getByText('Tuấn'))
  const drawer = screen.getByRole('dialog')

  // Set a custom start time via the nested wheel sheet
  pickTimeInNestedSheet('Giờ vào của Tuấn', '19', '30')
  expect(screen.getByText(/19:30–21:00/)).toBeInTheDocument()

  // Click "Cả buổi" button to reset
  fireEvent.click(within(drawer).getByRole('button', { name: 'Cả buổi' }))

  // Assert label is back to "cả buổi"
  expect(screen.getByText(/19:00–21:00 · cả buổi/)).toBeInTheDocument()
})

test('each row has a drag handle labeled "Sắp xếp {tên}" with touch-action none', () => {
  const initial: SessionInput = {
    ...base,
    players: [
      ...base.players,
      { id: '2', name: 'Lan', gender: 'female', halfSession: false, startTime: null, endTime: null, paid: false },
    ],
  }
  render(<Harness initial={initial} />)
  const handle = screen.getByRole('button', { name: 'Sắp xếp Tuấn' })
  expect(handle).toBeInTheDocument()
  expect(handle).toHaveClass('touch-none')
  expect(screen.getByRole('button', { name: 'Sắp xếp Lan' })).toBeInTheDocument()
})

test('hint banner mentions drag-to-reorder', () => {
  render(<Harness initial={base} />)
  expect(screen.getByText('💡 Kéo ⠿ để sắp xếp thứ tự')).toBeInTheDocument()
})

test('players render as list items inside a list, in players-array order', () => {
  const initial: SessionInput = {
    ...base,
    players: [
      ...base.players,
      { id: '2', name: 'Lan', gender: 'female', halfSession: false, startTime: null, endTime: null, paid: false },
    ],
  }
  render(<Harness initial={initial} />)
  const items = screen.getAllByRole('listitem')
  expect(items[0]).toHaveTextContent('Tuấn')
  expect(items[1]).toHaveTextContent('Lan')
})

const frequent: RosterEntry[] = [
  { name: 'Hùng', gender: 'male' },
  { name: 'Hoa', gender: 'female' },
]

test('frequent chips render under a "Hay chơi cùng" label while the name input is empty', () => {
  render(<Harness initial={base} frequent={frequent} />)
  expect(screen.getByText('Hay chơi cùng')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Thêm Hùng · Nam' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Thêm Hoa · Nữ' })).toBeInTheDocument()
})

test('no frequent chips when there is nobody to suggest', () => {
  render(<Harness initial={base} />)
  expect(screen.queryByText('Hay chơi cùng')).not.toBeInTheDocument()
})

test('frequent chips disappear once the user types — roster suggestions take over', async () => {
  render(<Harness initial={base} roster={[{ name: 'Hoa', gender: 'female' }]} frequent={frequent} />)
  fireEvent.change(screen.getByPlaceholderText('Tìm hoặc thêm tên'), { target: { value: 'h' } })
  // the chip row exits with a motion fade, so it stays mounted for a tick
  await waitFor(() => expect(screen.queryByText('Hay chơi cùng')).not.toBeInTheDocument())
  expect(screen.getByText('Từ danh bạ')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Hoa · Nữ' })).toBeInTheDocument()
})

test('tapping a frequent chip adds that person with the chip gender', async () => {
  const onAdd = vi.fn()
  render(<Harness initial={base} frequent={frequent} onAdd={onAdd} />)
  fireEvent.click(screen.getByRole('button', { name: 'Thêm Hoa · Nữ' }))
  expect(onAdd).toHaveBeenCalledWith('Hoa', 'female')
  await waitFor(() => expect(screen.getByText(/^1 nam · 1 nữ$/)).toBeInTheDocument())
})

/**
 * Trên mobile cặp [Nam][Nữ] và nút "+ Thêm người chơi" bị ẩn, nên một cái tên
 * mới phải thêm được ngay từ danh sách gợi ý — mỗi giới tính một hàng.
 */
test('typing a brand-new name offers a one-tap add row per gender', () => {
  const onAdd = vi.fn()
  render(<Harness initial={base} onAdd={onAdd} />)
  fireEvent.change(screen.getByPlaceholderText('Tìm hoặc thêm tên'), { target: { value: 'Minh' } })

  expect(screen.getByRole('button', { name: 'Thêm "Minh" là người mới · Nam' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Thêm "Minh" là người mới · Nữ' }))
  expect(onAdd).toHaveBeenCalledWith('Minh', 'female')
})

test('no add rows for a name already in the roster — the roster card carries the right gender', () => {
  render(<Harness initial={base} roster={[{ name: 'Hoa', gender: 'female' }]} />)
  fireEvent.change(screen.getByPlaceholderText('Tìm hoặc thêm tên'), { target: { value: 'hoa' } })
  expect(screen.queryByRole('button', { name: /là người mới/ })).not.toBeInTheDocument()
})

test('a name already in the session says so instead of leaving an empty result list', () => {
  render(<Harness initial={base} />)
  fireEvent.change(screen.getByPlaceholderText('Tìm hoặc thêm tên'), { target: { value: 'tuấn' } })
  expect(screen.getByText(/đang có trong buổi rồi/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /là người mới/ })).not.toBeInTheDocument()
})

test('the clear button empties the search field', () => {
  render(<Harness initial={base} />)
  const nameInput = screen.getByPlaceholderText('Tìm hoặc thêm tên')
  fireEvent.change(nameInput, { target: { value: 'Minh' } })
  fireEvent.click(screen.getByRole('button', { name: 'Xóa chữ đã gõ' }))
  expect(nameInput).toHaveValue('')
})

test('"Hủy" only shows once the field is in use, and resets it', async () => {
  render(<Harness initial={base} />)
  const nameInput = screen.getByPlaceholderText('Tìm hoặc thêm tên')
  expect(screen.queryByRole('button', { name: 'Hủy' })).not.toBeInTheDocument()

  fireEvent.focus(nameInput)
  fireEvent.change(nameInput, { target: { value: 'Minh' } })
  fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))

  expect(nameInput).toHaveValue('')
  // nút thoát cùng hiệu ứng mờ dần nên còn nằm lại trong DOM một nhịp
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Hủy' })).not.toBeInTheDocument())
})
