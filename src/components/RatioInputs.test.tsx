import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { RatioInputs } from './RatioInputs'

/** Bọc RatioInputs như App: state thật + ghi lại mọi lần onChange được gọi. */
function Harness({
  initial = { maleRatio: 1, femaleRatio: 1 },
  onChangeSpy,
}: {
  initial?: { maleRatio: number; femaleRatio: number }
  onChangeSpy?: (p: { maleRatio?: number; femaleRatio?: number }) => void
}) {
  const [ratios, setRatios] = useState(initial)
  return (
    <RatioInputs
      maleRatio={ratios.maleRatio}
      femaleRatio={ratios.femaleRatio}
      onChange={(p) => {
        onChangeSpy?.(p)
        setRatios((prev) => ({ ...prev, ...p }))
      }}
    />
  )
}

function maleInput() {
  return screen.getByLabelText('Nam') as HTMLInputElement
}

test('gõ dấu phẩy thập phân cho ra số thực', () => {
  const spy = vi.fn()
  render(<Harness onChangeSpy={spy} />)
  fireEvent.change(maleInput(), { target: { value: '1,5' } })
  expect(spy).toHaveBeenCalledWith({ maleRatio: 1.5 })
  expect(maleInput().value).toBe('1,5')
})

test('gõ dấu chấm thập phân vẫn cho ra số thực', () => {
  const spy = vi.fn()
  render(<Harness onChangeSpy={spy} />)
  fireEvent.change(maleInput(), { target: { value: '1.5' } })
  expect(spy).toHaveBeenCalledWith({ maleRatio: 1.5 })
  expect(maleInput().value).toBe('1.5')
})

test('gõ dở "1," thì giữ nguyên chữ đã gõ và không báo giá trị mới', () => {
  const spy = vi.fn()
  render(<Harness onChangeSpy={spy} />)
  fireEvent.change(maleInput(), { target: { value: '1,' } })
  expect(spy).not.toHaveBeenCalled()
  expect(maleInput().value).toBe('1,')
})

test('gõ tiếp sau "1," ra "1,5" thì báo 1.5', () => {
  const spy = vi.fn()
  render(<Harness onChangeSpy={spy} />)
  fireEvent.change(maleInput(), { target: { value: '1,' } })
  fireEvent.change(maleInput(), { target: { value: '1,5' } })
  expect(spy).toHaveBeenCalledTimes(1)
  expect(spy).toHaveBeenCalledWith({ maleRatio: 1.5 })
})

test('gõ 0 không đẩy hệ số 0 xuống calc', () => {
  const spy = vi.fn()
  render(<Harness onChangeSpy={spy} />)
  fireEvent.change(maleInput(), { target: { value: '0' } })
  expect(spy).not.toHaveBeenCalled()
  expect(maleInput().value).toBe('0')
})

test('xoá trắng ô rồi blur thì quay về giá trị hiện tại', () => {
  const spy = vi.fn()
  render(<Harness initial={{ maleRatio: 1.5, femaleRatio: 1 }} onChangeSpy={spy} />)
  fireEvent.change(maleInput(), { target: { value: '' } })
  expect(spy).not.toHaveBeenCalled()
  expect(maleInput().value).toBe('')
  fireEvent.blur(maleInput())
  expect(maleInput().value).toBe('1.5')
  expect(spy).not.toHaveBeenCalled()
})

test('blur khi ô hợp lệ thì giữ nguyên chữ người dùng gõ', () => {
  render(<Harness />)
  fireEvent.change(maleInput(), { target: { value: '1,5' } })
  fireEvent.blur(maleInput())
  expect(maleInput().value).toBe('1,5')
})

test('hai ô nam / nữ độc lập nhau', () => {
  const spy = vi.fn()
  render(<Harness onChangeSpy={spy} />)
  const female = screen.getByLabelText('Nữ') as HTMLInputElement
  fireEvent.change(female, { target: { value: '0,8' } })
  expect(spy).toHaveBeenCalledWith({ femaleRatio: 0.8 })
  expect(maleInput().value).toBe('1')
})

test('prop đổi từ bên ngoài thì ô hiện giá trị mới', () => {
  const { rerender } = render(
    <RatioInputs maleRatio={1} femaleRatio={1} onChange={() => {}} />,
  )
  expect(maleInput().value).toBe('1')
  rerender(<RatioInputs maleRatio={1.5} femaleRatio={1} onChange={() => {}} />)
  expect(maleInput().value).toBe('1.5')
})

test('không dùng type="number" để bàn phím dấu phẩy không bị chặn', () => {
  render(<Harness />)
  expect(maleInput()).not.toHaveAttribute('type', 'number')
  expect(maleInput()).toHaveAttribute('inputmode', 'decimal')
})
