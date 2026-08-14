# Mã VietQR cho từng người chơi — Thiết kế

**Ngày:** 2026-08-14
**Trạng thái:** Đã duyệt thiết kế, chờ viết plan

## Mục tiêu

Người thu tiền nhập số tài khoản + ngân hàng **một lần**, app sinh mã VietQR chuẩn
EMVCo/NAPAS cho **từng người chơi** — có sẵn số tiền phải trả và nội dung chuyển khoản
`Cau long DD/MM Ten`. Kết hợp với cờ `paid` sẵn có thành vòng khép kín:
chia tiền → quét QR → tick đã trả.

Quyết định phạm vi (đã chốt với người dùng):

- QR hiển thị **cả hai** cách: fullscreen trên máy người thu (quét tại sân) **và** nhúng vào ảnh PNG xuất ra (gửi Zalo, mỗi người tự quét QR của mình).
- Hoạt động ở **cả kết quả buổi hiện tại lẫn trang Lịch sử** (thu tiền sau buổi chơi vài ngày là chuyện thường).
- Nhập tài khoản người thu **ngay lần đầu mở QR** (form trong sheet) — không thêm trang cài đặt.
- Sinh payload **tại chỗ** (offline), không gọi API bên thứ ba.

## Kiến trúc

### 1. `src/lib/vietqr.ts` — sinh payload (hàm thuần, không phụ thuộc UI)

```ts
export interface VietQRInput {
  bankBin: string      // BIN NAPAS 6 số, vd "970422"
  accountNo: string    // số tài khoản
  amount: number       // VND, số nguyên; 0 → bỏ field 54 (QR tĩnh, người trả tự nhập)
  memo: string         // nội dung CK, đã hoặc chưa normalize đều được
}
export function buildVietQRPayload(input: VietQRInput): string
export function normalizeMemo(s: string): string
```

Cấu trúc EMVCo merchant-presented QR (TLV: `ID(2) + LEN(2) + VALUE`):

| Field | Giá trị |
|---|---|
| 00 | `01` (version) |
| 01 | `12` khi có amount (dynamic), `11` khi amount = 0 (static) |
| 38 | sub-00 `A000000727` (NAPAS AID) · sub-01 = TLV{00: bankBin, 01: accountNo} · sub-02 `QRIBFTTA` (chuyển tới tài khoản) |
| 53 | `704` (VND) |
| 54 | amount dạng chuỗi số nguyên — **bỏ hẳn field khi amount = 0** |
| 58 | `VN` |
| 62 | sub-08: memo (purpose of transaction) |
| 63 | CRC16-CCITT (poly 0x1021, init 0xFFFF) tính trên toàn payload kể cả `6304`, in hoa hex 4 ký tự |

`normalizeMemo`: bỏ dấu tiếng Việt (kể cả `đ→d`, `Đ→D`), loại ký tự ngoài
`[A-Za-z0-9 /.-]`, gộp khoảng trắng, cắt còn tối đa 50 ký tự. Lý do: nhiều app
ngân hàng hiển thị sai ký tự có dấu trong nội dung CK.

Định dạng memo do UI ghép: `Cau long DD/MM Ten` — buổi hiện tại dùng ngày hôm nay,
buổi trong Lịch sử dùng ngày `savedAt` của buổi đó.

### 2. `src/lib/banks.ts` — danh sách ngân hàng tĩnh

`export const BANKS: { shortName: string; name: string; bin: string }[]` — khoảng 40
ngân hàng VN tham gia NAPAS (VCB 970436, TCB 970407, MB 970422, ACB 970416,
BIDV 970418, VietinBank 970415, Agribank 970405, VPBank 970432, TPBank 970423,
Sacombank 970403, …). Ví điện tử (MoMo, ZaloPay) không thuộc VietQR-tới-tài-khoản
nên không nằm trong danh sách. Danh sách maintain bằng tay — chấp nhận đánh đổi
này để được offline 100%.

### 3. Lưu trữ — `src/lib/storage.ts`

Key localStorage mới `collectorAccount`:

```ts
export interface CollectorAccount {
  bankBin: string
  accountNo: string
  accountName: string   // chỉ để hiển thị cho người trả đối chiếu; '' nếu bỏ trống
}
export function loadCollectorAccount(): CollectorAccount | null
export function saveCollectorAccount(a: CollectorAccount): boolean
```

Guard + try/catch theo đúng pattern sẵn có. **Không đổi** schema `Player`,
`SessionInput`, `SavedSession` → không cần migration, dữ liệu cũ không ảnh hưởng.

### 4. Render QR — dependency mới `qrcode`

