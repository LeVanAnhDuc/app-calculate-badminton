import { render, screen } from '@testing-library/react'
import { Reorder } from 'motion/react'
import { PlayerRow } from './PlayerRow'
import type { Mode, Player } from '../lib/types'

const ha: Player = {
  id: '1',
  name: 'Hà',
  gender: 'female',
  halfSession: false,
  startTime: null,
  endTime: null,
  paid: false,
}

function renderRow(player: Player = ha, mode: Mode = 'ratio') {
  return render(
    <Reorder.Group axis="y" values={[player]} onReorder={() => {}}>
      <PlayerRow
        player={player}
        mode={mode}
        timeLabel="Chưa chọn giờ"
        isSwipeOpen={false}
        onSwipeOpenChange={() => {}}
        onRemove={() => {}}
        onChangeGender={() => {}}
        onEdit={() => {}}
        onToggleHalf={() => {}}
        onDraggingChange={() => {}}
      />
    </Reorder.Group>,
  )
}

test('nút tên có vùng chạm cao ≥44px kể cả khi tên ngắn và không có dòng giờ', () => {
  renderRow()
  const nameButton = screen.getByRole('button', { name: 'Hà' })
  expect(nameButton).toHaveClass('min-h-11', 'py-2', '-my-2', 'flex', 'justify-center')
})

test('vùng chạm của nút tên không đổi khi có thêm dòng giờ ở chế độ theo giờ', () => {
  renderRow({ ...ha, startTime: '19:00', endTime: '21:00' }, 'hourly')
  const nameButton = screen.getByRole('button', { name: /^Hà/ })
  expect(nameButton).toHaveClass('min-h-11')
  expect(screen.getByText('Chưa chọn giờ')).toBeInTheDocument()
})

test('chữ tên giữ nguyên cỡ — chỉ vùng chạm to ra', () => {
  renderRow()
  expect(screen.getByText('Hà')).toHaveClass('font-medium', 'truncate')
})

test('nút đổi giới tính có vùng chạm 44×44 với margin âm để hàng không cao thêm', () => {
  renderRow()
  const genderButton = screen.getByRole('button', { name: 'Đổi giới tính Hà' })
  expect(genderButton).toHaveClass('w-11', 'h-11', '-m-1.5', 'flex', 'items-center', 'justify-center')
  // avatar bên trong vẫn 32px như mọi chỗ khác dùng GenderBadge
  expect(genderButton.querySelector('.w-8.h-8')).not.toBeNull()
})

test('chip ½ buổi cao 44px', () => {
  renderRow()
  expect(screen.getByRole('button', { name: '½ buổi Hà' })).toHaveClass('h-11')
})
