# Rà soát UI mobile — việc cần sửa

Ngày rà soát: 2026-08-14. Ở commit `f966131`.

Cách kiểm: chạy `npm run dev` rồi mở trong Chrome có emulate thiết bị
(390×844 và 430×932, bật `mobile` + `touch`), đo tap target và thử nhập liệu
bằng script trong trang — không chỉ đọc code.

> Khu "thêm người chơi" trong `PlayerList.tsx` đang được làm lại theo hướng
> mobile (ô search kiểu iOS + rail avatar cuộn ngang) ở một nhánh khác vào lúc
> rà soát, nên phần đó không nằm trong danh sách dưới đây.

---

## P1 — lỗi thật, chỉ người dùng mobile gặp

### 1. Ô hệ số nam/nữ hỏng khi gõ dấu phẩy thập phân

`src/components/RatioInputs.tsx:842` — `type="number" inputMode="decimal"`.

Đo được: gán `1,5` vào ô → `el.value === ''` → `Number('') === 0` →
`maleRatio: 0` → `src/lib/calc.ts:174` báo `Hệ số phải lớn hơn 0` → toàn bộ
bảng Kết quả bị thay bằng thông báo lỗi.

Bàn phím số vi-VN cho dấu **phẩy**, nên đây là lỗi mà bàn phím desktop không
bao giờ chạm tới.

Sửa: `type="text" inputMode="decimal"` + tự chuẩn hóa `,` → `.`; hoặc thay hẳn
bằng nút −/+ hoặc chip sẵn (1.0 / 1.2 / 1.5 / 2.0) — `type="number"` với
`step="0.1"` vốn là affordance cho chuột.

### 2. Nút Back cứng của Android thoát app thay vì đóng sheet

Không component nào push history entry cho drawer hay overlay toàn màn hình, và
vaul cũng không (`grep popstate node_modules/vaul/dist` → rỗng). Chỉ
`src/App.tsx:58-72` push state cho điều hướng trang.

Nên khi đang mở `TimeSelect` / `PayerSelect` / `ShuttleTypeSelect` / `QRSheet` /
sheet sửa người chơi / Kết quả toàn màn hình, bấm Back là rời trang.

Sửa: một hook `useBackToClose` dùng chung — pushState khi mở, đóng khi popstate.

### 3. Tap target cỡ chuột

Đo tại 390×844:

| Nút | Kích thước | Ghi chú |
| --- | --- | --- |
| Tên người chơi (→ sửa) | **20×24** … 108×24 | "Hà" là target 20×24px |
| Avatar (→ đổi giới tính) | **32×32** | |
| ½ buổi | 61×36 | |
| QR / mắt / chia sẻ / copy / toàn màn hình | **36×36** | 8 nút QR + 3 nút mắt trên một màn |
| `PaidToggle` | 40×40 | |
| Danh bạ: back / + / ô tìm | 40 | |
| Danh bạ: chữ A–Z ở rail | **20×16** | |

