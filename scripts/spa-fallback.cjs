// GitHub Pages không có SPA fallback: mở thẳng /app-calculate-badminton/history
// (link chia sẻ, F5, lần đầu khi service worker chưa cài) sẽ ra 404 vì không có
// file nào ở đó. Pages phục vụ 404.html cho mọi đường dẫn không tồn tại, nên một
// bản sao của index.html ở đó cho React Router nhận URL và render đúng trang.
//
// Chạy SAU `vite build` và check-precache: 404.html không vào precache của
// service worker — khi đã cài, SW tự trả index.html qua navigateFallback.
'use strict'

const fs = require('node:fs')
const path = require('node:path')

const dist = path.join(__dirname, '..', 'dist')
fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'))
console.log('[spa-fallback] dist/404.html ← dist/index.html')
