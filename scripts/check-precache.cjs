// Canh danh sách precache trong dist/sw.js sau khi vite-plugin-pwa build xong.
// Chạy sau `vite build` (xem package.json). Không phải test vitest vì lúc
// `npm test` chạy trong CI, dist/ chưa tồn tại — xem
// .github/workflows/deploy.yml (test chạy trước build).
'use strict'

const fs = require('node:fs')
const path = require('node:path')

const SW_PATH = path.join(__dirname, '..', 'dist', 'sw.js')

const REQUIRED_FILES = [
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'favicon.svg',
  'apple-touch-icon.png',
]

function fail(message) {
  console.error(`[check-precache] ${message}`)
  process.exit(1)
}

if (!fs.existsSync(SW_PATH)) {
  fail(`không tìm thấy ${SW_PATH} — chạy sau khi \`vite build\` xong.`)
}

const swContent = fs.readFileSync(SW_PATH, 'utf8')

// dist/sw.js đã minify, entry precache có dạng {url:"...",revision:"..."|null}
const urlMatches = [...swContent.matchAll(/\{url:"([^"]+)"/g)].map((m) => m[1])

if (urlMatches.length === 0) {
  fail('không tìm thấy entry precache nào trong dist/sw.js — kiểm tra lại cấu hình workbox.')
}

// (a) kiểm trùng lặp
const seen = new Map()
for (const url of urlMatches) {
  seen.set(url, (seen.get(url) || 0) + 1)
}
const duplicates = [...seen.entries()].filter(([, count]) => count > 1)
if (duplicates.length > 0) {
  const detail = duplicates.map(([url, count]) => `${url} (x${count})`).join(', ')
  fail(
    `precache có entry trùng lặp: ${detail}. ` +
      'Kiểm tra includeAssets/includeManifestIcons trong vite.config.ts có bắt trùng globPatterns không.',
  )
}

// (b) kiểm thiếu file bắt buộc
const missing = REQUIRED_FILES.filter((file) => !urlMatches.includes(file))
if (missing.length > 0) {
  fail(`precache thiếu file bắt buộc: ${missing.join(', ')}.`)
}

const hasJs = urlMatches.some((url) => url.startsWith('assets/') && url.endsWith('.js'))
const hasCss = urlMatches.some((url) => url.startsWith('assets/') && url.endsWith('.css'))
if (!hasJs) {
  fail('precache thiếu file .js nào trong assets/ — bundle chính có vẻ không được precache.')
}
if (!hasCss) {
  fail('precache thiếu file .css nào trong assets/ — style chính có vẻ không được precache.')
}

console.log(`[check-precache] OK — ${urlMatches.length} entries, không trùng lặp, đủ file bắt buộc.`)
