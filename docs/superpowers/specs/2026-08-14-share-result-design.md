# Chia sẻ kết quả (ảnh + text) — Design

**Ngày:** 2026-08-14
**Trạng thái:** Đã duyệt (user approved trong phiên brainstorming)

## Mục tiêu

Trên mobile, thao tác thực tế sau buổi chơi là gửi kết quả vào nhóm Zalo/Messenger,
nhưng app hiện chỉ *tải* ảnh PNG về máy. Thêm:

1. **Chia sẻ ảnh PNG** qua share sheet của hệ điều hành (Web Share API level 2 —
   `navigator.share({ files })`), fallback về tải ảnh như cũ trên máy không hỗ trợ.
2. **Copy kết quả dạng text** vào clipboard để dán vào chat.

Áp dụng ở panel Kết quả, overlay toàn màn hình, và các card trong trang Lịch sử.

## Logic — module mới `src/lib/shareResult.ts`

- `formatResultText(result, mode, dateLabel, players): string` — hàm thuần:

  ```
  🏸 Tính tiền cầu lông 14/08/2026
  ✓ Đức (Nam): 70.000đ
  ○ Lan (Nữ · ½ buổi): 35.000đ
  ○ Hùng (Nam · 1.5 giờ): 52.000đ
  ```

  - `✓` = đã trả, `○` = chưa trả (khớp ảnh PNG).
  - Ghi chú trong ngoặc dùng đúng logic `playerNote` của `exportImage.ts`
    (giới tính, `½ buổi` ở mode ratio, số giờ ở mode hourly).
  - **Không** in tổng thu / số dư / tổng chi — nhất quán với ảnh PNG.

- `shareResultImage(result, mode, players, date?)`:
  - Vẽ canvas bằng `renderResultImage` sẵn có.
  - Chuyển canvas thành `File` PNG **đồng bộ** qua `canvas.toDataURL` + `atob`
    (không dùng `toBlob` async — iOS Safari có thể mất user activation và chặn
    `navigator.share`). Tên file: `tinh-tien-cau-long-YYYY-MM-DD.png`.
  - Nếu `navigator.canShare?.({ files: [file] })` → `navigator.share({ files, title })`.
    Người dùng hủy share sheet (AbortError) → im lặng, không toast.
  - Không hỗ trợ share file (desktop) → fallback `downloadResultImage` + toast
    "Đã tải ảnh kết quả" (giữ hành vi cũ).
- `copyResultText(result, mode, players, date?)` — `navigator.clipboard.writeText`;
  thành công toast "Đã copy kết quả ✓", thất bại toast báo lỗi.

## UI

### Panel Kết quả + overlay toàn màn hình (`ResultPanel.tsx`)

Thay `DownloadImageButton` bằng 2 icon mới, ở cả hai chỗ:

```
Kết quả            [⇧] [⎘] [⛶]
 ⇧ = chia sẻ ảnh (fallback: tải)
 ⎘ = copy kết quả text
 ⛶ = xem toàn màn hình (giữ nguyên)
```

Icon giữ style hiện tại (`w-9 h-9`, `text-gray-400`, hover `bg-gray-100`),
`aria-label` tiếng Việt: "Chia sẻ ảnh kết quả", "Copy kết quả".

### Trang Lịch sử (`HistoryPage.tsx`)

Trong footer của card đang mở rộng (trên hàng "Dùng lại…" / "Xóa buổi này"),
thêm một hàng 2 nút phụ: "⇧ Chia sẻ ảnh" và "⎘ Copy kết quả" — nút viền xám
(`border border-gray-300 text-gray-600`), cao `h-12` như các nút hiện có.

- Ngày in trong ảnh/text và tên file lấy từ `savedAt` của buổi đó (không phải hôm nay).
- Trạng thái đã trả lấy từ `s.input.players`.
- Card thu gọn không có nút share/copy.

## Kiểm thử

- Unit test `formatResultText`: ratio + ½ buổi, hourly + số giờ, paid/unpaid,
  không chứa tổng thu/số dư.
- `shareResultImage` với mock `navigator.share`/`canShare`:
  - hỗ trợ → gọi `share` với đúng file PNG;
  - không hỗ trợ → fallback download;
  - `share` reject AbortError → không throw, không toast lỗi.
- Component test: nút render đúng `aria-label` ở ResultPanel, fullscreen overlay
  và history card; bấm copy gọi clipboard mock + hiện toast.

## Không làm (YAGNI)

- Không share text qua `navigator.share` (copy là đủ).
- Không fallback `document.execCommand('copy')` — app chạy HTTPS trên GitHub Pages.
- Không thêm nút ở card lịch sử đang thu gọn.
