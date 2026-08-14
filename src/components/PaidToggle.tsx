import { AnimatePresence, motion } from 'motion/react'

const SIZES = {
  md: { hit: 'w-10 h-10', circle: 'w-7 h-7', check: 'text-sm' },
  sm: { hit: 'w-9 h-9', circle: 'w-6 h-6', check: 'text-xs' },
} as const

interface PaidToggleProps {
  paid: boolean
  name: string
  onToggle: () => void
  size?: keyof typeof SIZES
}

/**
 * Shared paid/unpaid toggle used by ResultPanel (inline + full-screen) and
 * HistoryPage's expanded detail rows. A springy ✓ pops in on the visible
 * circle (kept at w-7 h-7 so it visually balances the row's w-8 h-8 gender
 * avatar) while the tap target stays a full ≥40px hit area around it.
 */
export function PaidToggle({ paid, name, onToggle, size = 'md' }: PaidToggleProps) {
  const { hit, circle, check } = SIZES[size]
  return (
    <motion.button
      type="button"
      aria-label={paid ? `Bỏ đánh dấu ${name} đã trả` : `Đánh dấu ${name} đã trả`}
      onClick={onToggle}
      whileTap={{ scale: 0.9 }}
      className={`${hit} shrink-0 flex items-center justify-center rounded-full`}
    >
      <span
        className={`${circle} rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
          paid ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 hover:border-emerald-400'
        }`}
      >
        <AnimatePresence>
          {paid && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', bounce: 0.4, duration: 0.3 }}
              className={`text-white leading-none ${check}`}
            >
              ✓
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  )
}