Thêm npm package `qrcode` (~30KB, không dependency con) + `@types/qrcode` (dev).
Dùng `QRCode.toCanvas` / `toDataURL` để vẽ payload. Error correction level `M`.

## UI

### Nút QR trên dòng người chơi

Icon QR nhỏ (nút 36×36 như các icon-button hiện có) đặt cạnh `PaidToggle` trong:

- `PlayerRow` của `ResultPanel` (cả dạng thường lẫn fullscreen overlay)
- dòng người chơi trong `HistoryPage`

Bấm mở `QRSheet` cho người đó. Nút luôn hiện, kể cả khi đã trả.

### `QRSheet` — component mới, dùng `vaul` drawer (đã có sẵn)

Props: `{ playerName, amount, memo, open, onOpenChange, paid, onTogglePaid }`.

Hai trạng thái:

1. **Chưa có tài khoản người thu** → form thiết lập ngay trong sheet:
   - chọn ngân hàng: danh sách cuộn có ô tìm kiếm (lọc theo shortName/name)
   - số tài khoản (bắt buộc), tên chủ TK (tuỳ chọn, tự uppercase)
   - Lưu → ghi localStorage → chuyển thẳng sang trạng thái QR
2. **Đã có tài khoản** → nội dung chính:
   - QR to (~280px CSS), dưới là tên người chơi, số tiền (formatVND), nội dung CK
   - dòng đối chiếu: `Chuyển tới: MB · 0011002233 · NGUYEN VAN A`
   - link nhỏ "Sửa tài khoản" → quay lại form (giá trị điền sẵn)
   - nút chính **"✓ Đã trả"** (hoặc "Bỏ đánh dấu đã trả" nếu đã paid): toggle paid
     rồi đóng sheet

Toggle paid tái dùng cơ chế sẵn có: `onPatch` (ResultPanel) và cập nhật
history (HistoryPage) — `QRSheet` chỉ nhận callback, không tự đụng storage session.

## PNG export — `src/lib/exportImage.ts`

- Thêm khối **"Quét QR để trả tiền"** cuối ảnh (sau phần tổng): lưới ô, mỗi ô gồm
  QR (~180px trên canvas scale 2x) + tên + số tiền.
- Chỉ vẽ QR cho **người chưa trả** (người đã trả không cần, ảnh gọn).
- Khối chỉ xuất hiện khi đã có `collectorAccount`; chưa có → ảnh giữ nguyên như hiện tại.
- Tất cả người đã trả hết → không có khối QR.
- `downloadResultImage` chuyển thành `async` (QR render là async); chỗ gọi trong
  `ResultPanel`/`HistoryPage` cập nhật tương ứng (toast sau khi xong).

## Xử lý lỗi

- **Form TK:** ngân hàng bắt buộc chọn; số TK bắt buộc, chỉ `[A-Za-z0-9]`,
  4–19 ký tự. Không thể xác minh TK tồn tại khi offline — app ngân hàng của người
  quét sẽ hiện tên chủ TK khi quét, đó là bước xác nhận thực tế.
- **amount = 0:** sinh QR tĩnh (bỏ field 54), người trả tự nhập số tiền.
- **localStorage đầy/hỏng:** theo pattern sẵn có — trả fallback, app chạy tiếp trong RAM.

## Kiểm thử (vitest, theo pattern sẵn có)

- `vietqr.test.ts`:
  - payload đầy đủ khớp chuỗi chuẩn đã kiểm chứng quét được bằng app ngân hàng thật
  - CRC16 test vector độc lập
  - amount = 0 → không có field 54, field 01 = `11`
  - `normalizeMemo`: bỏ dấu, `đ→d`, lọc ký tự lạ, cắt 50 ký tự
- `storage.test.ts` (bổ sung): guard `collectorAccount` — dữ liệu hỏng → `null`,
  round-trip save/load.
- Component test `QRSheet.test.tsx`: lần đầu thấy form; lưu TK hợp lệ → thấy QR;
  validation chặn TK rỗng/ký tự lạ; bấm "Đã trả" → gọi `onTogglePaid` + đóng sheet.
- `exportImage.test.ts` (bổ sung): có `collectorAccount` + người chưa trả → ảnh
  cao hơn (có khối QR); không có TK → kích thước như cũ.

## Ngoài phạm vi (YAGNI)

- Nhiều tài khoản người thu / đổi người thu theo buổi
- Kiểm tra tự động tiền đã vào TK (cần backend ngân hàng)
- Deep link mở thẳng app ngân hàng
- Logo ngân hàng giữa QR

## Ghi chú release

Commit `feat:` → minor bump. Không có breaking change — không đổi format dữ liệu cũ.
