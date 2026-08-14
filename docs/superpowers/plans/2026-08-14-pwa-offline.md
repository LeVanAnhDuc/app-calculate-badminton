# PWA — cài lên màn hình chính & chạy offline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App cài được lên màn hình chính với icon riêng và chạy đủ mọi tính năng khi không có mạng.

**Architecture:** Thêm `vite-plugin-pwa` ở chế độ `generateSW` — plugin sinh service worker Workbox precache toàn bộ output build, và sinh `manifest.webmanifest` từ một hằng số TypeScript. App vốn không gọi API, không tải webfont hay ảnh từ ngoài, dữ liệu đã nằm ở localStorage, nên precache bundle là đủ để chạy offline hoàn toàn. Phần logic mời cài đặt tách riêng khỏi UI: `installPrompt.ts` giữ toàn bộ việc dò sự kiện trình duyệt và phơi ra một hook trả về trạng thái đơn giản; `InstallBanner.tsx` chỉ render theo trạng thái đó.

**Tech Stack:** React 19, TypeScript strict, Vite 8, Vitest + React Testing Library, `vite-plugin-pwa@^1.3.0` (Workbox 7), `sharp-cli` chạy qua `npx` để render icon (không thêm dependency).

**Spec:** `docs/superpowers/specs/2026-08-14-pwa-offline-design.md`

## Global Constraints

- **`start_url` và `scope` PHẢI là `"."`**, không được là `"/"`. App chạy ở `/` khi dev nhưng ở `/app-calculate-badminton/` trên GitHub Pages (xem `base` trong `vite.config.ts`). Ghi cứng `/` thì app cài từ GitHub Pages mở về trang chủ `username.github.io` thay vì vào app.
- **Mọi đường dẫn tài nguyên trong manifest và `index.html` phải tương đối** (`icon-192.png`, `./favicon.svg`), không bắt đầu bằng `/`. Cùng lý do trên.
- **`short_name` ≤ 13 ký tự.** Giá trị chốt: `"Tiền cầu lông"`. Tên đầy đủ `"Tính tiền cầu lông"` (18 ký tự) bị Android cắt cụt dưới icon.
- **Màu**: `theme_color` `#059669` (emerald-600, trùng header trong `App.tsx`), `background_color` `#f9fafb` (gray-50).
- **Icon không được dùng ký tự emoji** — emoji phụ thuộc font từng máy nên hiện khác nhau giữa Android, iOS, Windows. Toàn bộ là vector hình học.
- **`apple-touch-icon.png` không bo góc, không nền trong suốt.** iOS tự bo góc (ảnh bo sẵn sẽ bị bo hai lần) và tô đen vùng trong suốt.
- **Quy ước test của repo**: dùng `test(...)` phẳng ở cấp cao nhất, không `describe`, không import gì từ `vitest` (đã bật `globals: true`). Xem `src/lib/format.test.ts`.
- **Quy ước commit** (`CLAUDE.md`): mỗi push vào `main` tự tạo release. Task cuối dùng `feat:`; các task giữa dùng `feat:`/`test:`/`chore:` tuỳ nội dung.
- **`npm run build` (tsc + vite build) phải pass** trước khi coi bất kỳ task nào là xong.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `assets/icons/icon-192.svg` | nguồn vector, khai `width/height="192"` |
| `assets/icons/icon-512.svg` | nguồn vector, khai `width/height="512"` |
| `assets/icons/icon-maskable-512.svg` | nguồn vector bản thu 68%, khai `width/height="512"` |
| `assets/icons/apple-touch-icon.svg` | nguồn vector, khai `width/height="180"` |
| `public/favicon.svg` | favicon vector, dùng trực tiếp không qua render |
| `public/icon-*.png`, `public/apple-touch-icon.png` | PNG sinh ra, commit vào repo |
| `src/lib/pwaManifest.ts` | hằng số manifest — tách riêng để test đọc được đúng giá trị đang dùng thật |
| `src/lib/installPrompt.ts` | dò `beforeinstallprompt`/`appinstalled`, nhận diện iOS & standalone, hook `useInstallPrompt()` |
| `src/components/InstallBanner.tsx` | UI thuần, render theo `mode`, không chứa logic dò trình duyệt |
| `src/lib/storage.ts` | thêm 2 hàm đọc/ghi trạng thái đã tắt lời mời |
| `vite.config.ts` | nạp plugin, trỏ vào `PWA_MANIFEST` |

