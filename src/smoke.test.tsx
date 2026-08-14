import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import App from './App'
import { loadHistory } from './lib/storage'

beforeEach(() => localStorage.clear())

/**
 * Names of the session's players, in list order. Scoped to the "Người chơi"
 * section because the result panel repeats every name; each row's
 * "Đổi giới tính {tên}" button is unique per row and keeps DOM order.
 */
function playerNames(): string[] {
  const section = screen.getByRole('heading', { name: 'Người chơi' }).closest('section')!
  return within(section)
    .queryAllByRole('button', { name: /^Đổi giới tính / })
    .map((b) => b.getAttribute('aria-label')!.replace('Đổi giới tính ', ''))
}

function addPlayer(name: string) {
  fireEvent.change(screen.getByPlaceholderText('Tên người chơi'), { target: { value: name } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
}

// renders the whole App several times over; needs headroom beyond the 5s default under parallel load
test('full flow: add players, see results, save session persists to history', { timeout: 15000 }, () => {
  render(<App />)
  // costs: 6 shuttles ×25k default price, court 150k
  fireEvent.change(screen.getByLabelText('Số quả của loại cầu'), { target: { value: '6' } })
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '150000' } })
  // players
  const nameInput = screen.getByPlaceholderText('Tên người chơi')
  fireEvent.change(nameInput, { target: { value: 'Tuấn' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  fireEvent.click(screen.getByRole('button', { name: 'Nữ' }))
  fireEvent.change(nameInput, { target: { value: 'Lan' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  // results appear (300k, ratios 1.5/1 → 180k / 120k)
  expect(screen.getByText('180.000đ')).toBeInTheDocument()
  expect(screen.getByText('120.000đ')).toBeInTheDocument()
  // save
  fireEvent.click(screen.getByRole('button', { name: 'Lưu buổi này' }))
  expect(JSON.parse(localStorage.getItem('roster')!)).toHaveLength(2)
  // verify through the REAL loader (guards against the app writing a
  // result the loader would then reject and wipe on next load)
  const savedHistory = loadHistory()
  expect(savedHistory).toHaveLength(1)
  expect(savedHistory[0].result.players[0].amount).toBe(180000)
})

test('hourly mode: save persists finite amounts, verified through the real loader', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Sân theo giờ' }))
  // default court times 19:00–21:00 are left untouched
  fireEvent.change(screen.getByLabelText('Số quả của loại cầu'), { target: { value: '6' } })
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '150000' } })
  const nameInput = screen.getByPlaceholderText('Tên người chơi')
  fireEvent.change(nameInput, { target: { value: 'Tuấn' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  fireEvent.click(screen.getByRole('button', { name: 'Nữ' }))
  fireEvent.change(nameInput, { target: { value: 'Lan' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  fireEvent.click(screen.getByRole('button', { name: 'Lưu buổi này' }))

  const savedHistory = loadHistory()
  expect(savedHistory).toHaveLength(1)
  expect(savedHistory[0].input.mode).toBe('hourly')
  expect(Number.isFinite(savedHistory[0].result.surplus)).toBe(true)
  for (const p of savedHistory[0].result.players) {
    expect(Number.isFinite(p.amount)).toBe(true)
  }
})

test('saving shows a toast and disables the save button briefly to prevent duplicate saves', async () => {
  // only the save-button timeout is faked: faking requestAnimationFrame too
  // leaves Motion's frame loop stalled for the rest of the file, so later
  // tests would never see an AnimatePresence exit animation finish
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout'] })
  render(<App />)
  fireEvent.change(screen.getByLabelText('Số quả của loại cầu'), { target: { value: '6' } })
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '150000' } })
  const nameInput = screen.getByPlaceholderText('Tên người chơi')
  fireEvent.change(nameInput, { target: { value: 'Tuấn' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))

  const saveButton = screen.getByRole('button', { name: 'Lưu buổi này' })
  fireEvent.click(saveButton)

  expect(await screen.findByText('Đã lưu buổi ✓')).toBeInTheDocument()
  expect(saveButton).toBeDisabled()

  act(() => {
    vi.advanceTimersByTime(2500)
  })

  expect(saveButton).not.toBeDisabled()
  vi.useRealTimers()
})

test('session state is restored from localStorage', () => {
  const { unmount } = render(<App />)
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '999000' } })
  unmount()
  render(<App />)
  expect(screen.getByLabelText('Tiền sân')).toHaveValue('999.000')
})

test('"Buổi mới" resets straight away and "Hoàn tác" brings the previous session back', async () => {
  render(<App />)
  fireEvent.change(screen.getByLabelText('Số quả của loại cầu'), { target: { value: '6' } })
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '150000' } })
  // "Tuấn" appears both in the player row and in the result panel's amount
  // breakdown, so scope on the row's own quick-delete button instead
  addPlayer('Tuấn')
  expect(screen.getByRole('button', { name: 'Xóa Tuấn' })).toBeInTheDocument()

  // no confirm dialog any more: the reset happens immediately
  fireEvent.click(screen.getByRole('button', { name: 'Buổi mới' }))
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Xóa Tuấn' })).not.toBeInTheDocument(),
  )
  expect(screen.getByText('Chưa có người chơi nào')).toBeInTheDocument()
  expect(screen.getByLabelText('Tiền sân')).toHaveValue('')
  expect(screen.getByLabelText('Số quả của loại cầu')).toHaveValue('')

  // the undo toast restores the whole previous session snapshot
  fireEvent.click(await screen.findByRole('button', { name: 'Hoàn tác' }))
  expect(await screen.findByRole('button', { name: 'Xóa Tuấn' })).toBeInTheDocument()
  expect(screen.getByLabelText('Tiền sân')).toHaveValue('150.000')
  expect(screen.getByLabelText('Số quả của loại cầu')).toHaveValue('6')
})

