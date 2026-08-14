/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages serves the app from /<repo-name>/ — set only in the deploy workflow
  base: process.env.GITHUB_PAGES === 'true' ? '/app-calculate-badminton/' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    globals: true,
    // Claude Code worktrees live inside the repo; without this, `npm test`
    // from the root also picks up every test file in each worktree copy
    exclude: ['**/node_modules/**', '.claude/worktrees/**'],
  },
})