**Lưu ý về trùng lặp**: 3 file `icon-192.svg`, `icon-512.svg`, `apple-touch-icon.svg` có phần hình **giống hệt nhau**, chỉ khác `width`/`height`. Đây là hệ quả của việc `sharp-cli` lấy tên file ra từ tên file vào và render theo kích thước nội tại của SVG. Mỗi file phải mang comment cảnh báo sửa thì sửa cả ba. Task 1 có một test tự động chặn việc sửa lệch.

---

## Task 1: Bộ icon

**Files:**
- Create: `assets/icons/icon-192.svg`, `assets/icons/icon-512.svg`, `assets/icons/icon-maskable-512.svg`, `assets/icons/apple-touch-icon.svg`
- Create: `public/favicon.svg`
- Create (sinh ra): `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`
- Test: `src/lib/icons.test.ts`
- Modify: `index.html` (dòng 6 — thẻ `<link rel="icon">` hiện tại)

**Interfaces:**
- Consumes: không có (task đầu tiên)
- Produces: các file PNG trong `public/` mà Task 2 tham chiếu trong manifest với tên chính xác `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`; và `public/apple-touch-icon.png`, `public/favicon.svg` mà `index.html` trỏ tới.

### Thiết kế icon

Quả cầu lông nghiêng 35° kèm 2 vệt chuyển động, trắng trên nền emerald `#059669`. Hai biến thể:

- **`any`** (icon-192, icon-512, apple-touch-icon): quả cầu tỉ lệ `0.88`, vệt bay dài.
- **`maskable`** (icon-maskable-512): quả cầu tỉ lệ `0.68`, vệt bay ngắn — mọi nét nằm trong vòng an toàn 80% để Android cắt tròn/squircle/giọt nước không mất chi tiết.

Dùng **2 vệt dày** chứ không phải 3 vệt mảnh: ở 48px ba nét mảnh dính vào nhau thành mảng mờ.

- [ ] **Step 1: Tạo `assets/icons/icon-512.svg`**

```svg
<!-- Icon "any" — hình GIỐNG HỆT icon-192.svg và apple-touch-icon.svg,
     chỉ khác width/height. Sửa hình thì phải sửa cả 3 file.
     Kiểm tra tự động: src/lib/icons.test.ts -->
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#059669"/>
  <g stroke="#ffffff" stroke-linecap="round" opacity="0.5">
    <line x1="26.5" y1="67" x2="19" y2="77.5" stroke-width="6.5"/>
    <line x1="34" y1="76.5" x2="25.5" y2="88.5" stroke-width="6"/>
  </g>
  <g transform="translate(52 46) rotate(35) scale(0.88) translate(-50 -50)">
    <path d="M36 60 L20 22 Q50 10 80 22 L64 60 Z" fill="#ffffff"/>
    <g stroke="#059669" stroke-width="2.6" stroke-linecap="round">
      <line x1="50" y1="60" x2="50" y2="13"/>
      <line x1="43" y1="60" x2="31" y2="17"/>
      <line x1="57" y1="60" x2="69" y2="17"/>
    </g>
    <rect x="33" y="56" width="34" height="8" rx="4" fill="#ffffff"/>
    <circle cx="50" cy="72" r="13" fill="#ffffff"/>
  </g>
</svg>
```

- [ ] **Step 2: Tạo `assets/icons/icon-192.svg` và `assets/icons/apple-touch-icon.svg`**

