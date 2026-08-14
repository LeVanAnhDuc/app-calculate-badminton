# Spec: Đánh dấu đã trả tiền (paid tracking)

**Ngày**: 2026-08-14 · **Trạng thái**: Đã duyệt thiết kế, triển khai ngay

## Mục tiêu

Đánh dấu từng người đã trả tiền hay chưa, tick dần khi thu tiền (tại sân hoặc chuyển khoản trễ vài ngày), nhìn ra ngay ai còn thiếu và còn thiếu bao nhiêu.

## 1. Dữ liệu & di trú (QUAN TRỌNG)

- Thêm `paid: boolean` vào `Player` (src/lib/types.ts), mặc định `false`.
- **Di trú mềm — không được làm mất dữ liệu cũ**: dữ liệu localStorage hiện có KHÔNG có trường `paid`. Schema guard (`isPlayer` trong storage.ts) phải chấp nhận `paid` là `boolean` HOẶC `undefined`; khi load (`loadCurrentSession`, `loadHistory`) chuẩn hóa `paid: p.paid ?? false` trước khi trả về. Bắt buộc có test: dữ liệu cũ (player không có `paid`) vẫn load được đầy đủ, không bị guard từ chối.
- `handleAddPlayer`, "Dùng lại danh sách" (onReuse), "Buổi mới": player mới/reset luôn có `paid: false`.
- Không đụng `calc.ts` — kết quả tính không phụ thuộc paid. Helper thuần mới trong `src/lib/settlement.ts`:
  - `paidCount(players: Player[]): number`
  - `unpaidAmount(players: Player[], results: PlayerResult[]): number` — tổng `amount` của người có `paid === false` (khớp theo playerId)
  - Unit test cho cả hai.

## 2. Màn Kết quả (ResultPanel) + full-screen

- Mỗi hàng người chơi: nút tròn toggle bên trái số tiền — chưa trả: vòng ○ viền gray-300; đã trả: ✓ trắng trên nền emerald-600. `aria-label`: `Đánh dấu {name} đã trả` / `Bỏ đánh dấu {name} đã trả`. Touch target ≥ 40px.
- Hàng đã trả: nền `bg-emerald-50` (thay gray-50).
- Dưới heading "Kết quả": dòng tổng kết
  - Còn thiếu: `Đã thu {x}/{n} · còn thiếu {formatVND(unpaid)}` (text-sm, số còn thiếu màu amber-600)
  - Đủ: `✓ Đã thu đủ` (text-sm emerald-600)
  - Chỉ hiện khi có result (không hiện lúc lỗi validation).
- Toggle cập nhật `session.players[i].paid` qua onPatch → tự persist currentSession như mọi thay đổi khác.
- Màn full-screen: tick được y hệt (cùng handler), dòng tổng kết cũng hiện.

## 3. Trang Lịch sử

- Chi tiết buổi, khối "Mỗi người trả": mỗi hàng có cùng nút toggle. Bấm → cập nhật `input.players[].paid` của ĐÚNG buổi đó trong state history của App → tự persist qua saveHistory (đã có useEffect). HistoryPage nhận thêm callback `onTogglePaid(sessionId, playerId)`.
- Dòng tổng kết trong chi tiết (trên khối Mỗi người trả): giống mục 2.
- Card thu gọn: khi còn người chưa trả, hiện badge cam cạnh dòng số người: `⚠ {k} chưa trả` (text-xs, text-amber-600 bg-amber-50 rounded-full px-2 py-0.5). Thu đủ: không hiện gì.

## 4. Ảnh PNG (exportImage.ts)

- Người `paid: true`: vẽ dấu ✓ emerald trước tên. Người chưa trả: vòng tròn rỗng gray nhạt (giữ thẳng hàng).
- `renderResultImage`/`downloadResultImage` nhận thêm thông tin paid (đổi signature: truyền `players: Player[]` hoặc map paidById — chọn cách gọn, cập nhật call sites).
- Vẫn KHÔNG có tổng thu / số dư / tổng chi / dòng "còn thiếu" trong ảnh.

## 5. Test bắt buộc

1. settlement helpers (paidCount, unpaidAmount) — unit thuần.
2. ResultPanel: toggle 1 người → dòng tổng kết đổi "Đã thu 1/2 · còn thiếu …"; tick hết → "✓ Đã thu đủ".
3. History: toggle trong chi tiết → `loadHistory()` phản ánh paid mới (persist thật); badge "chưa trả" đếm đúng trên card thu gọn.
4. **Di trú**: seed localStorage bằng session/history KHÔNG có trường paid → load được, paid = false, không mất dữ liệu.
5. PNG export: stub canvas, gọi download với players có paid mix — không crash, filename đúng (giữ test pattern hiện có).

## Ngoài phạm vi

Nhắc nợ, ngày trả từng người, trả một phần, đồng bộ đa thiết bị.