test('"Buổi mới" on an already-empty session resets silently — nothing to undo', async () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Buổi mới' }))
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
  expect(screen.queryByRole('button', { name: 'Hoàn tác' })).not.toBeInTheDocument()
  expect(screen.getByText('Chưa có người chơi nào')).toBeInTheDocument()
})

// waits on AnimatePresence exit animations to unmount the deleted row twice over;
// needs headroom beyond the 5s default under parallel load
test('deleting a player toasts an undo that restores it in place, keeping later changes', { timeout: 15000 }, async () => {
  render(<App />)
  addPlayer('An')
  addPlayer('Nam')
  addPlayer('Bình')
  expect(playerNames()).toEqual(['An', 'Nam', 'Bình'])

  fireEvent.click(screen.getByRole('button', { name: 'Xóa Nam' }))
  await waitFor(() => expect(playerNames()).toEqual(['An', 'Bình']))
  expect(await screen.findByText('Đã xóa "Nam"')).toBeInTheDocument()

  // a change made while the toast is still up must survive the undo
  addPlayer('Hùng')
  expect(playerNames()).toEqual(['An', 'Bình', 'Hùng'])

  fireEvent.click(await screen.findByRole('button', { name: 'Hoàn tác' }))
  await waitFor(() => expect(playerNames()).toEqual(['An', 'Nam', 'Bình', 'Hùng']))
})