Chép y nguyên nội dung Step 1, chỉ đổi `width`/`height`:
- `icon-192.svg` → `width="192" height="192"`
- `apple-touch-icon.svg` → `width="180" height="180"`

Giữ nguyên comment ở đầu file.

- [ ] **Step 3: Tạo `assets/icons/icon-maskable-512.svg`**

```svg
<!-- Icon "maskable" — thu nhỏ để mọi nét nằm trong vòng an toàn 80%.
     Android cắt icon này theo hình máy quy định (tròn/squircle/giọt nước). -->
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#059669"/>
  <g stroke="#ffffff" stroke-linecap="round" opacity="0.5">
    <line x1="33" y1="64.5" x2="27.5" y2="72" stroke-width="5.5"/>
    <line x1="39" y1="71.5" x2="32.5" y2="80" stroke-width="5"/>
  </g>
  <g transform="translate(52.5 46.5) rotate(35) scale(0.68) translate(-50 -50)">
    <path d="M36 60 L20 22 Q50 10 80 22 L64 60 Z" fill="#ffffff"/>
    <g stroke="#059669" stroke-width="2.6" stroke-linecap="round">
      <line x1="50" y1="60" x2="50" y2="13"/>
      <line x1="43" y1="60" x2="31" y2="17"/>
      <line x1="57" y1="60" x2="69" y2="17"/>
    </g>
    <rect x="33" y="56" width="34" height="8" rx="4" fill="#ffffff"/>
    <circle cx="50" cy="72" r="13" fill="#ffffff"/>
  </g>
</svg>
```

- [ ] **Step 4: Tạo `public/favicon.svg`**

Bản không khai `width`/`height` (trình duyệt tự co giãn trong tab):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#059669"/>
  <g stroke="#ffffff" stroke-linecap="round" opacity="0.5">
    <line x1="26.5" y1="67" x2="19" y2="77.5" stroke-width="6.5"/>
    <line x1="34" y1="76.5" x2="25.5" y2="88.5" stroke-width="6"/>
  </g>
  <g transform="translate(52 46) rotate(35) scale(0.88) translate(-50 -50)">
    <path d="M36 60 L20 22 Q50 10 80 22 L64 60 Z" fill="#ffffff"/>
    <g stroke="#059669" stroke-width="2.6" stroke-linecap="round">
      <line x1="50" y1="60" x2="50" y2="13"/>
      <line x1="43" y1="60" x2="31" y2="17"/>
      <line x1="57" y1="60" x2="69" y2="17"/>
    </g>
    <rect x="33" y="56" width="34" height="8" rx="4" fill="#ffffff"/>
    <circle cx="50" cy="72" r="13" fill="#ffffff"/>
  </g>
</svg>
```

- [ ] **Step 5: Viết test chặn 3 file `any` sửa lệch nhau và chặn PNG sai**

Tạo `src/lib/icons.test.ts`. Test này đọc file thật trên đĩa nên dùng `node:fs`.

```ts
import { readFileSync } from 'node:fs'

/** Bỏ comment và khoảng trắng thừa để so sánh phần hình, bỏ qua width/height. */
function artwork(path: string): string {
  return readFileSync(path, 'utf-8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+width="\d+"\s+height="\d+"/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

test('3 icon bản "any" dùng chung một hình, chỉ khác kích thước', () => {
  const a = artwork('assets/icons/icon-512.svg')
  expect(artwork('assets/icons/icon-192.svg')).toBe(a)
  expect(artwork('assets/icons/apple-touch-icon.svg')).toBe(a)
})

test('mỗi SVG nguồn khai đúng kích thước đích', () => {
  const size = (p: string) => {
    const m = readFileSync(p, 'utf-8').match(/width="(\d+)" height="(\d+)"/)
    return m ? [Number(m[1]), Number(m[2])] : null
  }
  expect(size('assets/icons/icon-192.svg')).toEqual([192, 192])
  expect(size('assets/icons/icon-512.svg')).toEqual([512, 512])
  expect(size('assets/icons/icon-maskable-512.svg')).toEqual([512, 512])
  expect(size('assets/icons/apple-touch-icon.svg')).toEqual([180, 180])
})

/** Đọc IHDR của PNG: rộng, cao, color type (2 = RGB không alpha, 6 = RGBA). */
function pngHeader(path: string): { width: number; height: number; colorType: number } {
  const b = readFileSync(path)
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25] }
}

