# Chia sẻ mã QR của từng người chơi qua tin nhắn

**Ngày**: 2026-08-15
**Trạng thái**: Đã duyệt, sẵn sàng triển khai

## Vấn đề

Mã VietQR của mỗi người hiện chỉ xem được trên máy của người thu: mở bảng kết quả,
bấm vào một người, `QRSheet` hiện QR để người đó **cầm máy quét tại chỗ**. Ai về
sớm hoặc không có mặt thì không trả được — người thu phải chụp màn hình rồi gửi tay.

Cần: gửi thẳng QR của một người cho chính người đó qua Zalo/Messenger, ngay từ trong app.

## Phạm vi

Thêm nút **"Chia sẻ QR"** vào `QRSheet`. Nút dựng một ảnh PNG dạng thẻ dọc chứa đủ
thông tin chuyển khoản của đúng người đang mở, rồi đẩy qua share sheet của hệ điều
hành.

`QRSheet` đã được cả bảng kết quả (`ResultPanel`) lẫn lịch sử (`HistoryPage`) dùng
chung, nên một chỗ sửa là cả hai màn hình đều có.

**Ngoài phạm vi**: gửi hàng loạt nhiều QR cùng lúc, nút tắt trên từng hàng kết quả,
deep link sang app ngân hàng.

## Nội dung ảnh thẻ

```
┌─────────────────────────┐
│  🏸 Tính tiền cầu lông   │  ← thanh emerald-600
│      15/08/2026         │
├─────────────────────────┤
│         Đức             │  ← tên người chơi
│      79.000đ            │  ← số tiền, emerald
│                         │
│     ███  ▄▄  ███        │  ← mã VietQR (đã kèm sẵn
│     █ █  ██  █ █        │     số tiền + nội dung CK)
│     ███  ▀▀  ███        │
│                         │
│   Cau long 15/08 Duc    │  ← nội dung CK
│   MB · 0123456789       │  ← ngân hàng · số TK
│   VAN ANH DUC           │  ← tên chủ TK (nếu có)
├─────────────────────────┤
│ Chia bằng app Tính tiền │
└─────────────────────────┘
```

Người nhận mở ảnh là quét được ngay, và nếu app ngân hàng của họ không hiện rõ số
tiền / nội dung thì vẫn đọc được bằng mắt trên ảnh.

## Kiến trúc

```
QRSheet.tsx
  └─ nút "Chia sẻ QR" ──► sharePlayerQR({ playerName, amount, memoDate, account })
                               │
                               ├─ buildMemo() + buildVietQRPayload()   (vietqr.ts)
                               ├─ renderQRCard()      ──► HTMLCanvasElement
                               ├─ canvasToPngFile()   ──► File PNG     (shareResult.ts)
                               │
                               ├─ navigator.canShare({files}) ? navigator.share()
                               └─ không hỗ trợ / lỗi  ──► tải file về
                                  ──► 'shared' | 'cancelled' | 'downloaded'
```

### Module mới: `src/lib/qrCard.ts`

Đặt riêng thay vì nhét vào `exportImage.ts`: file đó đã ~250 dòng và lo bố cục bảng
nhiều người: thẻ một người là bố cục khác hẳn, tách ra thì mỗi file vẫn đọc được một
mạch và test được độc lập.

```ts
export interface QRCardInput {
  playerName: string
  amount: number
  memoDate: Date
  account: CollectorAccount
}

/** "qr-duc-2026-08-15.png" — tên đã bỏ dấu, gạch nối */
export function qrCardFilename(playerName: string, date: Date): string

export async function renderQRCard(input: QRCardInput): Promise<HTMLCanvasElement>

export async function sharePlayerQR(input: QRCardInput): Promise<ShareOutcome>
```

`sharePlayerQR` nhận đúng những gì `QRSheet` đã cầm sẵn trong tay — không đọc
localStorage lần nữa, không đụng tới `CalcResult` hay `Player[]`. Nhờ vậy nó thuần
theo tham số và test được bằng cách gọi trực tiếp.

### Dùng lại code có sẵn

| Cần | Lấy từ |
|---|---|
| `buildMemo`, `buildVietQRPayload` | `lib/vietqr.ts` |
| `normalizeMemo` (bỏ dấu cho tên file) | `lib/vietqr.ts` |
| `formatVND` | `lib/format.ts` |
| `formatDateLabel`, `formatFilenameDate` | `lib/exportImage.ts` |
| `canvasToPngFile`, kiểu `ShareOutcome` | `lib/shareResult.ts` |
| Hằng số canvas `SCALE`, màu `EMERALD_600`/`GRAY_400`/`GRAY_500`/`GRAY_900` | `lib/exportImage.ts` — đổi từ private sang export để chỉ có một nguồn màu |

