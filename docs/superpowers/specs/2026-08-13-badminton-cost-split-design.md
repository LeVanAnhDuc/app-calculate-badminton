# Spec thiết kế: App tính tiền cầu lông

**Ngày**: 2026-08-13
**Trạng thái**: Đã duyệt thiết kế qua mockup (superdesign gallery), chờ duyệt spec

## 1. Tổng quan

Web app một trang (SPA) giúp nhóm cầu lông chia tiền sau buổi chơi. Người dùng nhập chi phí (cầu + sân), danh sách người chơi (tên + giới tính), chọn một trong **hai chế độ tính**, app tính ra số tiền mỗi người phải trả.

- **Công nghệ**: React + Vite + TypeScript. Không có backend — toàn bộ dữ liệu lưu localStorage.
- **Giao diện**: tiếng Việt, mobile-first (dùng chủ yếu trên điện thoại tại sân), responsive với layout riêng cho tablet/desktop.
- **Deploy**: static hosting (Vercel/Netlify/GitHub Pages) để chia sẻ link.
- **UI đã chốt**: phong cách "Court Green" — nền sáng, thẻ trắng bo góc, accent xanh emerald. Mockup tham chiếu trong `superdesign/design_iterations/`:
  - `mobile_first_vietnam_1.html` — chế độ 1, mobile
  - `mobile_first_vietnam_1_1.html` — chế độ 1, desktop/tablet
  - `mode2_hourly_1.html` — chế độ 2, mobile
  - `mode2_hourly_1_1.html` — chế độ 2, desktop/tablet
  - `history_1_1.html` — lịch sử, mobile
  - `history_1.html` — lịch sử, desktop/tablet

## 2. Hai chế độ tính

Đầu màn hình chính có segmented control 2 lựa chọn; UI bên dưới đổi theo chế độ. Chế độ đã chọn được lưu vào từng buổi trong lịch sử và nhớ làm mặc định cho lần sau.

### 2.1. Chế độ 1 — "Chia theo tỉ lệ"

Cả tiền cầu lẫn tiền sân gộp thành tổng chi, chia theo hệ số giới tính.

**Đầu vào**:
- Số quả cầu × giá/quả → tiền cầu (app tự nhân).
- Tiền sân (nhập tổng).
- Hệ số nam (mặc định 1.5), hệ số nữ (mặc định 1.0).
- Mỗi người chơi có toggle **"½ buổi"** (mặc định tắt).

**Công thức**:
```
phần(người) = hệSố(giới tính) × (½ buổi ? 0.5 : 1)
tổngChi     = tiềnCầu + tiềnSân
tiềnThô(người) = tổngChi × phần(người) / Σ phần
```

**Ví dụ đã duyệt**: tổng 300.000đ, hệ số 1.5/1.0, nhóm Tuấn/Hùng/Minh (nam) + Lan/Hoa (nữ), Minh ½ buổi:
- Tổng phần = 1.5 + 1.5 + 0.75 + 1.0 + 1.0 = 5.75
- Tuấn = Hùng = 78.261 → tròn lên 79.000đ; Minh = 39.130 → 40.000đ; Lan = Hoa = 52.174 → 53.000đ
- Tổng thu 304.000đ, số dư +4.000đ

### 2.2. Chế độ 2 — "Sân theo giờ"

Tiền sân chia theo giờ chơi thực tế của từng người; tiền cầu vẫn chia theo hệ số nam/nữ (đủ phần, không phụ thuộc giờ chơi — có ghi chú ngay dưới ô hệ số).

**Đầu vào** (thêm so với chế độ 1):
- Giờ thuê sân: giờ bắt đầu → giờ kết thúc (nhập 1 lần). App hiển thị tổng số giờ.
- Mỗi người chơi mặc định có giờ vào/ra = giờ thuê sân ("cả buổi"). Bấm vào người đến muộn/về sớm để sửa giờ vào/ra riêng (2 ô time picker + nút "Cả buổi" để reset). Không có toggle ½ buổi ở chế độ này.

