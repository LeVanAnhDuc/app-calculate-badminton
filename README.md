🏸 Tính tiền cầu lông — chia tiền sân & cầu cho nhóm sau mỗi buổi chơi

Một ứng dụng web mobile-first, tính toán nhanh chóng chi phí cho từng thành viên trong nhóm chơi cầu lông. Không cần server, không cần đăng nhập — dữ liệu lưu trên máy của bạn.

## Tính năng chính

- **2 chế độ tính toán linh hoạt**
  - **Chia theo tỉ lệ**: Cộng tiền cầu & sân, chia theo hệ số giới tính (Nam/Nữ), hỗ trợ nhập ½ buổi
  - **Sân theo giờ**: Tiền sân chia theo giờ chơi thực tế từng người, tiền cầu vẫn chia theo hệ số (phù hợp khi nhóm có người đến muộn/về sớm)

- **Nhiều loại cầu trong một buổi**
  - Mỗi loại có tên, số lượng và giá riêng — tổng tiền cầu vẫn chia theo hệ số như cũ
  - Chọn loại cầu bằng bottom sheet: chip loại hay dùng, gõ để lọc, chọn xong tự điền giá lần trước
  - Lịch sử liệt kê rõ từng loại cầu đã dùng trong buổi

- **Làm tròn và quản lý số dư**
  - Làm tròn lên 1.000đ (mặc định) hoặc giữ chính xác
  - Hiển thị số dư tổng thu vs tổng chi (ẩn sau nút 👁 mỗi lần mở ứng dụng)

- **Chi phí phát sinh khác**
  - Nhập các khoản lặt vặt (nước, thuê vợt, quấn cán…) ngay trong mục Chi phí
  - Chọn một người, một nhóm nhỏ hay cả nhóm cùng chịu — số tiền chia đều theo đầu người
  - Kết quả liệt kê từng khoản dưới tên mỗi người, có cả trong ảnh PNG và bản copy text
  - Xóa người chơi thì khoản chung vẫn giữ nguyên tổng, những người còn lại gánh phần đó

- **Danh bạ & danh sách tự động nhớ**
  - Trang danh bạ theo phong cách Danh bạ iPhone: nhóm theo chữ cái đầu, tiêu đề chữ cái dính lại khi cuộn, thanh A–Z mép phải để nhảy nhanh tới nhóm
  - Tên tiếng Việt được bỏ dấu khi gom nhóm (Ánh nằm ở A, Đức nằm cùng D), tên bắt đầu bằng số hay ký tự lạ vào nhóm #
  - Ô tìm kiếm không dấu, không phân biệt hoa/thường ("duc" ra "Đức"); nút + trên đầu trang mở bottom sheet để thêm người
  - Gợi ý tên từ danh bạ khi gõ (không phân biệt hoa/thường)
  - Chip "Hay chơi cùng" khi ô tên còn trống: bấm một phát là thêm người hay gặp nhất (xếp hạng theo số buổi đã lưu, tự bỏ ai đã có trong buổi)
  - Danh sách buổi hiện tại được giữ nguyên giữa các lần dùng — lần sau chỉ cần sửa đổi

- **Lịch sử chi tiết & tái sử dụng**
  - Xem lại chi tiết từng buổi (chi phí, hệ số, kết quả tính)
  - "Dùng lại danh sách này" để nạp người chơi của buổi cũ vào buổi mới
  - Xóa buổi chỉ bằng một chạm, lỡ tay thì bấm "Hoàn tác"

- **Xóa an toàn với "Hoàn tác"**
  - Xóa người chơi, buổi đã lưu hay người trong danh bạ không còn phải bấm xác nhận
  - Thông báo "Hoàn tác" hiện 6 giây, khôi phục lại đúng vị trí cũ và giữ nguyên mọi thay đổi bạn làm trong lúc đó
  - Bấm "Buổi mới" nhầm cũng lấy lại được toàn bộ buổi đang nhập

- **Theo dõi ai đã trả tiền**
  - Đánh dấu ✓ đã trả cho từng người ngay trên bảng kết quả và trong lịch sử
  - Trạng thái đã trả hiển thị cả trong ảnh kết quả tải về

