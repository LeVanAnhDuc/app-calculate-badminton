import { useState } from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { RosterPage } from './RosterPage'
import type { RosterEntry } from '../lib/storage'

function Harness({ initial }: { initial: RosterEntry[] }) {
  const [roster, setRoster] = useState(initial)
  return <RosterPage roster={roster} onBack={() => {}} onChange={setRoster} />
}

const base: RosterEntry[] = [
  { name: 'Tuấn', gender: 'male' },
  { name: 'Lan', gender: 'female' },
]

test('adds a new entry to the roster', () => {
  render(<Harness initial={base} />)
  const nameInput = screen.getByPlaceholderText('Tên người chơi')
  fireEvent.change(nameInput, { target: { value: 'Minh' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm vào danh bạ' }))
  expect(screen.getByText('Minh')).toBeInTheDocument()
  expect(screen.getByText('3 người đã lưu')).toBeInTheDocument()
})

test('blocks case-insensitive duplicates when adding', () => {
  render(<Harness initial={base} />)
  const nameInput = screen.getByPlaceholderText('Tên người chơi')
  fireEvent.change(nameInput, { target: { value: 'tuấn' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm vào danh bạ' }))
  expect(screen.getByText('"tuấn" đã có trong danh bạ')).toBeInTheDocument()
  expect(screen.getByText('2 người đã lưu')).toBeInTheDocument()
})

test('blocks empty names when adding', () => {
  render(<Harness initial={base} />)
  fireEvent.click(screen.getByRole('button', { name: '+ Thêm vào danh bạ' }))
  expect(screen.getByText('2 người đã lưu')).toBeInTheDocument()
})

test('renames an entry via the edit drawer, blocking duplicates', () => {
  render(<Harness initial={base} />)
  fireEvent.click(screen.getByText('Tuấn'))
  const drawer = screen.getByRole('dialog')
  const nameInput = within(drawer).getByLabelText('Tên của Tuấn') as HTMLInputElement

  fireEvent.change(nameInput, { target: { value: 'Nam Anh' } })
  fireEvent.blur(nameInput)
  expect(screen.getByText('Nam Anh')).toBeInTheDocument()
  expect(screen.queryByText('Tuấn')).not.toBeInTheDocument()

  fireEvent.change(nameInput, { target: { value: 'lan' } })
  fireEvent.blur(nameInput)
  expect(within(drawer).getByText('"lan" đã có trong danh bạ')).toBeInTheDocument()
  expect(screen.getByText('Nam Anh')).toBeInTheDocument()
})

test('changing gender in the edit drawer updates the entry immediately', () => {
  render(<Harness initial={base} />)
  fireEvent.click(screen.getByText('Tuấn'))
  const drawer = screen.getByRole('dialog')
  fireEvent.click(within(drawer).getByRole('button', { name: 'Đặt Nữ cho Tuấn' }))
  fireEvent.click(within(drawer).getByRole('button', { name: 'Xong' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByText('Tuấn')).toBeInTheDocument()
})

test('deleting via the desktop × button asks for confirmation', () => {
  vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
  render(<Harness initial={base} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa Tuấn' }))
  expect(screen.getByText('Tuấn')).toBeInTheDocument()

  vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa Tuấn' }))
  expect(screen.queryByText('Tuấn')).not.toBeInTheDocument()
  expect(screen.getByText('1 người đã lưu')).toBeInTheDocument()
})

test('confirm dialog includes the entry name', () => {
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<Harness initial={base} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa Tuấn' }))
  expect(confirmSpy).toHaveBeenCalledWith('Xóa "Tuấn" khỏi danh bạ?')
})

test('swipe-left reveals the red Xóa button; tapping it deletes with confirmation', () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<Harness initial={base} />)
  const row = screen.getByTestId('roster-swipe-row-Tuấn')
  fireEvent.touchStart(row, { touches: [{ clientX: 200 }] })
  fireEvent.touchMove(row, { touches: [{ clientX: 100 }] })
  fireEvent.touchEnd(row)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa nhanh Tuấn' }))
  expect(screen.queryByText('Tuấn')).not.toBeInTheDocument()
})

test('empty roster shows a hint instead of a list', () => {
  render(<Harness initial={[]} />)
  expect(screen.getByText(/Danh bạ chưa có ai/)).toBeInTheDocument()
})

test('footer note is shown', () => {
  render(<Harness initial={base} />)
  expect(
    screen.getByText('Danh bạ tự bổ sung khi bạn thêm người chơi mới trong buổi'),
  ).toBeInTheDocument()
})

test('back button calls onBack', () => {
  const onBack = vi.fn()
  render(<RosterPage roster={base} onBack={onBack} onChange={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
  expect(onBack).toHaveBeenCalledTimes(1)
})