test('PNG sinh ra đúng kích thước và không có kênh alpha', () => {
  // iOS tô nền đen vào vùng trong suốt, nên mọi icon phải đặc hoàn toàn
  expect(pngHeader('public/icon-192.png')).toEqual({ width: 192, height: 192, colorType: 2 })
  expect(pngHeader('public/icon-512.png')).toEqual({ width: 512, height: 512, colorType: 2 })
  expect(pngHeader('public/icon-maskable-512.png')).toEqual({
    width: 512, height: 512, colorType: 2,
  })
  expect(pngHeader('public/apple-touch-icon.png')).toEqual({
    width: 180, height: 180, colorType: 2,
  })
})
```

- [ ] **Step 6: Chạy test để xác nhận nó fail**

Run: `npx vitest run src/lib/icons.test.ts`
Expected: FAIL — 2 test SVG pass, test PNG fail với `ENOENT ... public/icon-192.png` (chưa render).

- [ ] **Step 7: Render 4 file PNG**

Chạy lần lượt 4 lệnh (mỗi lệnh một file — `sharp-cli` **không ghép được** nhiều lệnh trong một lần gọi):

```bash
npx -y sharp-cli -i assets/icons/icon-192.svg          -o public/ --format png flatten "#059669"
npx -y sharp-cli -i assets/icons/icon-512.svg          -o public/ --format png flatten "#059669"
npx -y sharp-cli -i assets/icons/icon-maskable-512.svg -o public/ --format png flatten "#059669"
npx -y sharp-cli -i assets/icons/apple-touch-icon.svg  -o public/ --format png flatten "#059669"
```

Ba điều cần biết về các lệnh này:
- `-o` là **thư mục**, không phải đường dẫn file. Tên file ra = tên file SVG vào + `.png`.
- **Không dùng lệnh `resize`** — kích thước lấy từ `width`/`height` nội tại của SVG. Cách này vừa sắc nét vừa cho phép dùng `flatten` (ghép `flatten` với `resize` trong một lệnh sẽ báo `Unknown arguments`).
- `flatten "#059669"` xoá kênh alpha và tô nền emerald — đúng ràng buộc của `apple-touch-icon`, áp cho tất cả cho đồng nhất.

- [ ] **Step 8: Chạy lại test để xác nhận pass**

Run: `npx vitest run src/lib/icons.test.ts`
Expected: PASS — cả 3 test.

- [ ] **Step 9: Sửa `index.html`**

Thay dòng `<link rel="icon" href="data:image/svg+xml,...🏸...">` (dòng 6) bằng 3 dòng sau. Đường dẫn **tương đối**:

```html
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <link rel="apple-touch-icon" href="./apple-touch-icon.png" />
    <meta name="theme-color" content="#059669" />
```

Không tự thêm `<link rel="manifest">` — plugin ở Task 2 tự chèn.

- [ ] **Step 10: Chạy toàn bộ test + build**

Run: `npx vitest run && npm run build`
Expected: tất cả PASS, build thành công.

- [ ] **Step 11: Commit**

```bash
git add assets/icons public/favicon.svg public/icon-192.png public/icon-512.png \
        public/icon-maskable-512.png public/apple-touch-icon.png \
        src/lib/icons.test.ts index.html