- **Chia sẻ kết quả**
  - Bấm nút chia sẻ để gửi ảnh kết quả thẳng vào Zalo/Messenger qua share sheet của điện thoại (máy không hỗ trợ sẽ tự tải ảnh PNG về)
  - Copy kết quả dạng text (tên + số tiền + dấu ✓ đã trả) để dán vào chat
  - Chia sẻ lại ảnh/text của buổi cũ ngay trong lịch sử, giữ đúng ngày đã lưu

- **Mã VietQR cho từng người chơi**
  - Nhập tài khoản người thu một lần — app sẽ dùng cho mọi buổi sau
  - Mỗi người quét QR riêng (kèm sẵn số tiền + nội dung chuyển khoản) để trả
  - Mã VietQR hiển thị trong ảnh kết quả PNG chia sẻ

- **Thao tác xóa đồng nhất ở mọi danh sách**
  - Mobile: vuốt trái để xóa — người chơi, danh bạ, dòng loại cầu, khoản phát sinh và cả buổi trong lịch sử, không còn nút xóa chiếm chỗ trên hàng
  - Desktop: một nút thùng rác đỏ duy nhất, cùng kích thước và canh giữa như nút sửa ở mọi màn hình
  - Mỗi danh sách đều có dòng gợi ý cách xóa, tự đổi theo thiết bị đang dùng
  - Vuốt có khóa trục: cuộn dọc hơi chéo tay không còn kéo hàng sang ngang

- **Giao diện linh hoạt**
  - Sửa giờ chơi qua bottom sheet (vaul), chọn giờ với wheel picker 24h kiểu iOS
  - Kéo tay nắm ⠿ để sắp xếp thứ tự người chơi (mobile & desktop)
  - Responsive: mobile 1 cột, desktop 2 cột sticky với animation mượt (Motion)

- **Cài như app & chạy offline**
  - Cài lên màn hình chính, mở thẳng như ứng dụng, không cần qua trình duyệt
  - Dùng được đầy đủ khi mất mạng — hợp với sân cầu sóng yếu

- **Không cần đăng nhập hay server**
  - Tất cả dữ liệu lưu localStorage trên máy của bạn
  - Chia sẻ link ứng dụng với bạn bè, mỗi người dùng độc lập

## Tech Stack

- **Frontend**: React 19, TypeScript (strict mode), Vite
- **Styling**: Tailwind CSS v4
- **UI Components**: vaul (bottom sheet), sonner (toast), react-mobile-picker, Motion (animation)
- **Testing**: Vitest + React Testing Library (366 test cases)
- **Build & Deploy**: Vite, tương thích static hosting (Vercel, Netlify, GitHub Pages)

## Chạy dự án

**Yêu cầu**: Node.js 18+

```bash
# Cài đặt các thư viện
npm install

# Chạy development server (http://localhost:5173)
npm run dev

# Chạy test suite (Vitest)
npm test

# Xây dựng production (output: dist/)
npm run build
```

## Cấu trúc thư mục

```
src/
├── lib/
│   ├── calc.ts        # Logic tính toán thuần (2 chế độ, làm tròn, số dư)
│   ├── time.ts        # Parse/format giờ, hỗ trợ qua đêm
│   ├── format.ts      # Format/parse tiền VND
│   ├── storage.ts     # localStorage wrapper (roster, session, history, settings)
│   └── types.ts       # TypeScript types
├── components/        # React components (form, player list, history, etc.)
└── App.tsx           # Routing & state chính

docs/
└── superpowers/specs/2026-08-13-badminton-cost-split-design.md  # Design spec đầy đủ
```

## Ví dụ tính toán

**Chế độ "Chia theo tỉ lệ"**: Tổng chi 300.000đ, hệ số Nam 1.5 / Nữ 1.0

Nhóm: Tuấn, Hùng, Minh (nam) + Lan, Hoa (nữ), Minh ½ buổi

```
Tổng phần = 1.5 + 1.5 + 0.75 + 1.0 + 1.0 = 5.75

Kết quả (làm tròn lên 1.000đ):
  Tuấn:  78.261đ → 79.000đ
  Hùng:  78.261đ → 79.000đ
  Minh:  39.130đ → 40.000đ
  Lan:   52.174đ → 53.000đ
  Hoa:   52.174đ → 53.000đ

Tổng thu: 304.000đ | Số dư: +4.000đ
```

---

**Khởi tạo**: 2026-08-13
