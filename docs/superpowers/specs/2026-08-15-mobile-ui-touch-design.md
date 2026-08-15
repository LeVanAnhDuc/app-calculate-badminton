# Sửa UI mobile: hệ số, tap target, khung trang — thiết kế

Ngày: 2026-08-15. Nhánh `fix/mobile-ui-touch`, base `main` (f34a0a6).

Nguồn: `docs/superpowers/plans/2026-08-14-mobile-ui-audit.md`, mục **1, 3, 4, 10, 11**.
Mục 2, 5, 6, 7, 8, 9 để đợt sau.

## Mục tiêu

Sửa ba lỗi mà chỉ người dùng điện thoại gặp, không đổi diện mạo app:

1. Gõ `1,5` vào ô hệ số không còn làm hỏng bảng Kết quả.
2. Mọi thứ bấm được đều đạt vùng chạm 44×44.
3. Khung trang hết để dải xám hai bên trên điện thoại rộng hơn 390px.

## Ranh giới với công việc song song

Một phiên khác đang làm `feat/share-player-qr` trong worktree chính. Nhánh này
chạy ở worktree riêng `D:/Learn/wt-mobile-ui` và **không** đụng các file phiên đó
đang sửa: `QRSheet.tsx`, `ShareButtons.tsx`, `icons.tsx`, `exportImage.ts`,
`README.md`, `src/lib/qrCard.ts`.

Hệ quả: ba nút icon 36×36 trong `ShareButtons.tsx` **cố ý không sửa** ở đợt này.
Ghi lại thành việc tồn đọng, làm sau khi nhánh kia merge.

## Thay đổi

### 1. Ô hệ số nam/nữ nhận dấu phẩy

`RatioInputs.tsx` đang là `type="number"`. Trên bàn phím vi-VN, `1,5` bị trình
duyệt coi là không hợp lệ → `el.value === ''` → `Number('') === 0` → `calc.ts`
báo `Hệ số phải lớn hơn 0` → mất toàn bộ bảng Kết quả.

Sửa theo đúng khuôn `MoneyInput.tsx` (không đặt `type`, chỉ `inputMode`, tự
parse):

- Bỏ `type="number"` và `step`/`min`; giữ `inputMode="decimal"`.
- Thêm `parseRatio(raw: string): number | null` vào `src/lib/format.ts`:
  đổi `,` thành `.`, bỏ ký tự không phải chữ số/dấu chấm, trả `null` nếu chuỗi
  chưa thành số (rỗng, `"1,"`, `"."`).
- `RatioInputs` giữ **draft string** nội bộ để gõ dở (`"1,"`) không bị nuốt.
  Chỉ gọi `onChange` khi `parseRatio` ra số > 0; khi mất focus mà draft không
  hợp lệ thì trả draft về giá trị prop hiện tại.
- Hiển thị đúng thứ người dùng gõ (`1,5` giữ nguyên dấu phẩy), lưu `1.5`.

Không đổi kiểu prop: `maleRatio`/`femaleRatio` vẫn là `number`.

### 3. Tap target 44×44

Cách làm đã chốt là **hỗn hợp**:

- **Nút icon đứng cạnh nhau → phóng to thật.** `w-9 h-9` (36) → `w-11 h-11` (44),
  gap `gap-1` → `gap-2`. Áp cho `EyeButton.tsx`, `ResultPanel.tsx` (3 chỗ:
  dòng 189, 273, 356), `PaidToggle.tsx` (`md` 40 → 44, `sm` 36 → 44).
  Ngân sách bề ngang lấy từ mục 4 (khung rộng thêm 40px).
- **Target đứng riêng → đệm âm, diện mạo y nguyên.**
  - Nút tên trong `PlayerRow.tsx:103`: thêm `min-h-11 py-2 -my-2 flex flex-col
    justify-center`. Chữ không đổi kích thước; vùng chạm từ 20×24 lên ≥44.
  - Nút avatar `PlayerRow.tsx:95`: bọc `GenderBadge` (32×32, không đổi) bằng
    `w-11 h-11 -m-1.5 flex items-center justify-center`.
  - Chữ A–Z ở rail `RosterPage.tsx:345`: `w-5 h-4` → `w-11 h-7 -my-1.5` —
    xem mục 10.
- Chip `½ buổi` (`PlayerRow.tsx:124`): `h-9` → `h-11`.

`Avatar.tsx` và avatar trong rail "Hay chơi cùng" (`PlayerList.tsx:334`) **không
đổi** — cái đầu là hiển thị thuần, cái sau đã nằm trong nút `w-[72px]` đủ lớn.