git commit -m "feat: bộ icon PWA (any + maskable) thay favicon emoji"
```

---

## Task 2: Manifest & service worker

**Files:**
- Create: `src/lib/pwaManifest.ts`
- Test: `src/lib/pwaManifest.test.ts`
- Modify: `vite.config.ts`
- Modify: `package.json` (thêm devDependency)

**Interfaces:**
- Consumes: các file PNG từ Task 1, đúng tên `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
- Produces: `export const PWA_MANIFEST: Partial<ManifestOptions>` từ `src/lib/pwaManifest.ts`. Không task nào sau đó import nó ngoài `vite.config.ts` và test của chính nó.

- [ ] **Step 1: Cài plugin**

```bash
npm install -D vite-plugin-pwa
```

Phiên bản `^1.3.0` khai peer `vite: ^3 || ^4 || ^5 || ^6 || ^7 || ^8` nên tương thích Vite 8 của project. Nếu npm báo lỗi peer, **dừng lại và báo** thay vì dùng `--force`.

- [ ] **Step 2: Viết test trước**

Tạo `src/lib/pwaManifest.test.ts`:

```ts
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
```

- [ ] **Step 3: Chạy test để xác nhận fail**

Run: `npx vitest run src/lib/pwaManifest.test.ts`
Expected: FAIL — `Failed to resolve import "./pwaManifest"`.

- [ ] **Step 4: Viết `src/lib/pwaManifest.ts`**

```ts
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
```

- [ ] **Step 5: Chạy test để xác nhận pass**

Run: `npx vitest run src/lib/pwaManifest.test.ts`
Expected: PASS — cả 5 test.

- [ ] **Step 6: Nạp plugin vào `vite.config.ts`**

Thêm 2 import và 1 plugin. Giữ nguyên `base`, `test`, và thứ tự `react()`, `tailwindcss()`:

```ts
import { VitePWA } from 'vite-plugin-pwa'
import { PWA_MANIFEST } from './src/lib/pwaManifest'

// ...trong defineConfig:
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // service worker tải bản mới ngầm, tự áp dụng ở lần mở app kế tiếp.
      // An toàn vì App.tsx ghi localStorage ngay mỗi lần state đổi.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
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
```

Không cần viết code đăng ký service worker trong `main.tsx`: mặc định `injectRegister: 'auto'` khiến plugin tự chèn script đăng ký vào `index.html`.

- [ ] **Step 7: Build và kiểm tra output**

Run: `npm run build`
Expected: build thành công, và trong `dist/` có `manifest.webmanifest`, `sw.js`, `workbox-*.js`.

Kiểm tra bằng lệnh:

```bash
ls dist/manifest.webmanifest dist/sw.js && cat dist/manifest.webmanifest
```

Expected: `manifest.webmanifest` chứa `"start_url":"."` và `"short_name":"Tiền cầu lông"`.

- [ ] **Step 8: Kiểm tra bản GitHub Pages không hỏng đường dẫn**

Run (PowerShell — shell chính của máy này):

```powershell
$env:GITHUB_PAGES='true'; npm run build; Get-Content dist/manifest.webmanifest
```

Run (bash):

```bash
GITHUB_PAGES=true npm run build && cat dist/manifest.webmanifest
```

Expected: `start_url` vẫn là `"."`, và `dist/index.html` tham chiếu tài sản qua `/app-calculate-badminton/`.

Nhớ `Remove-Item Env:GITHUB_PAGES` (PowerShell) sau khi kiểm xong, kẻo các lệnh build sau đó vẫn sinh bản GitHub Pages.

- [ ] **Step 9: Chạy toàn bộ test**