// same exit-animation wait as the test above
test('undo restores a deleted player with its paid / ½ buổi state intact', { timeout: 15000 }, async () => {
  render(<App />)
  addPlayer('An')
  addPlayer('Nam')
  fireEvent.click(screen.getByRole('button', { name: '½ buổi Nam' }))
  expect(screen.getByRole('button', { name: '½ buổi Nam' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  fireEvent.click(screen.getByRole('button', { name: 'Xóa Nam' }))
  await waitFor(() => expect(playerNames()).toEqual(['An']))

  fireEvent.click(await screen.findByRole('button', { name: 'Hoàn tác' }))
  await waitFor(() => expect(playerNames()).toEqual(['An', 'Nam']))
  expect(screen.getByRole('button', { name: '½ buổi Nam' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

// 18
// re-renders the whole App on every keystroke of two extra-cost rows; like the
// full-flow test above it needs headroom beyond the 5s default under parallel load
test('deleting a player also removes their extra costs, and "Hoàn tác" brings both back', { timeout: 15000 }, async () => {
  const costSection = () => screen.getByRole('heading', { name: 'Chi phí' }).closest('section')!
  const totalCost = () =>
    within(costSection()).getByText('TỔNG CHI').nextElementSibling!.textContent
  // read the session App persists rather than the player list: rows leave the
  // DOM only once their exit animation finishes, which says nothing about state
  const stored = () => JSON.parse(localStorage.getItem('currentSession')!)
  const storedExtras = () => stored().extras
  const storedNames = () => stored().players.map((p: { name: string }) => p.name)

  render(<App />)
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '100000' } })
  addPlayer('An')
  addPlayer('Nam')

  // two extras, both on An (the add button defaults every new row to players[0])
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm khoản' }))
  fireEvent.change(screen.getByLabelText('Tên khoản phát sinh'), { target: { value: 'Nước' } })
  fireEvent.change(screen.getByLabelText('Số tiền của Nước'), { target: { value: '20000' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm khoản' }))
  // every row shares the same aria-label, so the second one is picked by index
  fireEvent.change(screen.getAllByLabelText('Tên khoản phát sinh')[1], {
    target: { value: 'Thuê vợt' },
  })
  fireEvent.change(screen.getByLabelText('Số tiền của Thuê vợt'), { target: { value: '15000' } })

  expect(totalCost()).toBe('135.000đ')
  expect(storedExtras()).toHaveLength(2)

  fireEvent.click(screen.getByRole('button', { name: 'Xóa An' }))
  expect(storedNames()).toEqual(['Nam'])
  // no orphaned extras left behind pointing at a player who no longer exists
  expect(storedExtras()).toEqual([])
  expect(totalCost()).toBe('100.000đ')

  fireEvent.click(await screen.findByRole('button', { name: 'Hoàn tác' }))
  // An goes back to index 0, both of their extras come back with them
  expect(storedNames()).toEqual(['An', 'Nam'])
  expect(storedExtras()).toHaveLength(2)
  expect(storedExtras().map((e: { label: string }) => e.label)).toEqual(['Nước', 'Thuê vợt'])
  expect(totalCost()).toBe('135.000đ')
})

/** Adds one extra row, names it, prices it and returns nothing. */
function addExtra(label: string, amount: string) {
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm khoản' }))
  const labels = screen.getAllByLabelText('Tên khoản phát sinh')
  fireEvent.change(labels[labels.length - 1], { target: { value: label } })
  fireEvent.change(screen.getByLabelText(`Số tiền của ${label}`), { target: { value: amount } })
}

function openPayers(label: string) {
  fireEvent.click(screen.getByLabelText(`Người trả khoản ${label}`))
  return screen.getByRole('dialog')
}

const storedSession = () => JSON.parse(localStorage.getItem('currentSession')!)
const totalCostText = () =>
  within(screen.getByRole('heading', { name: 'Chi phí' }).closest('section')!)
    .getByText('TỔNG CHI').nextElementSibling!.textContent

// 31
// re-renders the whole App on every keystroke; needs headroom beyond the 5s
// default under parallel load, like the other full-App tests in this file
test('deleting a bearer of a shared extra keeps TỔNG CHI and re-splits it; undo puts the share back', { timeout: 15000 }, async () => {
  render(<App />)
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '150000' } })
  addPlayer('An')
  addPlayer('Bình')
  addPlayer('Cường')

  addExtra('Nước', '100000')
  fireEvent.click(within(openPayers('Nước')).getByRole('checkbox', { name: 'Cả nhóm' }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xong' }))

  expect(storedSession().extras[0].playerIds).toHaveLength(3)
  expect(totalCostText()).toBe('250.000đ')
  expect(screen.getAllByText(/· Nước \(chung, 3 người\) 33\.333/)).toHaveLength(3)

  fireEvent.click(screen.getByRole('button', { name: 'Xóa Cường' }))
  // the water crate still costs 100.000 — the two who are left cover it
  expect(storedSession().players.map((p: { name: string }) => p.name)).toEqual(['An', 'Bình'])
  expect(storedSession().extras[0].playerIds).toHaveLength(2)
  expect(totalCostText()).toBe('250.000đ')
  expect(screen.getAllByText(/· Nước \(chung, 2 người\) 50\.000/)).toHaveLength(2)

  fireEvent.click(await screen.findByRole('button', { name: 'Hoàn tác' }))
  expect(storedSession().players.map((p: { name: string }) => p.name)).toEqual([
    'An',
    'Bình',
    'Cường',
  ])
  expect(storedSession().extras[0].playerIds).toHaveLength(3)
  expect(totalCostText()).toBe('250.000đ')
  expect(screen.getAllByText(/· Nước \(chung, 3 người\) 33\.333/)).toHaveLength(3)
})

// 32
test('an extra left with nobody is dropped outright and comes back at its old index on undo', { timeout: 15000 }, async () => {
  render(<App />)
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '100000' } })
  addPlayer('An')
  addPlayer('Bình')

  // extras[0] is An's alone; extras[1] sits after it and belongs to Bình
  addExtra('Thuê vợt', '20000')
  addExtra('Nước', '30000')
  const sheet = openPayers('Nước')
  fireEvent.click(within(sheet).getByRole('checkbox', { name: 'Bình · Nam' }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox', { name: 'An · Nam' }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xong' }))
  expect(totalCostText()).toBe('150.000đ')

  fireEvent.click(screen.getByRole('button', { name: 'Xóa An' }))
  expect(storedSession().extras.map((e: { label: string }) => e.label)).toEqual(['Nước'])
  expect(totalCostText()).toBe('130.000đ')

  fireEvent.click(await screen.findByRole('button', { name: 'Hoàn tác' }))
  // back at index 0, not appended to the end — CostForm renders array order
  expect(storedSession().extras.map((e: { label: string }) => e.label)).toEqual([
    'Thuê vợt',
    'Nước',
  ])
  expect(
    screen.getAllByLabelText('Tên khoản phát sinh').map((el) => (el as HTMLInputElement).value),
  ).toEqual(['Thuê vợt', 'Nước'])
  expect(totalCostText()).toBe('150.000đ')
})

// 33
test('undo does not resurrect a trimmed extra the user deleted by hand while the toast was up', { timeout: 15000 }, async () => {
  render(<App />)
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '100000' } })
  addPlayer('An')
  addPlayer('Bình')

  addExtra('Nước', '60000')
  fireEvent.click(within(openPayers('Nước')).getByRole('checkbox', { name: 'Cả nhóm' }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xong' }))

  fireEvent.click(screen.getByRole('button', { name: 'Xóa An' }))
  expect(storedSession().extras[0].playerIds).toHaveLength(1)

  // the toast is still on screen — delete the (now Bình-only) extra by hand
  fireEvent.click(screen.getByRole('button', { name: 'Xóa khoản Nước' }))
  expect(storedSession().extras).toEqual([])

  const undo = await screen.findByRole('button', { name: 'Hoàn tác' })
  expect(() => fireEvent.click(undo)).not.toThrow()
  expect(storedSession().players.map((p: { name: string }) => p.name)).toEqual(['An', 'Bình'])
  // the extra stays deleted; nothing is revived and no id is duplicated
  expect(storedSession().extras).toEqual([])
  expect(totalCostText()).toBe('100.000đ')
})

test('deleting a saved session in history toasts an undo that restores it at its old spot', async () => {
  render(<App />)
  fireEvent.change(screen.getByLabelText('Số quả của loại cầu'), { target: { value: '6' } })
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '150000' } })
  addPlayer('Tuấn')
  fireEvent.click(screen.getByRole('button', { name: 'Lưu buổi này' }))

  fireEvent.click(screen.getByRole('button', { name: 'Xem lịch sử các buổi →' }))
  expect(screen.getByText(/1 buổi đã lưu/)).toBeInTheDocument()
  fireEvent.click(screen.getByText(/1 người · 1 nam, 0 nữ/))
  fireEvent.click(screen.getByRole('button', { name: 'Xóa buổi này' }))
  expect(screen.getByText(/0 buổi đã lưu/)).toBeInTheDocument()

  fireEvent.click(await screen.findByRole('button', { name: 'Hoàn tác' }))
  await waitFor(() => expect(screen.getByText(/1 buổi đã lưu/)).toBeInTheDocument())
  expect(loadHistory()).toHaveLength(1)
})

