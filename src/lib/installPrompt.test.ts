import { act, renderHook } from '@testing-library/react'
import { useInstallPrompt, type BeforeInstallPromptEvent } from './installPrompt'

const REAL_UA = navigator.userAgent
const REAL_MATCH_MEDIA = window.matchMedia

function setUA(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true })
}

function setStandalone(on: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: on && query === '(display-mode: standalone)',
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

/** Sự kiện giả lập Chrome bắn ra; prompt() đếm số lần được gọi. */
function fireBeforeInstallPrompt(): { prompt: ReturnType<typeof vi.fn>; prevented: () => boolean } {
  const prompt = vi.fn(() => Promise.resolve())
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: 'accepted' as const }) })
  act(() => {
    window.dispatchEvent(event)
  })
  return { prompt, prevented: () => event.defaultPrevented }
}

beforeEach(() => {
  localStorage.clear()
  setUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120')
  setStandalone(false)
})

afterEach(() => {
  setUA(REAL_UA)
  window.matchMedia = REAL_MATCH_MEDIA
  delete (window.navigator as Navigator & { standalone?: boolean }).standalone
})

test('desktop chưa có beforeinstallprompt thì ẩn', () => {
  const { result } = renderHook(() => useInstallPrompt())
  expect(result.current.mode).toBe('hidden')
})

test('nhận beforeinstallprompt thì chuyển sang android', () => {
  const { result } = renderHook(() => useInstallPrompt())
  fireBeforeInstallPrompt()
  expect(result.current.mode).toBe('android')
})

test('chặn thanh gợi ý mặc định của Chrome', () => {
  renderHook(() => useInstallPrompt())
  const { prevented } = fireBeforeInstallPrompt()
  expect(prevented()).toBe(true)
})

test('UA iPhone, chưa cài, chưa tắt thì hiện hướng dẫn iOS', () => {
  setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1')
  const { result } = renderHook(() => useInstallPrompt())
  expect(result.current.mode).toBe('ios')
})

test('đang chạy standalone thì ẩn, kể cả trên iPhone', () => {
  setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1')
  setStandalone(true)
  const { result } = renderHook(() => useInstallPrompt())
  expect(result.current.mode).toBe('hidden')
})

test('iOS báo đã cài qua navigator.standalone thì ẩn', () => {
  setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1')
  // iOS không theo chuẩn display-mode, dùng thuộc tính riêng này
  Object.defineProperty(window.navigator, 'standalone', { value: true, configurable: true })
  const { result } = renderHook(() => useInstallPrompt())
  expect(result.current.mode).toBe('hidden')
})

test('đã tắt trước đó thì ẩn kể cả khi beforeinstallprompt bắn', () => {
  localStorage.setItem('installDismissed', 'true')
  const { result } = renderHook(() => useInstallPrompt())
  fireBeforeInstallPrompt()
  expect(result.current.mode).toBe('hidden')
})

test('install() gọi prompt() rồi ẩn đi vì event chỉ dùng được một lần', () => {
  const { result } = renderHook(() => useInstallPrompt())
  const { prompt } = fireBeforeInstallPrompt()
  act(() => {
    result.current.install()
  })
  expect(prompt).toHaveBeenCalledTimes(1)
  expect(result.current.mode).toBe('hidden')
})

test('dismiss() ghi localStorage và ẩn đi', () => {
  const { result } = renderHook(() => useInstallPrompt())
  fireBeforeInstallPrompt()
  act(() => {
    result.current.dismiss()
  })
  expect(result.current.mode).toBe('hidden')
  expect(localStorage.getItem('installDismissed')).toBe('true')
})

test('nhận appinstalled thì ẩn đi', () => {
  const { result } = renderHook(() => useInstallPrompt())
  fireBeforeInstallPrompt()
  act(() => {
    window.dispatchEvent(new Event('appinstalled'))
  })
  expect(result.current.mode).toBe('hidden')
})

test('gỡ listener khi unmount', () => {
  const remove = vi.spyOn(window, 'removeEventListener')
  const { unmount } = renderHook(() => useInstallPrompt())
  unmount()
  const events = remove.mock.calls.map((c) => c[0])
  expect(events).toContain('beforeinstallprompt')
  expect(events).toContain('appinstalled')
  remove.mockRestore()
})