Run: `npx vitest run`
Expected: tất cả PASS.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/lib/pwaManifest.ts src/lib/pwaManifest.test.ts
git commit -m "feat: manifest + service worker precache qua vite-plugin-pwa"
```

---

## Task 3: Lưu trạng thái đã tắt lời mời

**Files:**
- Modify: `src/lib/storage.ts` (thêm vào cuối file, cạnh các hàm export khác)
- Test: `src/lib/storage.test.ts` (thêm test vào file sẵn có)

**Interfaces:**
- Consumes: hàm nội bộ `load<T>(key, guard, fallback)` và `save(key, value)` đã có sẵn trong `storage.ts` (dòng 31–50).
- Produces: `loadInstallDismissed(): boolean` và `saveInstallDismissed(v: boolean): boolean`. Task 4 dùng cả hai.

- [ ] **Step 1: Viết test trước**

Thêm vào cuối `src/lib/storage.test.ts`. Đọc các test sẵn có trong file để theo đúng cách chúng dọn `localStorage` giữa các test — nếu file đã có `beforeEach(() => localStorage.clear())` thì không thêm lại.

```ts
test('installDismissed mặc định false khi chưa có gì trong localStorage', () => {
  localStorage.clear()
  expect(loadInstallDismissed()).toBe(false)
})

test('installDismissed lưu và đọc lại được', () => {
  localStorage.clear()
  saveInstallDismissed(true)
  expect(loadInstallDismissed()).toBe(true)
})

test('installDismissed bỏ qua dữ liệu hỏng, trả về false', () => {
  localStorage.clear()
  localStorage.setItem('installDismissed', 'khong-phai-json')
  expect(loadInstallDismissed()).toBe(false)
})

test('installDismissed bỏ qua giá trị sai kiểu', () => {
  localStorage.clear()
  localStorage.setItem('installDismissed', '"co"')
  expect(loadInstallDismissed()).toBe(false)
})
```

Nhớ thêm `loadInstallDismissed, saveInstallDismissed` vào dòng import ở đầu file test.

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — `loadInstallDismissed is not a function` (hoặc lỗi import).

- [ ] **Step 3: Thêm 2 hàm vào `src/lib/storage.ts`**

Đặt ở cuối file, dùng lại `load`/`save` nội bộ để giữ nguyên hành vi chịu lỗi (localStorage đầy hoặc bị chặn thì trả fallback, app vẫn chạy):

```ts
export const loadInstallDismissed = (): boolean =>
  load('installDismissed', (v) => typeof v === 'boolean', false)
export const saveInstallDismissed = (v: boolean): boolean => save('installDismissed', v)
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: lưu trạng thái đã tắt lời mời cài app"
```

---

## Task 4: Logic mời cài đặt

**Files:**
- Create: `src/lib/installPrompt.ts`
- Test: `src/lib/installPrompt.test.ts`

**Interfaces:**
- Consumes: `loadInstallDismissed()`, `saveInstallDismissed(v)` từ Task 3.
- Produces:
  - `type InstallMode = 'hidden' | 'android' | 'ios'`
  - `interface BeforeInstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }`
  - `useInstallPrompt(): { mode: InstallMode; install: () => void; dismiss: () => void }`

  Task 5 import `InstallMode` và `useInstallPrompt`.

### Vì sao hai nền tảng xử lý khác nhau

Android/Chrome bắn `beforeinstallprompt` nên app tự hiện nút cài được. **iOS Safari không bắn sự kiện đó và không có API nào để kích hoạt cài đặt bằng code** — người dùng phải tự bấm Share ▸ "Thêm vào MH chính". Nên iOS chỉ hiện được hướng dẫn.

- [ ] **Step 1: Viết test trước**

Tạo `src/lib/installPrompt.test.ts`. Lưu ý về môi trường test:
- `src/test-setup.ts` đã stub sẵn `window.matchMedia` trả `matches: false` cho mọi query. Test nào cần `matches: true` phải tự ghi đè rồi khôi phục.
- jsdom không cho gán thẳng `navigator.userAgent`; dùng `Object.defineProperty(..., { configurable: true })`.

```ts
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
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npx vitest run src/lib/installPrompt.test.ts`
Expected: FAIL — `Failed to resolve import "./installPrompt"`.

- [ ] **Step 3: Viết `src/lib/installPrompt.ts`**

```ts
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
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run src/lib/installPrompt.test.ts`
Expected: PASS — cả 11 test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/installPrompt.ts src/lib/installPrompt.test.ts
git commit -m "feat: logic phát hiện khả năng cài app (Android + iOS)"
```

