/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { PWA_MANIFEST } from './src/lib/pwaManifest'

export default defineConfig({
  // GitHub Pages serves the app from /<repo-name>/ — set only in the deploy workflow
  base: process.env.GITHUB_PAGES === 'true' ? '/app-calculate-badminton/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // service worker tải bản mới ngầm, đứng waiting, tự áp dụng ở lần mở
      // app kế tiếp — KHÔNG kèm UI (không toast, không onNeedReload).
      // An toàn vì App.tsx ghi localStorage ngay mỗi lần state đổi.
      // Xem docs/superpowers/specs/2026-08-14-pwa-offline-design.md mục 4
      // trước khi đổi lại thành 'autoUpdate'.
      registerType: 'prompt',
      includeManifestIcons: false,
      manifest: PWA_MANIFEST,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: 'index.html',
      },
      // không đăng ký SW khi `npm run dev` — tránh sửa code mà trình duyệt
      // vẫn phục vụ bản cache cũ
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    globals: true,
    // Claude Code worktrees live inside the repo; without this, `npm test`
    // from the root also picks up every test file in each worktree copy
    exclude: ['**/node_modules/**', '.claude/worktrees/**'],
  },
})
