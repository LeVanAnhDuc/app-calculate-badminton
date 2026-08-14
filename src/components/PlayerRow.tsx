import { useRef, useState, type TouchEvent } from 'react'
import { motion, Reorder, useDragControls } from 'motion/react'
import type { Gender, Mode, Player } from '../lib/types'
import { GenderBadge } from './GenderBadge'

const SWIPE_OPEN_PX = 80
const SWIPE_THRESHOLD_PX = 40

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

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  )
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
  const [swipe, setSwipe] = useState<{ startX: number; deltaX: number } | null>(null)
  const swipeDeltaRef = useRef<number | null>(null)
  const dragControls = useDragControls()
  const [dragging, setDragging] = useState(false)

  const translate = swipe ? swipe.deltaX : isSwipeOpen ? -SWIPE_OPEN_PX : 0

  const handleTouchStart = (e: TouchEvent) => {
    if (dragging) return
    swipeDeltaRef.current = 0
    setSwipe({ startX: e.touches[0].clientX, deltaX: 0 })
  }

  const handleTouchMove = (e: TouchEvent) => {
    const x = e.touches[0].clientX
    setSwipe((s) => {
      if (!s) return s
      const deltaX = Math.min(0, Math.max(x - s.startX, -SWIPE_OPEN_PX))
      swipeDeltaRef.current = deltaX
      return { ...s, deltaX }
    })
  }

  const handleTouchEnd = () => {
    const delta = swipeDeltaRef.current
    swipeDeltaRef.current = null
    if (delta === null) return
    onSwipeOpenChange(delta <= -SWIPE_THRESHOLD_PX ? player.id : null)
    setSwipe(null)
  }

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
        setSwipe(null)
        swipeDeltaRef.current = null
        onSwipeOpenChange(null)
        onDraggingChange(true)
      }}
      onDragEnd={() => {
        setDragging(false)
        onDraggingChange(false)
      }}
      className={`relative ${dragging ? 'z-10' : ''}`}
    >
      <div className="relative overflow-hidden">
        <button
          type="button"
          aria-label={`Xóa nhanh ${player.name}`}
          onClick={() => onRemove(player.id)}
          className="absolute inset-y-0 right-0 w-20 bg-red-500 text-white text-sm font-semibold flex items-center justify-center"
        >
          Xóa
        </button>
        <div
          data-testid={`swipe-row-${player.id}`}
          className="relative bg-white py-2.5 transition-transform duration-150 ease-out"
          style={{ transform: `translateX(${translate}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClickCapture={(e) => {
            if (isSwipeOpen) {
              onSwipeOpenChange(null)
              e.stopPropagation()
            }
          }}
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
              <button
                type="button"
                aria-label={`Xóa ${player.name}`}
                onClick={() => onRemove(player.id)}
                className="hidden md:flex md:w-10 md:h-10 items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </Reorder.Item>
  )
}
