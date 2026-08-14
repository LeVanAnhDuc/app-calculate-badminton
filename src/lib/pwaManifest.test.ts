import { PWA_MANIFEST } from './pwaManifest'

test('start_url và scope tương đối để chạy đúng trên GitHub Pages', () => {
  // base là '/app-calculate-badminton/' khi deploy; ghi cứng '/' sẽ khiến app
  // đã cài mở về trang chủ github.io thay vì vào app
  expect(PWA_MANIFEST.start_url).toBe('.')
  expect(PWA_MANIFEST.scope).toBe('.')
})

test('short_name đủ ngắn để Android không cắt dưới icon', () => {
  expect(PWA_MANIFEST.short_name).toBe('Tiền cầu lông')
  expect(PWA_MANIFEST.short_name!.length).toBeLessThanOrEqual(13)
})

test('đường dẫn icon là tương đối', () => {
  for (const icon of PWA_MANIFEST.icons!) {
    expect(icon.src.startsWith('/')).toBe(false)
  }
})

test('có đủ icon any và maskable', () => {
  const purposes = PWA_MANIFEST.icons!.map((i) => i.purpose)
  expect(purposes).toContain('any')
  expect(purposes).toContain('maskable')
})

test('màu khớp với giao diện app', () => {
  expect(PWA_MANIFEST.theme_color).toBe('#059669')      // emerald-600, trùng header
  expect(PWA_MANIFEST.background_color).toBe('#f9fafb') // gray-50, nền trang
})