**Công thức tiền sân**:
```
đơnGiáGiờ   = tiềnSân / tổngGiờThuê
giờTrống    = tổng thời lượng các khoảng trong giờ thuê mà KHÔNG có ai chơi
tiềnTrống   = đơnGiáGiờ × giờTrống        → chia đều đầu người
tiềnSânCònLại = tiềnSân − tiềnTrống       → chia theo tỷ lệ giờ chơi:
sânThô(người) = tiềnTrống/sốNgười + tiềnSânCònLại × giờChơi(người) / Σ giờChơi
```
Trường hợp thường gặp (luôn có người chơi suốt buổi): giờTrống = 0, công thức rút về chia tỷ lệ giờ thuần túy.

**Công thức tiền cầu**: như chế độ 1 nhưng không có ½ buổi:
```
cầuThô(người) = tiềnCầu × hệSố(giới tính) / Σ hệSố
tiềnThô(người) = sânThô(người) + cầuThô(người)
```

**Ví dụ đã duyệt**: cầu 150.000đ (6 × 25.000), sân 300.000đ thuê 19:00–21:00 (2h), hệ số 1.5/1.0. Tuấn/Hùng/Lan cả buổi (2h), Minh 20:00–21:00 (1h), Hoa 19:00–20:30 (1.5h):
- Tổng giờ-người = 8.5h → sân: Tuấn/Hùng/Lan 70.588đ, Minh 35.294đ, Hoa 52.941đ
- Cầu: mỗi nam 34.615đ, mỗi nữ 23.077đ
- Tổng từng người (tròn lên): Tuấn/Hùng 106.000đ, Minh 70.000đ, Lan 94.000đ, Hoa 77.000đ
- Tổng thu 453.000đ, số dư +3.000đ

**Ràng buộc giờ**: giờ vào/ra của người chơi phải nằm trong khoảng giờ thuê sân; giờ ra > giờ vào. Buổi qua đêm (ví dụ 23:00–01:00) phải tính đúng (cộng 24h khi giờ kết thúc nhỏ hơn giờ bắt đầu).

## 3. Làm tròn (chung cả 2 chế độ)

Hai lựa chọn, mặc định **"Làm tròn lên 1.000đ"**:
- **Tròn lên 1.000đ**: `ceil(tiềnThô / 1000) × 1000`. Tổng thu ≥ tổng chi; chênh lệch hiển thị ở dòng "Số dư".
- **Giữ chính xác**: hiển thị số thô (làm tròn hiển thị đến đồng), tổng thu = tổng chi.

**Số dư** = tổng thu − tổng chi. Mặc định **ẩn** (`•••••`), bấm icon con mắt mới hiện; mỗi lần mở app trở về trạng thái ẩn. Áp dụng cả ở màn hình chính và trang lịch sử.

## 4. Người chơi & danh bạ

- Thêm người: nhập tên + chọn Nam/Nữ (toggle). Tên trống không thêm được; tên trùng trong buổi hiện tại thì cảnh báo.
- Gõ tên hiện gợi ý từ **danh bạ** (những người từng chơi, kèm giới tính đã lưu — chọn gợi ý là điền cả hai).
- **Danh sách buổi được giữ giữa các lần dùng**: mở app lần sau thấy nguyên danh sách lần trước, chỉ cần xóa vài người vắng/thêm người mới.
- Bấm × chỉ loại khỏi buổi hiện tại, KHÔNG xóa khỏi danh bạ.
- Danh bạ tự bổ sung khi thêm người mới. Không có màn hình quản lý danh bạ riêng (YAGNI).

## 5. Lịch sử các buổi

Trang riêng (route `/history`), vào từ nút trên màn hình chính (mobile: link cuối trang; desktop: nút góc phải header).