Cập nhật `superdesign/design-system.md` mục "Chiều cao control" cho khớp: `h-11`
là sàn cho mọi thứ bấm được; `h-10`/`h-9` chỉ còn cho phần **nhìn thấy** bên
trong một vùng chạm lớn hơn.

### 4. Khung trang 390 → 430

`App.tsx:315`, `HistoryPage.tsx:94`, `RosterPage.tsx:187`:
`max-w-[390px]` → `w-full max-w-[430px]`.

Phủ trọn iPhone 15 Pro Max (430), Pixel (412), Galaxy (384–412). Layout vốn vẽ
cho 390px nên giãn 40px không phá tỷ lệ. Breakpoint `md:` giữ nguyên.

Cập nhật khối "Khung trang" trong `design-system.md` cho khớp.

### 10. Rail A–Z của Danh bạ

`RosterPage.tsx:337` — `fixed right-0.5` (2px) khiến chữ đè lên mũi `>` của các
hàng (list có `mx-4`) và lọt vùng edge-gesture của Android.

- `right-0.5` → `right-1`, và rail có nền mờ `bg-white/70 backdrop-blur-sm
  rounded-full py-1` để chữ không chồng lên nội dung phía dưới.
- Nhánh `md:right-[calc(50vw-360px)]` giữ nguyên.
- Chữ: `w-5 h-4` → `w-11 h-7 -my-1.5`, giữ `text-[11px]`. Vùng chạm ngang đủ 44,
  dọc 28 — 26 chữ cái xếp dọc không thể mỗi chữ 44px trong màn 844px, nên đây là
  đánh đổi có chủ ý; thao tác chính của rail là **vuốt** (`onTouchMove` đã có),
  không phải bấm từng chữ.

### 11. `dvh` và safe-area

- `min-h-screen` → `min-h-dvh` ở 6 chỗ: `App.tsx:314,315`,
  `HistoryPage.tsx:93,94`, `RosterPage.tsx:186,187`.
- `index.html:5`: `content="width=device-width, initial-scale=1.0,
  viewport-fit=cover"`.
- Khung trang thêm `pb-[env(safe-area-inset-bottom)]` để nút không nằm dưới vạch
  home indicator. Không đụng padding của drawer trong đợt này — audit ghi rõ cần
  thử máy thật, mà emulator không khẳng định được.

## Test

Mỗi thay đổi có test đi kèm, viết trước khi sửa (`superpowers:test-driven-development`).

- `RatioInputs.test.tsx` (**file mới**): gõ `1,5` → `onChange({maleRatio: 1.5})`;
  gõ `1.5` → như trên; gõ `1,` → không gọi `onChange`, ô vẫn hiện `1,`; blur khi
  draft rỏng → quay về giá trị prop; gõ `0` → không gọi `onChange`.
- `format.test.ts`: bộ ca cho `parseRatio` gồm `"1,5"`, `"1.5"`, `"1,"`, `""`,
  `"abc"`, `"-1"`, `"1,5,5"`.
- `PlayerRow.test.tsx`: nút tên và nút avatar có class `min-h-11` / `w-11 h-11`;
  bấm vào vẫn gọi đúng `onEdit` / `onChangeGender` (giữ hành vi cũ).
- `RosterPage.test.tsx`: rail giữ `data-testid="roster-index-rail"`, bấm chữ vẫn
  `jumpTo`, vuốt vẫn chạy.
- Toàn bộ suite hiện có phải xanh — đây là ràng buộc "không đổi hành vi".

Kiểm chứng cuối bằng `npx vitest run` và `npm run build` (tsc + vite) trước khi
merge.

## Commit

Tất cả là `fix:` → patch bump. Không có `feat:` nên README không bắt buộc phải
đổi (CLAUDE.md chỉ buộc với `feat:`), và cũng đang là file phiên kia sửa dở.

Chia commit theo mục để dễ lần ngược: một commit cho mục 1, một cho mục 3, một
cho mục 4+11, một cho mục 10.

## Việc tồn đọng sau đợt này

- `ShareButtons.tsx`: 3 nút icon vẫn 36×36 — làm sau khi `feat/share-player-qr`
  merge.
- Mục 2 (nút Back đóng sheet), 5 (Kết quả nằm sâu), 6 (hộp gợi ý), 7 (`active:`),
  8 (nhãn cho nút icon), 9 (QRSheet) vẫn còn nguyên trong audit.
