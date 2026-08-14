import { toast } from 'sonner'
import { copyResultText, shareResultImage } from '../lib/shareResult'
import type { CalcResult, Mode, Player } from '../lib/types'

interface ShareProps {
  result: CalcResult
  mode: Mode
  players: Player[]
  date?: Date
  variant?: 'icon' | 'wide'
}

const ICON_CLASS =
  'w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100'
const WIDE_CLASS =
  'w-full h-12 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold flex items-center justify-center gap-2'

function ShareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v13" />
      <path d="m16 6-4-4-4 4" />
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}

export function ShareImageButton({ result, mode, players, date, variant = 'icon' }: ShareProps) {
  const handleShare = async () => {
    const outcome = await shareResultImage(result, mode, players, date)
    // 'shared'/'cancelled' get their feedback from the OS share sheet itself
    if (outcome === 'downloaded') toast.success('Đã tải ảnh kết quả')
  }
  if (variant === 'wide') {
    return (
      <button type="button" onClick={handleShare} className={WIDE_CLASS}>
        <ShareIcon /> Chia sẻ ảnh
      </button>
    )
  }
  return (
    <button type="button" aria-label="Chia sẻ ảnh kết quả" title="Chia sẻ ảnh kết quả"
      onClick={handleShare} className={ICON_CLASS}>
      <ShareIcon />
    </button>
  )
}

export function CopyTextButton({ result, mode, players, date, variant = 'icon' }: ShareProps) {
  const handleCopy = async () => {
    const ok = await copyResultText(result, mode, players, date)
    if (ok) toast.success('Đã copy kết quả ✓')
    else toast.error('Không copy được kết quả')
  }
  if (variant === 'wide') {
    return (
      <button type="button" onClick={handleCopy} className={WIDE_CLASS}>
        <CopyIcon /> Copy kết quả
      </button>
    )
  }
  return (
    <button type="button" aria-label="Copy kết quả" title="Copy kết quả"
      onClick={handleCopy} className={ICON_CLASS}>
      <CopyIcon />
    </button>
  )
}
