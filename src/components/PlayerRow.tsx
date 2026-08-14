import { useState } from 'react'
import { motion, Reorder, useDragControls } from 'motion/react'
import type { Gender, Mode, Player } from '../lib/types'
import { DeleteButton } from './DeleteButton'
import { GenderBadge } from './GenderBadge'
import { PencilIcon } from './icons'
import { SwipeToDelete } from './SwipeToDelete'

interface PlayerRowProps {
  player: Player
  mode: Mode
  timeLabel: string
  isSwipeOpen: boolean
  onSwipeOpenChange: (id: string | null) => void
  onRemove: (id: string) => void
  onChangeGender: (id: string, gender: Gender) => void
  onEdit: (player: Player) => void
  onToggleHalf: (player: Player) => void
  onDraggingChange: (dragging: boolean) => void
}

function DragHandleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  )
}

export function PlayerRow({
  player,
  mode,
  timeLabel,
  isSwipeOpen,
  onSwipeOpenChange,
  onRemove,
  onChangeGender,
  onEdit,
  onToggleHalf,
  onDraggingChange,
}: PlayerRowProps) {
  const dragControls = useDragControls()
  const [dragging, setDragging] = useState(false)

  return (
    <Reorder.Item
      value={player}
      dragListener={false}
      dragControls={dragControls}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      whileDrag={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)' }}
      onDragStart={() => {
        setDragging(true)
        onSwipeOpenChange(null)
        onDraggingChange(true)
      }}
      onDragEnd={() => {
        setDragging(false)
        onDraggingChange(false)
      }}
      className={`relative ${dragging ? 'z-10' : ''}`}
    >
      <SwipeToDelete
        testId={`swipe-row-${player.id}`}
        label={`Xóa nhanh ${player.name}`}
        isOpen={isSwipeOpen}
        onOpenChange={(open) => onSwipeOpenChange(open ? player.id : null)}
        onDelete={() => onRemove(player.id)}
        disabled={dragging}
        surfaceClassName="bg-white py-2.5"
      >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                aria-label={`Sắp xếp ${player.name}`}
                title="Kéo để sắp xếp"
                onPointerDown={(e) => {
                  e.preventDefault()
                  dragControls.start(e)
                }}
                onTouchStart={(e) => e.stopPropagation()}
                className="w-11 h-11 -my-2 -ml-2 flex items-center justify-center text-gray-300 touch-none cursor-grab active:cursor-grabbing shrink-0"
              >
                <DragHandleIcon />
              </button>
              <button
                type="button"
                aria-label={`Đổi giới tính ${player.name}`}
                title="Đổi giới tính"
                onClick={() => onChangeGender(player.id, player.gender === 'male' ? 'female' : 'male')}
              >
                <GenderBadge gender={player.gender} />
              </button>
              <button type="button" className="text-left min-w-0" onClick={() => onEdit(player)}>
                <span className="font-medium text-gray-900 block truncate">{player.name}</span>
                {mode === 'hourly' && (
                  <span
                    className={`text-xs ${
                      player.startTime === null ? 'text-gray-400' : 'font-semibold text-emerald-700'
                    }`}
                  >
                    {timeLabel}
                  </span>
                )}
              </button>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {mode === 'ratio' && (
                <motion.button
                  type="button"
                  aria-pressed={player.halfSession}
                  aria-label={`½ buổi ${player.name}`}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onToggleHalf(player)}
                  className={`h-9 px-2.5 rounded-full text-xs font-semibold transition-colors duration-200 ${
                    player.halfSession
                      ? 'bg-emerald-600 text-white'
                      : 'border border-gray-200 text-gray-400'
                  }`}
                >
                  {player.halfSession ? '½ buổi ✓' : '½ buổi'}
                </motion.button>
              )}
              <button
                type="button"
                aria-label={`Sửa ${player.name}`}
                title="Sửa"
                onClick={() => onEdit(player)}
                className="hidden md:flex md:w-10 md:h-10 items-center justify-center text-gray-400 hover:bg-gray-100 rounded-lg"
              >
                <PencilIcon />
              </button>
              <DeleteButton label={`Xóa ${player.name}`} onClick={() => onRemove(player.id)} />
            </div>
          </div>
      </SwipeToDelete>
    </Reorder.Item>
  )
}
