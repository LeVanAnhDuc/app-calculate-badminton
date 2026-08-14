import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteButton } from './DeleteButton'

test('calls onClick and exposes the label to assistive tech', () => {
  const onClick = vi.fn()
  render(<DeleteButton label="Xóa Tuấn" onClick={onClick} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xóa Tuấn' }))
  expect(onClick).toHaveBeenCalledTimes(1)
})

test('draws an svg icon, never a text glyph — a glyph box is what sits off-centre', () => {
  render(<DeleteButton label="Xóa Tuấn" onClick={() => {}} />)
  const button = screen.getByRole('button', { name: 'Xóa Tuấn' })
  expect(button.querySelector('svg')).not.toBeNull()
  expect(button.textContent).toBe('')
})

test('centres the icon in a square box the same size as the Sửa button', () => {
  render(<DeleteButton label="Xóa Tuấn" onClick={() => {}} />)
  const button = screen.getByRole('button', { name: 'Xóa Tuấn' })
  expect(button).toHaveClass('items-center', 'justify-center', 'md:w-10', 'md:h-10')
})

test('is red at rest and red on hover', () => {
  render(<DeleteButton label="Xóa Tuấn" onClick={() => {}} />)
  const button = screen.getByRole('button', { name: 'Xóa Tuấn' })
  expect(button).toHaveClass('text-red-500', 'hover:text-red-600', 'hover:bg-red-50')
})

test('hides itself below md — on mobile deleting is a swipe, not a button', () => {
  render(<DeleteButton label="Xóa Tuấn" onClick={() => {}} />)
  const button = screen.getByRole('button', { name: 'Xóa Tuấn' })
  expect(button).toHaveClass('hidden', 'md:flex')
})
