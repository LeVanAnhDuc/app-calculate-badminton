import type { ManifestOptions } from 'vite-plugin-pwa'

/**
 * Tách khỏi vite.config.ts để test đọc được đúng giá trị đang dùng thật.
 * MỌI đường dẫn phải tương đối — app chạy ở '/' khi dev nhưng ở
 * '/app-calculate-badminton/' trên GitHub Pages.
 */
export const PWA_MANIFEST: Partial<ManifestOptions> = {
  name: 'Tính tiền cầu lông',
  short_name: 'Tiền cầu lông',
  description: 'Chia tiền sân & cầu cho nhóm sau mỗi buổi chơi',
  lang: 'vi',
  display: 'standalone',
  orientation: 'portrait',
  // Cũng khai riêng ở <meta name="theme-color"> trong index.html (đọc trước
  // khi manifest tải xong) — pwaManifest.test.ts canh hai giá trị này đồng bộ.
  theme_color: '#059669',
  background_color: '#f9fafb',
  start_url: '.',
  scope: '.',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
