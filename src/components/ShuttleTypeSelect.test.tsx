import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { vi } from 'vitest'
import { ShuttleTypeSelect } from './ShuttleTypeSelect'
import type { ShuttleType } from '../lib/shuttleTypes'

const suggestions: ShuttleType[] = [
  { name: 'Hải Yến', price: 25000 },
  { name: 'Hải Âu', price: 22000 },
  { name: 'Ba Sao', price: 20000 },
]

function Harness({
  initial = '',
  initialPrice = 0,
  onChange,
}: {
  initial?: string
  initialPrice?: number
  onChange?: (name: string, price: number) => void
}) {
  const [name, setName] = useState(initial)
  const [price, setPrice] = useState(initialPrice)
  return (
    <>
      <ShuttleTypeSelect
        aria-label="Loại cầu"
        value={name}
        price={price}
        suggestions={suggestions}
        onChange={(n, p) => {
          setName(n)
          setPrice(p)
          onChange?.(n, p)
        }}
      />
      <output data-testid="price">{price}</output>
    </>
  )
}

test('nút trống hiện placeholder, mở sheet thấy chip gợi ý', () => {
  render(<Harness />)
  const trigger = screen.getByRole('button', { name: 'Loại cầu' })
  expect(trigger).toHaveTextContent('Chọn loại cầu')

  fireEvent.click(trigger)
  expect(screen.getByRole('button', { name: 'Chọn Hải Yến · 25.000đ' })).toBeInTheDocument()
})

test('nút ngoài hiện cả tên lẫn đơn giá', () => {
  render(<Harness initial="Hải Yến" initialPrice={25000} />)
  const trigger = screen.getByRole('button', { name: 'Loại cầu' })
  expect(trigger).toHaveTextContent('Hải Yến')
  expect(trigger).toHaveTextContent('· 25.000đ')
})

test('nút ngoài chỉ hiện tên khi chưa có giá', () => {
  render(<Harness initial="Cầu lạ" initialPrice={0} />)
  const trigger = screen.getByRole('button', { name: 'Loại cầu' })
  expect(trigger).toHaveTextContent('Cầu lạ')
  expect(trigger).not.toHaveTextContent('0đ')
  expect(trigger).not.toHaveTextContent('·')
})

test('bấm chip điền cả tên và giá rồi đóng sheet', () => {
  const onChange = vi.fn()
  render(<Harness onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: 'Loại cầu' }))
  fireEvent.click(screen.getByRole('button', { name: 'Chọn Hải Yến · 25.000đ' }))

  expect(onChange).toHaveBeenCalledWith('Hải Yến', 25000)
  expect(screen.getByRole('button', { name: 'Loại cầu' })).toHaveTextContent('Hải Yến')
  expect(screen.getByTestId('price')).toHaveTextContent('25000')
  expect(screen.queryByLabelText('Tên loại cầu')).not.toBeInTheDocument()
})

test('gõ vào ô tên thì chip nhường chỗ cho gợi ý lọc theo tiền tố', () => {
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Loại cầu' }))
  fireEvent.change(screen.getByLabelText('Tên loại cầu'), { target: { value: 'hải' } })

  expect(screen.getByRole('button', { name: 'Chọn Hải Yến · 25.000đ' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Chọn Hải Âu · 22.000đ' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Chọn Ba Sao · 20.000đ' })).not.toBeInTheDocument()
})

test('bấm Xong nhận tên gõ tay mà không đổi giá', () => {
  const onChange = vi.fn()
  render(<Harness onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: 'Loại cầu' }))
  fireEvent.change(screen.getByLabelText('Tên loại cầu'), { target: { value: 'Cầu lạ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Xong' }))

  expect(onChange).toHaveBeenCalledWith('Cầu lạ', 0)
  expect(screen.getByRole('button', { name: 'Loại cầu' })).toHaveTextContent('Cầu lạ')
  expect(screen.getByTestId('price')).toHaveTextContent('0')
})

test('sửa giá trong sheet rồi bấm Xong gửi cả tên lẫn giá mới', () => {
  const onChange = vi.fn()
  render(<Harness initial="Hải Yến" initialPrice={25000} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: 'Loại cầu' }))

  const priceInput = screen.getByLabelText('Giá / quả')
  expect(priceInput).toHaveValue('25.000')
  fireEvent.change(priceInput, { target: { value: '30000' } })
  fireEvent.click(screen.getByRole('button', { name: 'Xong' }))

  expect(onChange).toHaveBeenCalledWith('Hải Yến', 30000)
  expect(screen.getByTestId('price')).toHaveTextContent('30000')
  expect(screen.getByRole('button', { name: 'Loại cầu' })).toHaveTextContent('· 30.000đ')
})

test('Enter trong ô tên cũng commit cả tên lẫn giá', () => {
  const onChange = vi.fn()
  render(<Harness onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: 'Loại cầu' }))
  fireEvent.change(screen.getByLabelText('Giá / quả'), { target: { value: '18000' } })
  const nameInput = screen.getByLabelText('Tên loại cầu')
  fireEvent.change(nameInput, { target: { value: 'Cầu chợ' } })
  fireEvent.keyDown(nameInput, { key: 'Enter' })

  expect(onChange).toHaveBeenCalledWith('Cầu chợ', 18000)
  expect(screen.queryByLabelText('Tên loại cầu')).not.toBeInTheDocument()
})

test('hủy sheet (Esc) giữ nguyên cả tên lẫn giá cũ, không gọi onChange', () => {
  const onChange = vi.fn()
  render(<Harness initial="Hải Yến" initialPrice={25000} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: 'Loại cầu' }))
  const dialog = screen.getByRole('dialog')
  fireEvent.change(screen.getByLabelText('Tên loại cầu'), { target: { value: 'Cầu khác' } })
  fireEvent.change(screen.getByLabelText('Giá / quả'), { target: { value: '99000' } })

  // vaul/Radix đóng sheet khi Esc giống hệt kéo xuống / bấm overlay
  fireEvent.keyDown(dialog, { key: 'Escape' })

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(onChange).not.toHaveBeenCalled()
  const trigger = screen.getByRole('button', { name: 'Loại cầu' })
  expect(trigger).toHaveTextContent('Hải Yến')
  expect(trigger).toHaveTextContent('· 25.000đ')
})

test('mở lại sheet thì ô tên và ô giá reset về giá trị đang lưu', () => {
  render(<Harness initial="Ba Sao" initialPrice={20000} />)
  fireEvent.click(screen.getByRole('button', { name: 'Loại cầu' }))
  expect(screen.getByLabelText('Tên loại cầu')).toHaveValue('Ba Sao')
  expect(screen.getByLabelText('Giá / quả')).toHaveValue('20.000')

  fireEvent.change(screen.getByLabelText('Tên loại cầu'), { target: { value: 'Sửa dở' } })
  fireEvent.change(screen.getByLabelText('Giá / quả'), { target: { value: '77000' } })
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

  fireEvent.click(screen.getByRole('button', { name: 'Loại cầu' }))
  expect(screen.getByLabelText('Tên loại cầu')).toHaveValue('Ba Sao')
  expect(screen.getByLabelText('Giá / quả')).toHaveValue('20.000')
})
