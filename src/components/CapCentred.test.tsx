import { render, screen } from '@testing-library/react'
import { CapCentred } from './CapCentred'

test('nhích chữ lên đúng nửa phần chân chữ dư, tính theo em', () => {
  render(<CapCentred>N</CapCentred>)
  const el = screen.getByText('N')
  // 0.0625em = (ascent − descent)/2 − cap/2 của font hệ thống, đo bằng
  // TextMetrics trên trình duyệt; theo em nên đúng ở mọi cỡ chữ
  expect(el).toHaveClass('-translate-y-[0.0625em]')
})

test('là hộp khối, vì transform không ăn lên hộp inline', () => {
  render(<CapCentred>N</CapCentred>)
  expect(screen.getByText('N')).toHaveClass('block')
})