Đúng hai thao tác mà app tự quảng cáo trong hộp gợi ý ("Bấm avatar để đổi giới
tính", "Bấm tên để sửa thông tin") lại là hai target nhỏ nhất màn hình.

Sửa (tối thiểu 44×44): thêm `py-2 -my-2` / `min-h-11` cho nút tên, bọc avatar
bằng vùng đệm, icon lên `w-11 h-11`.

---

## P2 — layout chưa tận dụng màn mobile

### 4. Chốt cứng 390px để lại dải xám hai bên trên mọi điện thoại hiện đại

`src/App.tsx:315`, `src/components/HistoryPage.tsx:94`,
`src/components/RosterPage.tsx:187` — `max-w-[390px] … md:max-w-none`.

`md` = 768px, nên từ 391→767px app vẫn 390px, canh giữa trên nền xám. Chụp ở
430×932 (iPhone 15 Pro Max) thấy rõ ~20px xám mỗi bên; Pixel 412px mất ~11px
mỗi bên.

Sửa: để co giãn (`w-full max-w-[430px]` hoặc `max-w-lg`) thay vì ghim đúng bề
ngang iPhone 12/13/14.

### 5. Kết quả — thứ quan trọng nhất — nằm sâu 2,7 màn

Đo với 8 người chơi: trang cao **3721px = 4,4 màn**, `ResultPanel` bắt đầu ở
y=2314.

Link "Xem lịch sử" / "Danh bạ" ở y=3577 (đáy trang) và đó là **cách duy nhất**
vào hai trang đó trên mobile — nút trong header là `hidden md:flex`
(`src/App.tsx:322`).

Hướng sửa:
- thanh sticky đáy hiện TỔNG + nút "Kết quả";
- đưa điều hướng lên header mobile, hoặc tab bar đáy;
- thu gọn card Chi phí / Hệ số sau khi đã điền.

### 6. Hộp gợi ý 4 dòng luôn hiện

`src/components/PlayerList.tsx:187-200` chiếm ~90px vùng đầu trang mãi mãi, lại
còn nhắc glyph `⠿`.

Sửa: cho tắt được (lưu localStorage), hoặc chỉ hiện tới khi thêm người đầu tiên.

---

## P3 — hoàn thiện cảm giác chạm

### 7. Phản hồi chỉ có `hover`, không có `active`

18 biến thể `hover:` so với 2 `active:` trong `src/**/*.tsx`. Trên touch
`hover:bg-gray-100` vô nghĩa, nên chạm icon không có phản hồi nào ngoài
highlight mặc định của iOS.

Sửa: thêm `active:` — `PaidToggle` và rail "Hay chơi cùng" đã làm đúng, lấy làm
mẫu.

### 8. 9 `title=` tooltip vô dụng trên touch

`DeleteButton.tsx`, `PlayerRow.tsx`, `ResultPanel.tsx`, `RosterPage.tsx`,
`ShareButtons.tsx`. Các nút QR / chia sẻ / copy / toàn màn hình chỉ có icon nên
người dùng mobile sáng mắt không có nhãn nào — `aria-label` chỉ cứu screen
reader.

Sửa: thêm nhãn chữ, hoặc gom vào một bottom sheet action menu.

### 9. QRSheet chọn ngân hàng: khung 160px cho 1991px nội dung

`src/components/QRSheet.tsx` — `ul.max-h-40` chứa 48 ngân hàng
(`scrollHeight` đo được 1991px, thấy được ~4 dòng).

Thêm nữa ô tìm nằm **trên** danh sách trong bottom sheet, nên bàn phím che cả
danh sách lẫn nút "Lưu tài khoản".

Sửa: sheet cao full khi chọn ngân hàng, `autoFocus` ô tìm, list cao hơn.

### 10. Rail A–Z của Danh bạ đè lên mép card

`src/components/RosterPage.tsx:337` — `fixed right-0.5` + `w-5` = 22px từ mép,
còn list có `mx-4` (16px), nên chữ nằm trên mũi `>` của các hàng. `right-0.5`
cũng lọt vùng edge-gesture của Android.

### 11. `min-h-screen` (100vh) ở 4 chỗ, chưa có `dvh` và safe-area

`src/App.tsx:314,315`, `src/components/HistoryPage.tsx:93,94`,
`src/components/RosterPage.tsx:186,187`.

Tác động thấp vì các trang vốn đã cao hơn viewport, nhưng đổi `min-h-dvh` là
miễn phí.

Ngoài ra không có `viewport-fit=cover` / `env(safe-area-inset-*)`: `pb-6`/`pb-8`
của drawer đặt nút "Xong" sát vạch home indicator. **Cần thử máy thật** — iOS tự
inset webview ở chế độ standalone nên không khẳng định được từ emulator.

---

## Phần đang làm tốt, đừng phá

- Bottom sheet vaul thay cho `<select>` / `<input type="time">` native
- Vuốt trái để xóa, có khóa trục dọc (`SwipeToDelete`)
- `data-vaul-no-drag` ở `TimeSelect` / `PayerSelect`
- Input `h-11` / `h-12`, `text-base` (không bị iOS auto-zoom), `inputMode` đúng
- Nút "Lưu buổi này" `h-14`

---

## Thứ tự đề xuất

1 → 3 → 4 → 5. Mục 1 và 3 nhỏ và độc lập, làm được ngay.

Mục 3 và 6 chạm vào `PlayerList.tsx` / `PlayerRow.tsx` — chờ nhánh làm lại khu
"thêm người chơi" merge xong để tránh xung đột.
