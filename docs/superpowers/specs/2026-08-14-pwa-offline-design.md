# PWA — cài lên màn hình chính & chạy offline — Thiết kế

**Ngày**: 2026-08-14

## Mục tiêu

Ở sân cầu lông sóng thường yếu hoặc chập chờn. App hiện phải tải lại toàn bộ bundle từ GitHub Pages mỗi lần mở, nên lúc cần dùng nhất lại là lúc hay hỏng nhất.

Sau đợt này:

- App có icon riêng trên màn hình chính, mở thẳng như một ứng dụng (không thanh địa chỉ).
- Mở được và dùng đủ mọi tính năng **khi hoàn toàn không có mạng**, sau lần truy cập đầu tiên.
- Người dùng được mời cài đặt, trên cả Android lẫn iPhone.

App vốn đã sẵn sàng cho việc này: không API, không webfont ngoài, không ảnh remote, ảnh PNG kết quả vẽ bằng canvas tại chỗ, dữ liệu nằm trong localStorage. Thứ duy nhất còn thiếu là lớp service worker + manifest.

## Phạm vi

| Thay đổi | Loại |
|---|---|
| `vite.config.ts` — thêm plugin `VitePWA({...})` | cấu hình |
| `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon.svg` | tài nguyên mới |
| `assets/icons/*.svg` | file gốc để sinh lại PNG |
| `index.html` — thẻ `apple-touch-icon` + `theme-color`, bỏ favicon emoji data-URI | 3 dòng |
| `src/lib/pwaManifest.ts` | module mới (hằng số manifest, để test đọc được) |
| `src/lib/installPrompt.ts` | module mới (logic thuần) |
| `src/components/InstallBanner.tsx` | component mới |
| `src/lib/storage.ts` — thêm `loadInstallDismissed` / `saveInstallDismissed` | 2 hàm |
| `src/App.tsx` — gắn `<InstallBanner />` | 1 dòng |
| `README.md` — bổ sung mục tính năng | tài liệu |

**Ngoài phạm vi**: đồng bộ dữ liệu qua server, push notification, background sync, chia sẻ vào app qua Web Share Target, chế độ tối.

## 1. Chọn công cụ

Dùng `vite-plugin-pwa@^1.3.0` ở chế độ **`generateSW`** (preset Workbox).

Phiên bản 1.3.0 khai báo peer `vite: ^3 || ^4 || ^5 || ^6 || ^7 || ^8`, tương thích Vite 8 của project.

Đã cân nhắc và loại:

- **`injectManifest`** (tự viết service worker): cần thiết khi có chiến lược cache phức tạp — network-first cho API, background sync. App này không có gì để áp chiến lược: mọi thứ đã nằm trong bundle và localStorage. Chọn nó là gánh thêm một file phải bảo trì để đổi lấy sự linh hoạt không dùng đến. Nếu sau này thêm đồng bộ server thì chuyển sang là việc nội bộ, không ảnh hưởng manifest hay icon.
- **Tự viết manifest + service worker, không plugin**: tránh được `workbox-build`/`workbox-window`, nhưng phải tự quản danh sách precache trong khi Vite băm tên file mỗi lần build (`index-a3f2b1.js`). Đây đúng là bài toán plugin sinh ra để giải.

## 2. Manifest

Khai báo trong `vite.config.ts`, không viết file JSON tay:

```
name:              "Tính tiền cầu lông"
short_name:        "Tiền cầu lông"
description:       "Chia tiền sân & cầu cho nhóm sau mỗi buổi chơi"
lang:              "vi"
display:           "standalone"
orientation:       "portrait"
theme_color:       "#059669"
background_color:  "#f9fafb"
start_url:         "."
scope:             "."
```

**`short_name` phải ≤ ~13 ký tự** — Android cắt tên dưới icon quanh mốc đó. "Tính tiền cầu lông" (18) sẽ hiện thành "Tính tiền cầ…", nên tên rút gọn là "Tiền cầu lông" (13). Tên đầy đủ vẫn dùng ở danh sách app và cửa sổ chuyển ứng dụng.

**`start_url` và `scope` PHẢI là `"."` (tương đối), không được là `"/"`.** App chạy ở `/` khi dev nhưng ở `/app-calculate-badminton/` trên GitHub Pages (xem `base` trong `vite.config.ts`). Ghi cứng `/` thì app cài từ GitHub Pages sẽ mở về trang chủ `username.github.io` thay vì vào app — lỗi im lặng, chỉ lộ ra sau khi deploy và cài thật.