- Header: nút ← quay lại + thống kê nhanh (tổng số buổi, số buổi tháng này).
- Danh sách buổi mới nhất trước, mỗi buổi 1 card: ngày giờ, số người (x nam, y nữ), tổng chi. Bấm card để mở/đóng chi tiết. Mobile 1 cột; desktop: card thu gọn xếp lưới 2 cột, card mở chi tiết chiếm cả hàng.
- Chi tiết buổi: chế độ tính, chi phí đầy đủ (tiền cầu số quả × giá, tiền sân, giờ thuê nếu chế độ 2, hệ số, làm tròn, tổng thu, số dư ẩn 👁) + bảng mỗi người trả (kèm ½ buổi hoặc số giờ chơi).
- Hành động trên buổi: **"Dùng lại danh sách này cho buổi mới"** (nạp danh sách người chơi của buổi đó vào màn hình chính) và **"Xóa"** (có xác nhận).

## 6. Lưu trữ (localStorage)

| Key | Nội dung |
|---|---|
| `roster` | Danh bạ: `{name, gender}[]` |
| `currentSession` | Buổi đang nhập (tự lưu mỗi thay đổi — mở lại không mất): chế độ, chi phí, giờ thuê, hệ số, người chơi (+½ buổi / giờ vào-ra), làm tròn |
| `history` | Các buổi đã lưu: toàn bộ input + kết quả đã tính + timestamp |
| `settings` | Giá trị nhớ lần cuối: hệ số nam/nữ, giá cầu/quả, làm tròn, chế độ tính |

Dữ liệu hỏng/không đúng schema → bỏ qua và khởi tạo mặc định (không crash). Có ghi chú "Dữ liệu lưu trên máy của bạn" ở trang lịch sử.

## 7. Cấu trúc module

```
src/
  lib/
    calc.ts        # PURE: chia tỉ lệ (chế độ 1), chia giờ (chế độ 2), làm tròn, số dư
    time.ts        # PURE: parse/diff giờ (hỗ trợ qua đêm), format giờ
    format.ts      # PURE: format/parse VND ("300.000đ")
    storage.ts     # localStorage wrapper (roster/currentSession/history/settings)
  components/      # ModeSwitch, CostForm, RatioInput, PlayerList (+PlayerTimeEditor),
                   # RoundingToggle, ResultPanel, HistoryPage, ...
  App.tsx          # routing 2 trang (chính / lịch sử), state tổng
```

Logic tính là hàm thuần túy, không đụng DOM/localStorage — đơn vị test chính.

## 8. Validate & xử lý lỗi

- Chặn giá trị âm; hệ số phải > 0; tổng tiền phải > 0 và có ≥ 1 người chơi thì mới hiện kết quả.
- Chế độ 2: cần giờ thuê hợp lệ (kết thúc ≠ bắt đầu); giờ chơi từng người nằm trong giờ thuê, ra > vào; người có 0 giờ chơi → tiền sân 0đ nhưng vẫn chịu tiền cầu + phần giờ trống (nếu có), hiển thị rõ.
- Nếu có khoảng giờ trống không ai chơi: vẫn tính (chia đều) và hiện cảnh báo nhẹ để người dùng biết.
- Nhập tiền có phân cách nghìn tự động; bàn phím số trên mobile (`inputmode`).

## 9. Kiểm thử

- **Vitest** cho `calc.ts`, `time.ts`, `format.ts`: hai ví dụ đã duyệt ở mục 2 (khớp từng số), ½ buổi, cả nhóm toàn nam/toàn nữ, làm tròn 2 kiểu, số dư, giờ trống, qua đêm, người 0 giờ.
- UI kiểm tra thủ công trên điện thoại + desktop (danh sách case trong plan).

## 10. Ngoài phạm vi đợt này

Đăng nhập, đồng bộ nhiều thiết bị/server, QR chuyển khoản, quản lý danh bạ riêng, chia theo từng khung giờ (đã cân nhắc, chọn chia tỷ lệ giờ), PWA/offline cache, đa ngôn ngữ.
