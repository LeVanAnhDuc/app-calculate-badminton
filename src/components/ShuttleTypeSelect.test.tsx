import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { ShuttleTypeSelect } from './ShuttleTypeSelect'
import type { ShuttleType } from '../lib/shuttleTypes'

const suggestions: ShuttleType[] = [
  { name: 'Hải Yến', price: 25000 },
  { name: 'Hải Âu', price: 22000 },
  { name: 'Ba Sao', price: 20000 },
]

function Harness({ initial = '' }: { initial?: string }) {
  const [name, setName] = useState(initial)
  const [price, setPrice] = useState(0)
  return (
    <>
      <ShuttleTypeSelect
        aria-label="Loại cầu"
        value={name}
        suggestions={suggestions}
        onChange={(n, p) => {
          setName(n)
          if (p !== undefined) setPrice(p)
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

test('bấm chip điền cả tên và giá rồi đóng sheet', () => {
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Loại cầu' }))
  fireEvent.click(screen.getByRole('button', { name: 'Chọn Hải Yến · 25.000đ' }))

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
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Loại cầu' }))
  fireEvent.change(screen.getByLabelText('Tên loại cầu'), { target: { value: 'Cầu lạ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Xong' }))

  expect(screen.getByRole('button', { name: 'Loại cầu' })).toHaveTextContent('Cầu lạ')
  expect(screen.getByTestId('price')).toHaveTextContent('0')
})

test('mở lại sheet thì ô tên bắt đầu từ giá trị hiện tại', () => {
  render(<Harness initial="Ba Sao" />)
  fireEvent.click(screen.getByRole('button', { name: 'Loại cầu' }))
  expect(screen.getByLabelText('Tên loại cầu')).toHaveValue('Ba Sao')
})
