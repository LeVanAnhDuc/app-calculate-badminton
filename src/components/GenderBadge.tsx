import type { Gender } from '../lib/types'

export function GenderBadge({ gender }: { gender: Gender }) {
  return (
    <span
      className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
        gender === 'male' ? 'bg-emerald-100 text-emerald-700' : 'bg-pink-100 text-pink-700'
      }`}
    >
      {gender === 'male' ? 'N' : 'Nữ'}
    </span>
  )
}