`theme_color` `#059669` là emerald-600, trùng màu header trong `App.tsx`. `background_color` `#f9fafb` là gray-50, nền trang — dùng cho màn hình chờ lúc khởi động.

## 3. Bộ icon

Thiết kế: quả cầu lông nghiêng 35° kèm vệt chuyển động, màu trắng trên nền emerald `#059669`. Vector hình học, **không dùng ký tự emoji** — emoji phụ thuộc font từng máy nên hiển thị khác nhau giữa Android, iOS và Windows.

| File | Kích thước | Vai trò |
|---|---|---|
| `public/icon-192.png` | 192×192 | manifest, purpose `any` |
| `public/icon-512.png` | 512×512 | manifest, purpose `any` + màn hình chờ |
| `public/icon-maskable-512.png` | 512×512 | manifest, purpose `maskable` |
| `public/apple-touch-icon.png` | 180×180 | iOS |
| `public/favicon.svg` | vector | tab trình duyệt |

### Hai biến thể, không phải một

Bản `any` và bản `maskable` là **hai hình khác nhau**, đây là chủ ý:

- **Bản `any`** giữ đầy đủ chi tiết: quả cầu ở tỉ lệ 88%, hai vệt bay dài. Dùng cho khung vuông bo góc (Android, desktop) và cho iOS.
- **Bản `maskable`** thu quả cầu còn **68%** và rút ngắn vệt bay, sao cho mọi nét nằm trong **vòng an toàn 80%** (đường tròn nội tiếp bán kính 40% tính từ tâm). Android tự cắt icon maskable theo hình do máy quy định — tròn, squircle, hoặc giọt nước — nên bất cứ thứ gì ra ngoài vòng đó đều có nguy cơ bị cắt mất.

Vệt bay dùng **2 nét dày** thay vì 3 nét mảnh: ở kích thước thật 48px, ba nét mảnh dính vào nhau thành một mảng mờ.

### `apple-touch-icon.png` — hai ràng buộc bắt buộc

1. **Không bo góc** — iOS tự bo. Ảnh bo sẵn sẽ bị bo hai lần, ra góc lẹm.
2. **Không nền trong suốt** — iOS tô nền đen vào vùng trong suốt. Nền phải là `#059669` đặc.

iOS không đọc mảng `icons` của manifest cho màn hình chính, nên thiếu file này thì iPhone dùng ảnh chụp màn hình trang làm icon.

### Cách sinh PNG

Giữ file SVG gốc trong `assets/icons/`, render PNG một lần rồi commit vào `public/`. **Không thêm dependency**: `@vite-pwa/assets-generator` kéo theo `sharp` (~30MB binary) nằm mãi trong `devDependencies` và trong CI, trong khi icon thay đổi cỡ một lần mỗi năm.

Hai đặc điểm của `sharp-cli` quyết định cách tổ chức file (đã kiểm chứng thực tế, không phải suy đoán):

1. **`-o` là thư mục, không phải đường dẫn file.** Tên file ra = tên file SVG vào + `.png`. Vì vậy mỗi file SVG nguồn phải **đặt tên trùng đúng tên PNG mong muốn**.
2. **Không ghép được nhiều lệnh** trong một lần gọi (`flatten ... resize ...` báo lỗi `Unknown arguments`). Nên thay vì dùng lệnh `resize`, mỗi SVG **tự khai `width`/`height` bằng đúng kích thước đích** — sharp render theo kích thước nội tại, vừa sắc nét vừa không cần lệnh resize.

Nhờ đó chỉ còn **một lệnh duy nhất, giống nhau cho cả 4 icon**:

```bash
npx -y sharp-cli -i assets/icons/icon-192.svg -o public/ --format png flatten "#059669"
```

Lệnh `flatten` kiêm hai việc: xoá kênh alpha (PNG ra có color type 2 = RGB, đã kiểm chứng) và tô nền `#059669`. Đây chính là ràng buộc "không nền trong suốt" của `apple-touch-icon` — áp cho tất cả icon luôn cho đồng nhất.

Không dùng `--density`: SVG chỉ có `viewBox` mà không có `width`/`height` sẽ được render ở 100×100 rồi phóng to, cho ảnh mờ; các tỉ lệ density cần thiết (369, 138, 130) lại không tròn số nên dễ lệch một pixel.

Đánh đổi đã chấp nhận: PNG là file nhị phân commit trong repo, không tự sinh lại khi ai đó sửa SVG mà quên render. Ở quy mô này là chấp nhận được.