---

## Task 5: Dải mời cài đặt

**Files:**
- Create: `src/components/InstallBanner.tsx`
- Test: `src/components/InstallBanner.test.tsx`
- Modify: `src/App.tsx` (thêm vào cây render)

**Interfaces:**
- Consumes: `useInstallPrompt()` và `InstallMode` từ Task 4.
- Produces: `export function InstallBanner(): JSX.Element | null` — không nhận prop nào, tự gọi hook bên trong.

- [ ] **Step 1: Viết test trước**

Tạo `src/components/InstallBanner.test.tsx`. Test giả lập hook để tách UI khỏi logic dò trình duyệt:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallBanner } from './InstallBanner'
import { useInstallPrompt } from '../lib/installPrompt'

vi.mock('../lib/installPrompt', () => ({ useInstallPrompt: vi.fn() }))

const mockHook = vi.mocked(useInstallPrompt)
const install = vi.fn()
const dismiss = vi.fn()

beforeEach(() => {
  install.mockClear()
  dismiss.mockClear()
})

test('không render gì khi mode là hidden', () => {
  mockHook.mockReturnValue({ mode: 'hidden', install, dismiss })
  const { container } = render(<InstallBanner />)
  expect(container).toBeEmptyDOMElement()
})

test('Android hiện nút Cài đặt', async () => {
  mockHook.mockReturnValue({ mode: 'android', install, dismiss })
  render(<InstallBanner />)
  await userEvent.click(screen.getByRole('button', { name: 'Cài đặt' }))
  expect(install).toHaveBeenCalledTimes(1)
})

