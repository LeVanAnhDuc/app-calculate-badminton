import { useInstallPrompt } from '../lib/installPrompt'
import { CloseIcon } from './icons'

export function InstallBanner() {
  const { mode, install, dismiss } = useInstallPrompt()

  if (mode === 'hidden') return null

  return (
    <div className="mx-4 mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 md:mx-0">
      <div className="flex items-start gap-3">
        <div className="flex-1 text-sm text-emerald-900">
          <p className="font-semibold">Cài app lên màn hình chính</p>
          <p className="mt-0.5 text-emerald-800">
            {mode === 'android'
              ? 'Mở nhanh hơn và dùng được cả khi mất mạng.'
              : 'Bấm nút Chia sẻ ⬆️ rồi chọn "Thêm vào MH chính" để dùng được cả khi mất mạng.'}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tắt lời mời cài app"
          className="h-11 w-11 -mt-2 -mr-2 shrink-0 text-emerald-700 flex items-center justify-center"
        >
          <CloseIcon size={18} />
        </button>
      </div>
      {mode === 'android' && (
        <button
          type="button"
          onClick={install}
          className="mt-3 h-11 w-full rounded-xl bg-emerald-600 text-white text-sm font-semibold"
        >
          Cài đặt
        </button>
      )}
    </div>
  )
}
