# Kéo thả sắp xếp người chơi — Design

**Ngày:** 2026-08-14
**Trạng thái:** Đã duyệt (user approved trong phiên brainstorming)

## Mục tiêu

Cho phép kéo thả để sắp xếp lại thứ tự người chơi trong mục "Người chơi"
(`src/components/PlayerList.tsx`), hoạt động trên cả mobile (ưu tiên) và desktop.

## Quyết định chính

- **Cách kéo:** tay nắm ⠿ (drag handle) trên mỗi hàng — chỉ chạm vào tay nắm mới
  kéo được. Chọn thay vì long-press hoặc chế độ sắp xếp riêng vì dễ khám phá và
  không xung đột với các gesture hiện có.
- **Thư viện:** `motion` (Framer Motion) `Reorder.Group` / `Reorder.Item` — đã có
  sẵn trong dự án, không thêm dependency.

## Hành vi trên mobile (ưu tiên)

- Tay nắm ⠿ ở mép trái mỗi hàng, vùng chạm 44×44px.
- Chạm tay nắm và kéo ngay — không cần giữ lâu. Tay nắm có `touch-action: none`
  nên chạm vào nó trang không cuộn; chạm chỗ khác trên hàng thì cuộn trang,
  vuốt trái xóa, tap avatar/tên vẫn hoạt động như cũ.
- Khi nhấc: hàng nổi lên (bóng đổ + scale 1.02), các hàng khác dịch chuyển
  nhường chỗ. Nếu có hàng đang mở trạng thái vuốt-xóa thì đóng lại.
- Kéo sát mép trên/dưới viewport (~60px): trang tự cuộn (auto-scroll bằng
  `requestAnimationFrame`).
- Thả: hàng đáp xuống vị trí mới với spring animation, thứ tự lưu ngay.

## Hành vi trên desktop

Dùng chung tay nắm ⠿, `cursor: grab` / `grabbing` khi kéo. Không hỗ trợ kéo
bằng bàn phím trong phạm vi này (YAGNI).

## Kỹ thuật & luồng dữ liệu

- Thay `<ul>` bằng `Reorder.Group axis="y" values={input.players}
  onReorder={(players) => onPatch({ players })}`.
- Mỗi hàng: `Reorder.Item value={p}` với `dragListener={false}`; kéo qua
  `useDragControls` gắn vào tay nắm (`onPointerDown={(e) => controls.start(e)}`).
- Tách mỗi hàng thành component con `PlayerRow` (mỗi item cần hook
  `useDragControls` riêng; đồng thời giảm độ phình của `PlayerList.tsx`).
- Thứ tự mới nằm trong mảng `players` nên tự động chảy xuống kết quả tính tiền,
  ảnh PNG xuất, và lịch sử — không cần sửa các module đó.
- Tay nắm chặn `onTouchStart` propagation để không kích hoạt logic vuốt-xóa;
  trong lúc kéo, tạm khóa swipe.

## Xử lý biên & rủi ro

- **Xung đột animation:** hàng đang dùng `AnimatePresence` với `height: 0` khi
  xóa; `Reorder.Item` dùng layout animation. Kiểm tra kỹ khi chạy thật — nếu
  giật, ưu tiên kéo thả mượt và đơn giản hóa animation xóa.
- Danh sách 0–1 người: tay nắm vẫn hiển thị (đỡ nhảy layout), kéo không có
  tác dụng.
- Cập nhật hint 💡 đầu danh sách: thêm "💡 Kéo ⠿ để sắp xếp thứ tự".

## Kiểm thử

- Unit test: tay nắm có `aria-label="Sắp xếp {tên}"` trên mỗi hàng; wiring
  `onReorder` → `onPatch` giữ nguyên nội dung mảng, chỉ đổi thứ tự. (Không mô
  phỏng gesture kéo thật trong jsdom — motion không hỗ trợ.)
- Kiểm chứng thủ công (Playwright/Chrome) ở viewport mobile và desktop: kéo
  đổi chỗ, cuộn trang không bị chặn ngoài tay nắm, vuốt-xóa vẫn chạy.