test('iOS hiện hướng dẫn Share và KHÔNG có nút Cài đặt', () => {
  mockHook.mockReturnValue({ mode: 'ios', install, dismiss })
  render(<InstallBanner />)
  // iOS không có API cài đặt nên chỉ hướng dẫn được
  expect(screen.getByText(/Thêm vào MH chính/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Cài đặt' })).not.toBeInTheDocument()
})

test('bấm nút tắt gọi dismiss()', async () => {
  mockHook.mockReturnValue({ mode: 'android', install, dismiss })
  render(<InstallBanner />)
  await userEvent.click(screen.getByRole('button', { name: 'Tắt lời mời cài app' }))
  expect(dismiss).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npx vitest run src/components/InstallBanner.test.tsx`
Expected: FAIL — `Failed to resolve import "./InstallBanner"`.

- [ ] **Step 3: Viết `src/components/InstallBanner.tsx`**

Dải ngang cuối nội dung, **không phải modal** — không che thao tác. Nút chạm tối thiểu `h-11` theo chuẩn sẵn có của app:

```tsx
import { useInstallPrompt } from '../lib/installPrompt'

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
          className="h-11 w-11 -mt-2 -mr-2 shrink-0 text-emerald-700 text-lg"
        >
          ✕
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
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run src/components/InstallBanner.test.tsx`
Expected: PASS — cả 4 test.

- [ ] **Step 5: Gắn vào `src/App.tsx`**

Thêm import cạnh các import component khác:

```tsx
import { InstallBanner } from './components/InstallBanner'
```

Đặt `<InstallBanner />` ngay **trước thẻ đóng** của `<div className="max-w-[390px] mx-auto bg-gray-50 ...">` (dòng 263) — tức cuối nội dung, sau mọi khối chính, để dải mời nằm dưới cùng và không đẩy nội dung xuống.

- [ ] **Step 6: Chạy toàn bộ test + build**

Run: `npx vitest run && npm run build`
Expected: tất cả PASS, build thành công.

Nếu `src/smoke.test.tsx` fail vì có thêm phần tử mới: đọc test đó rồi chỉnh cho khớp — **không** xoá `<InstallBanner />`. Trong môi trường jsdom mặc định (UA không phải iOS, không có `beforeinstallprompt`) banner trả `null` nên phần lớn khả năng không ảnh hưởng gì.

- [ ] **Step 7: Commit**

```bash
git add src/components/InstallBanner.tsx src/components/InstallBanner.test.tsx src/App.tsx
git commit -m "feat: dải mời cài app lên màn hình chính"
```

---

## Task 6: README, kiểm tra thủ công & hoàn tất

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: toàn bộ Task 1–5.
- Produces: không có.

- [ ] **Step 1: Đếm số test hiện tại**

Run: `npx vitest run`
Ghi lại tổng số test ở dòng cuối (dạng `Tests  N passed (N)`).

- [ ] **Step 2: Cập nhật `README.md`**

Thêm mục mới vào "Tính năng chính", đặt ngay **trước** mục "Không cần đăng nhập hay server":

```markdown
- **Cài như app & chạy offline**
  - Cài lên màn hình chính, mở thẳng như ứng dụng, không cần qua trình duyệt
  - Dùng được đầy đủ khi mất mạng — hợp với sân cầu sóng yếu
```

Đồng thời sửa số test case trong mục "Tech Stack" (hiện ghi `137 test cases`) thành số đếm được ở Step 1.

- [ ] **Step 3: Build bản production và chạy thử**

```bash
npm run build && npm run preview
```

- [ ] **Step 4: Kiểm tra thủ công trong trình duyệt**

Mở địa chỉ `npm run preview` in ra, rồi kiểm 4 mục (dùng Chrome — Firefox không có tab Manifest):

1. DevTools ▸ Application ▸ Manifest — không có lỗi đỏ; tên hiện "Tính tiền cầu lông", short name "Tiền cầu lông"; đủ 3 icon, bản maskable xem ở chế độ preview không bị cắt mất chi tiết.
2. DevTools ▸ Application ▸ Service Workers — trạng thái **activated and is running**.
3. DevTools ▸ Network ▸ tick **Offline** → tải lại trang → app vẫn mở, vẫn nhập được người chơi và tính ra tiền.
4. Trên desktop Chrome sẽ thấy dải mời cài (do `beforeinstallprompt` bắn). Bấm ✕ → dải biến mất; tải lại trang → vẫn không hiện lại.

Nếu mục nào fail, **dừng và báo** thay vì bỏ qua.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: bổ sung tính năng PWA vào README"
```

- [ ] **Step 6: Kiểm tra sau khi deploy** (sau khi merge vào `main`)

Chờ workflow Deploy chạy xong, rồi trên điện thoại thật:

1. **Android**: mở app, cài qua dải mời → kiểm icon trên màn hình chính, tên dưới icon **không bị cắt cụt**, mở app thấy không có thanh địa chỉ.
2. **iPhone**: mở bằng Safari → thấy dải hướng dẫn → Share ▸ Thêm vào MH chính → kiểm icon **không viền đen** (nếu có viền đen là kênh alpha chưa bị xoá).
3. **Cả hai**: app phải mở vào `/app-calculate-badminton/`, **không phải** trang chủ `github.io`. Đây là lỗi hay gặp nhất nếu `start_url` bị sửa thành `/`.
4. Bật chế độ máy bay → mở app từ icon → phải chạy bình thường.

---

## Ghi chú khi merge

Commit merge vào `main` phải mang tiền tố **`feat:`** để workflow release tạo minor bump (`CLAUDE.md`). Đây **không phải** breaking change: không đổi định dạng dữ liệu localStorage nào đang có, chỉ thêm key mới `installDismissed` mà bản cũ không đọc tới. Không dùng `[skip release]`.