test('a failed history save surfaces an error toast instead of failing silently', async () => {
  const originalSetItem = Storage.prototype.setItem.bind(localStorage)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
    if (key === 'history') throw new Error('QuotaExceededError')
    originalSetItem(key, value)
  })

  render(<App />)
  fireEvent.change(screen.getByLabelText('Số quả của loại cầu'), { target: { value: '6' } })
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '150000' } })
  const nameInput = screen.getByPlaceholderText('Tên người chơi')
  fireEvent.change(nameInput, { target: { value: 'Tuấn' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  fireEvent.click(screen.getByRole('button', { name: 'Lưu buổi này' }))

  expect(await screen.findByText(/Không lưu được lịch sử/)).toBeInTheDocument()

  vi.restoreAllMocks()
})

test('paid toggle in history detail persists through the real loader', () => {
  render(<App />)
  fireEvent.change(screen.getByLabelText('Số quả của loại cầu'), { target: { value: '6' } })
  fireEvent.change(screen.getByLabelText('Tiền sân'), { target: { value: '150000' } })
  const nameInput = screen.getByPlaceholderText('Tên người chơi')
  fireEvent.change(nameInput, { target: { value: 'Tuấn' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  fireEvent.click(screen.getByRole('button', { name: 'Nữ' }))
  fireEvent.change(nameInput, { target: { value: 'Lan' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm người chơi' }))
  fireEvent.click(screen.getByRole('button', { name: 'Lưu buổi này' }))

  fireEvent.click(screen.getByRole('button', { name: 'Xem lịch sử các buổi →' }))
  expect(screen.getByText('⚠ 2 chưa trả')).toBeInTheDocument()
  fireEvent.click(screen.getByText(/2 người · 1 nam, 1 nữ/))
  fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu Tuấn đã trả' }))
  expect(screen.getByText('⚠ 1 chưa trả')).toBeInTheDocument()

  const savedHistory = loadHistory()
  expect(savedHistory).toHaveLength(1)
  expect(savedHistory[0].input.players.find((p) => p.name === 'Tuấn')?.paid).toBe(true)
  expect(savedHistory[0].input.players.find((p) => p.name === 'Lan')?.paid).toBe(false)
})

test('opening history pushes browser state; the in-app ← button navigates back', async () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Xem lịch sử các buổi →' }))
  expect(screen.getByRole('heading', { name: 'Lịch sử các buổi' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
  // onBack triggers window.history.back(); popstate dispatch is async in jsdom
  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'Lịch sử các buổi' })).not.toBeInTheDocument(),
  )
})

test('browser back button (popstate) closes the history page', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Xem lịch sử các buổi →' }))
  expect(screen.getByRole('heading', { name: 'Lịch sử các buổi' })).toBeInTheDocument()

  fireEvent(window, new PopStateEvent('popstate'))
  expect(screen.queryByRole('heading', { name: 'Lịch sử các buổi' })).not.toBeInTheDocument()
})

test('deleting a roster entry toasts an undo that puts it back at its old index', async () => {
  render(<App />)
  addPlayer('An')
  addPlayer('Nam')
  addPlayer('Bình')

  fireEvent.click(screen.getByRole('button', { name: 'Danh bạ người chơi →' }))
  expect(screen.getByText('3 người đã lưu')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Xóa Nam' }))
  expect(screen.getByText('2 người đã lưu')).toBeInTheDocument()
  expect(await screen.findByText('Đã xóa "Nam" khỏi danh bạ')).toBeInTheDocument()

  fireEvent.click(await screen.findByRole('button', { name: 'Hoàn tác' }))
  await waitFor(() => expect(screen.getByText('3 người đã lưu')).toBeInTheDocument())
  // the roster page lists names alphabetically, so the stored order is what
  // shows the entry went back to its old index instead of being appended
  const stored = JSON.parse(localStorage.getItem('roster')!) as { name: string }[]
  expect(stored.map((r) => r.name)).toEqual(['An', 'Nam', 'Bình'])
})

test('opening the roster pushes browser state; the in-app ← button navigates back', async () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Danh bạ người chơi →' }))
  expect(screen.getByRole('heading', { name: 'Danh bạ người chơi' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'Danh bạ người chơi' })).not.toBeInTheDocument(),
  )
})

test('browser back button (popstate) closes the roster page', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Danh bạ người chơi →' }))
  expect(screen.getByRole('heading', { name: 'Danh bạ người chơi' })).toBeInTheDocument()

  fireEvent(window, new PopStateEvent('popstate'))
  expect(screen.queryByRole('heading', { name: 'Danh bạ người chơi' })).not.toBeInTheDocument()
})