### `index.html`

Thay favicon emoji data-URI hiện tại bằng:

```html
<link rel="icon" type="image/svg+xml" href="./favicon.svg" />
<link rel="apple-touch-icon" href="./apple-touch-icon.png" />
<meta name="theme-color" content="#059669" />
```

Đường dẫn **tương đối** (`./`), cùng lý do với `start_url`.

Plugin tự chèn `<link rel="manifest">`, không khai tay.

## 4. Chiến lược cache & cập nhật

```
registerType: 'autoUpdate'
workbox: {
  globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
  navigateFallback: 'index.html',
}
devOptions: { enabled: false }
```

**`autoUpdate`**: service worker tải bản mới ngầm, tự áp dụng ở lần mở app kế tiếp. Không thêm UI, không toast, không nút "Tải lại".

Rủi ro đã cân nhắc và chấp nhận: nếu bản mới kích hoạt trong lúc app đang mở, trang có thể reload. **Điều này an toàn vì `App.tsx` ghi localStorage ngay mỗi lần state đổi** (các `useEffect` ở dòng 74–90 lưu `currentSession`, `settings`, `roster`, `history`), không chờ bấm nút. Người dùng cùng lắm mất vài ký tự đang gõ dở trong một ô nhập.

**`devOptions.enabled: false`**: không đăng ký service worker khi `npm run dev`, tránh cảnh sửa code mà trình duyệt vẫn phục vụ bản cache cũ.

**`navigateFallback`**: app là một trang duy nhất, điều hướng nội bộ bằng state chứ không có router. Fallback về `index.html` để mọi đường dẫn con đều mở được khi offline.

Precache toàn bộ output build — chính là *tất cả* những gì app cần. Không có runtime caching rule nào vì không có request runtime nào.

Trình duyệt không hỗ trợ service worker: app chạy y như hiện tại. Không nhánh code nào của app phụ thuộc vào sự tồn tại của service worker.

## 5. Mời cài đặt

Android/Chrome bắn sự kiện `beforeinstallprompt` nên app tự hiện nút cài được. **iOS Safari không bắn sự kiện đó và không bao giờ tự gợi ý** — người dùng phải tự bấm nút Share rồi chọn "Thêm vào MH chính". Không có API nào để kích hoạt việc này bằng code. Vì vậy hai nền tảng cần hai cách xử lý khác nhau.

### `src/lib/installPrompt.ts`

Tách toàn bộ phần khó kiểm thử (dò sự kiện, nhận diện trình duyệt, đọc `matchMedia`) khỏi UI. Phơi ra hook:

```ts
type InstallMode = 'hidden' | 'android' | 'ios'

function useInstallPrompt(): {
  mode: InstallMode
  install: () => void   // chỉ có tác dụng khi mode === 'android'
  dismiss: () => void
}
```

`mode` là `'hidden'` khi **bất kỳ** điều nào sau đây đúng:

1. Đang chạy standalone — `window.matchMedia('(display-mode: standalone)').matches`, hoặc `navigator.standalone === true` (iOS dùng thuộc tính riêng, không theo chuẩn).
2. Người dùng đã bấm tắt trước đó (đọc từ localStorage).
3. Đã nhận sự kiện `appinstalled` trong phiên này.
4. Không phải iOS **và** chưa nhận `beforeinstallprompt`.

`mode === 'android'` khi đã bắt được `beforeinstallprompt`. Handler gọi `preventDefault()` để chặn thanh gợi ý mặc định của Chrome rồi giữ lại event; `install()` gọi `prompt()` trên event đã giữ. Không chờ `userChoice`: dù người dùng đồng ý hay từ chối thì event cũng đã tiêu và dải mời đều phải ẩn, nên kết quả không đổi hành vi nào. Event chỉ dùng được **một lần** — sau khi gọi phải bỏ đi và chuyển về `hidden`.

`mode === 'ios'` khi nhận diện được iOS qua user agent và không thuộc các trường hợp `hidden`. Nhận diện: `/iphone|ipad|ipod/i` trên `navigator.userAgent`. Chấp nhận sai sót ở iPad đời mới (mặc định báo UA desktop) — hệ quả xấu nhất là một người dùng iPad không thấy gợi ý, không phải lỗi.

Cả hai listener (`beforeinstallprompt`, `appinstalled`) đều gỡ khi component unmount.

### `src/lib/storage.ts`

