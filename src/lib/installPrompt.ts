import { useCallback, useEffect, useState } from 'react'
import { loadInstallDismissed, saveInstallDismissed } from './storage'

export type InstallMode = 'hidden' | 'android' | 'ios'

/** Chrome bắn sự kiện này khi app đủ điều kiện cài; chưa có trong lib DOM chuẩn. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS Safari không theo chuẩn display-mode, dùng thuộc tính riêng
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIOS(): boolean {
  // iPad đời mới mặc định báo UA desktop nên sẽ lọt lưới. Hệ quả xấu nhất là
  // một người dùng iPad không thấy gợi ý — chấp nhận được, không phải lỗi.
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function useInstallPrompt(): {
  mode: InstallMode
  install: () => void
  dismiss: () => void
} {
  const [dismissed, setDismissed] = useState(() => loadInstallDismissed())
  const [installed, setInstalled] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault() // chặn thanh gợi ý mặc định của Chrome
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onAppInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const install = useCallback(() => {
    if (!deferred) return
    // Không chờ userChoice: dù người dùng đồng ý hay từ chối thì event cũng đã
    // tiêu, dải mời đều phải ẩn. Chờ kết quả không đổi hành vi nào.
    void deferred.prompt()
    setDeferred(null) // event chỉ dùng được một lần
  }, [deferred])

  const dismiss = useCallback(() => {
    saveInstallDismissed(true)
    setDismissed(true)
  }, [])

  let mode: InstallMode = 'hidden'
  if (!dismissed && !installed && !isStandalone()) {
    if (deferred) mode = 'android'
    else if (isIOS()) mode = 'ios'
  }

  return { mode, install, dismiss }
}
