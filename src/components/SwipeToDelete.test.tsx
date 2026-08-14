import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SwipeToDelete } from './SwipeToDelete'

function Harness({
  onDelete = () => {},
  disabled = false,
}: {
  onDelete?: () => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [clicked, setClicked] = useState(0)
  return (
    <>
      <SwipeToDelete
        testId="row-1"
        label="Xóa nhanh Tuấn"
        isOpen={open}
        onOpenChange={setOpen}
        onDelete={onDelete}
        disabled={disabled}
      >
        <button type="button" onClick={() => setClicked((c) => c + 1)}>
          Tuấn
        </button>
      </SwipeToDelete>
      <span data-testid="clicks">{clicked}</span>
    </>
  )
}

const row = () => screen.getByTestId('row-1')
const shift = () => row().style.transform

test('a left swipe past the threshold opens the row', () => {
  render(<Harness />)
  fireEvent.touchStart(row(), { touches: [{ clientX: 200, clientY: 100 }] })
  fireEvent.touchMove(row(), { touches: [{ clientX: 100, clientY: 100 }] })
  fireEvent.touchEnd(row())
  expect(shift()).toBe('translateX(-80px)')
})

test('a left swipe short of the threshold springs back', () => {
  render(<Harness />)
  fireEvent.touchStart(row(), { touches: [{ clientX: 200, clientY: 100 }] })
  fireEvent.touchMove(row(), { touches: [{ clientX: 190, clientY: 100 }] })
  fireEvent.touchEnd(row())
  expect(shift()).toBe('translateX(0px)')
})

test('a mostly vertical drag scrolls instead of dragging the row sideways', () => {
  render(<Harness />)
  fireEvent.touchStart(row(), { touches: [{ clientX: 200, clientY: 100 }] })
  fireEvent.touchMove(row(), { touches: [{ clientX: 140, clientY: 250 }] })
  expect(shift()).toBe('translateX(0px)')
  fireEvent.touchEnd(row())
  expect(shift()).toBe('translateX(0px)')
})

test('once a gesture is judged vertical it stays vertical, even if it drifts sideways', () => {
  render(<Harness />)
  fireEvent.touchStart(row(), { touches: [{ clientX: 200, clientY: 100 }] })
  fireEvent.touchMove(row(), { touches: [{ clientX: 190, clientY: 250 }] })
  fireEvent.touchMove(row(), { touches: [{ clientX: 100, clientY: 260 }] })
  fireEvent.touchEnd(row())
  expect(shift()).toBe('translateX(0px)')
})

test('the delete button calls onDelete', () => {
  const onDelete = vi.fn()
  render(<Harness onDelete={onDelete} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa nhanh Tuấn' }))
  expect(onDelete).toHaveBeenCalledTimes(1)
})

test('the first tap on an open row closes it instead of reaching the content', () => {
  render(<Harness />)
  fireEvent.touchStart(row(), { touches: [{ clientX: 200, clientY: 100 }] })
  fireEvent.touchMove(row(), { touches: [{ clientX: 100, clientY: 100 }] })
  fireEvent.touchEnd(row())
  fireEvent.click(screen.getByRole('button', { name: 'Tuấn' }))
  expect(screen.getByTestId('clicks')).toHaveTextContent('0')
  expect(shift()).toBe('translateX(0px)')
})

test('disabled rows ignore swipes — used while a row is being drag-reordered', () => {
  render(<Harness disabled />)
  fireEvent.touchStart(row(), { touches: [{ clientX: 200, clientY: 100 }] })
  fireEvent.touchMove(row(), { touches: [{ clientX: 100, clientY: 100 }] })
  fireEvent.touchEnd(row())
  expect(shift()).toBe('translateX(0px)')
})

// Hàng đóng vẫn nằm đè lên khay đỏ, nhưng mặt trượt có transform riêng nên
// viền của nó bị khử răng cưa ở toạ độ lẻ pixel và để lọt một sợi đỏ quanh
// hàng. Khay chỉ hiện màu khi hàng thực sự được vuốt.
test('the red panel stays transparent until the row is swiped', () => {
  render(<Harness />)
  const panel = screen.getByRole('button', { name: 'Xóa nhanh Tuấn' })
  expect(panel).toHaveClass('opacity-0')
  fireEvent.touchStart(row(), { touches: [{ clientX: 200, clientY: 100 }] })
  fireEvent.touchMove(row(), { touches: [{ clientX: 100, clientY: 100 }] })
  expect(panel).toHaveClass('opacity-100')
  fireEvent.touchEnd(row())
  expect(panel).toHaveClass('opacity-100')
})