Thêm theo đúng mẫu `load`/`save` sẵn có trong file:

```ts
export const loadInstallDismissed = (): boolean =>
  load('installDismissed', (v) => typeof v === 'boolean', false)
export const saveInstallDismissed = (v: boolean): boolean => save('installDismissed', v)
```

Dùng lại `load`/`save` nội bộ để giữ nguyên hành vi chịu lỗi: localStorage đầy hoặc bị chặn thì trả fallback, app vẫn chạy.

### `src/components/InstallBanner.tsx`

Component chỉ render theo `mode`, không chứa logic dò trình duyệt. Đặt cuối `App.tsx`, dạng dải ngang nằm dưới cùng nội dung — không phải modal, không che thao tác.

- `mode === 'android'`: dòng chữ "Cài app lên màn hình chính để mở nhanh, dùng được cả khi mất mạng" + nút **"Cài đặt"** (gọi `install()`) + nút tắt ✕.
- `mode === 'ios'`: cùng dòng chữ + hướng dẫn "Bấm ⬆️ rồi chọn *Thêm vào MH chính*" + nút tắt ✕. Không có nút cài vì iOS không cho.
- `mode === 'hidden'`: không render gì.

Nút ✕ gọi `dismiss()` → ghi localStorage → không hiện lại nữa. Kích thước chạm tối thiểu 44px theo chuẩn sẵn có của app (các nút hiện dùng `h-11`).

## 6. Kiểm thử

jsdom không có service worker. Không giả vờ test Workbox — test phần thật sự chứa logic.

**`src/lib/installPrompt.test.ts`**

- Chạy standalone (`matchMedia` trả `matches: true`) → `hidden`.
- iOS standalone qua `navigator.standalone === true` → `hidden`.
- Đã tắt trước đó (localStorage) → `hidden`, kể cả khi `beforeinstallprompt` bắn.
- Nhận `beforeinstallprompt` → `android`; handler có gọi `preventDefault()`.
- UA iPhone, không standalone, chưa tắt → `ios`.
- UA desktop, chưa có `beforeinstallprompt` → `hidden`.
- `install()` gọi `prompt()` trên event đã giữ, sau đó về `hidden`.
- `dismiss()` ghi localStorage và chuyển về `hidden`.
- Nhận `appinstalled` → `hidden`.
- Unmount gỡ listener.

**`src/components/InstallBanner.test.tsx`**

- `mode='android'` → hiện nút "Cài đặt", bấm thì gọi `install()`.
- `mode='ios'` → hiện hướng dẫn Share, **không** có nút "Cài đặt".
- `mode='hidden'` → không render gì.
- Bấm ✕ gọi `dismiss()`.

**`src/lib/pwaManifest.test.ts`** — chốt hai lỗi im lặng chỉ lộ ra sau khi deploy:

- `start_url` và `scope` là `"."`, không phải `"/"`.
- `short_name` dài ≤ 13 ký tự.

Để test được, tách object manifest ra hằng số export trong một module riêng (`src/lib/pwaManifest.ts`) rồi `vite.config.ts` import vào. Như vậy test đọc chính giá trị đang dùng thật, không phải bản sao chép.

**Checklist thủ công** (không tự động hoá được, chạy trước khi merge):

1. `npm run build && npm run preview` → DevTools ▸ Application ▸ Manifest: không lỗi, icon hiện đủ.
2. DevTools ▸ Application ▸ Service Workers: trạng thái activated.
3. Bật DevTools ▸ Network ▸ Offline → tải lại trang → app vẫn mở và tính toán được.
4. Sau khi deploy: cài thật trên một máy Android và một iPhone, kiểm tra icon, tên dưới icon không bị cắt, và app mở đúng vào `/app-calculate-badminton/` chứ không phải trang chủ github.io.

## 7. README

Theo quy ước trong `CLAUDE.md`, `feat:` phải cập nhật mục "Tính năng chính" cùng nhánh. Thêm:

```markdown
- **Cài như app & chạy offline**
  - Cài lên màn hình chính, mở thẳng như ứng dụng, không cần trình duyệt
  - Dùng được đầy đủ khi mất mạng — hợp với sân cầu sóng yếu
```

Đồng thời cập nhật số test case trong mục Tech Stack (hiện ghi 137).

## 8. Commit

`feat:` — tính năng mới với người dùng, tạo minor bump. Không phải breaking change: không đổi định dạng dữ liệu localStorage, chỉ thêm một key mới (`installDismissed`) mà bản cũ không đọc tới.