### Bố cục canvas (CSS px, nhân `SCALE` = 2 khi vẽ)

```
WIDTH        = 600           (hẹp hơn ảnh kết quả 800px — vừa khung chat hơn)
HEADER_H     = 76            nền emerald-600
  tiêu đề    baseline y = 34, bold 24px, trắng, canh giữa
  ngày       baseline y = 58, 15px, trắng, canh giữa
tên          baseline y = HEADER_H + 44, bold 30px, gray-900, canh giữa
số tiền      baseline y = HEADER_H + 90, bold 38px, emerald-600, canh giữa
QR           top      y = HEADER_H + 112, cạnh 320px, canh giữa ngang
nội dung CK  baseline y = qrBottom + 32, 16px, gray-500, canh giữa
ngân hàng·TK baseline y = +24,            15px, gray-500, canh giữa
tên chủ TK   baseline y = +22,            15px, gray-500, canh giữa — chỉ khi có
FOOTER_H     = 44            "Chia bằng app Tính tiền cầu lông", 13px, gray-400
```

Chiều cao = baseline cuối + 20 + `FOOTER_H`. Thẻ không có tên chủ TK thì thấp hơn
đúng 22px — đây là điểm test được mà không cần canvas thật.

## Xử lý lỗi

| Tình huống | Hành vi |
|---|---|
| Chưa có tài khoản người thu | Nút không tồn tại — sheet vẫn đang hiện form nhập tài khoản |
| `navigator.canShare` không có / từ chối file | Tải PNG về máy, trả `'downloaded'` |
| Người dùng đóng share sheet | `AbortError` → trả `'cancelled'`, im lặng |
| `navigator.share` lỗi thật (quyền, v.v.) | Rơi xuống nhánh tải về |
| Canvas bị chặn / QR không dựng được | Thử tải về; vẫn hỏng thì nuốt lỗi, trả `'downloaded'` — giống `shareResultImage` |

Phản hồi cho người dùng theo đúng quy ước sẵn có của `ShareButtons.tsx`:
`'shared'`/`'cancelled'` im lặng (share sheet của máy đã tự phản hồi rồi),
`'downloaded'` thì toast `"Đã tải ảnh QR của {tên}"`.

**Lưu ý iOS Safari**: `canvasToPngFile` dùng `toDataURL` đồng bộ thay vì `toBlob`
bất đồng bộ, vì Safari huỷ user-activation khi await — `sharePlayerQR` phải giữ
nguyên cách đó. Việc dựng QR (`QRCode.toCanvas`) mất vài ms, vẫn nằm trong hạn mức
transient activation, đúng như `shareResultImage` đang làm.

## Kiểm thử

`src/lib/qrCard.test.ts`

- `qrCardFilename` bỏ dấu và nối gạch: `Đức` → `qr-duc-2026-08-15.png`,
  `Lê Văn Anh` → `qr-le-van-anh-2026-08-15.png`
- `renderQRCard` trả canvas đúng khổ (`600 × SCALE` bề ngang) và thẻ có tên chủ TK
  cao hơn thẻ không có đúng 22 × `SCALE`
- `sharePlayerQR` gọi `navigator.share` với đúng một file PNG → `'shared'`
- share ném `AbortError` → `'cancelled'`
- không có `navigator.canShare` → tải về, trả `'downloaded'`

`src/components/QRSheet.test.tsx`

- Có tài khoản → nút "Chia sẻ QR" hiện; chưa có tài khoản → không có nút
- Bấm nút gọi `sharePlayerQR` với đúng `playerName`, `amount`, `memoDate`, `account`
- Kết quả `'downloaded'` → toast `"Đã tải ảnh QR của Đức"`; `'shared'` → không toast

jsdom không có canvas 2D thật, nên test stub `getContext` giống cách
`exportImage.test.ts` đang làm, và mock `qrcode` như `HistoryPage.test.tsx`.

## Việc kèm theo

- `README.md`: thêm một gạch đầu dòng vào mục "Mã VietQR cho từng người chơi"
  (bắt buộc theo CLAUDE.md với mọi commit `feat:`), và làm mới số test case ở
  Tech Stack.
- Không cần mockup superdesign: không có màn hình React mới, chỉ thêm một nút vào
  bottom sheet đã có. Ảnh thẻ là canvas vẽ tay, không phải UI.
- Commit dùng tiền tố `feat:` → bump minor.
