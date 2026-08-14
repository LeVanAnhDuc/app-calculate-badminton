import { render, screen } from '@testing-library/react'
import { GenderBadge } from './GenderBadge'

test.each([
  ['male' as const, 'N'],
  ['female' as const, 'Nữ'],
])('chữ trong avatar %s được canh giữa theo chiều cao chữ hoa', (gender, letter) => {
  render(<GenderBadge gender={gender} />)
  expect(screen.getByText(letter)).toHaveClass('-translate-y-[0.0625em]')
})
