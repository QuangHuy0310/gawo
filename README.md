# 🎮 Cờ Caro Realtime 3 - 4 Người Chơi (Bàn Cờ 30×30)

Dự án game cờ Caro (Gomoku) chơi trực tuyến thời gian thực dành cho **3 hoặc 4 người chơi cùng 1 ván** trên cùng một bàn cờ. Xây dựng bằng **TypeScript**, **React/Vite**, **Node.js (Express)** và **Socket.IO**.

---

## 🌟 Tính Năng Nổi Bật

1. **Bàn cờ mở rộng 30 × 30 (900 ô)**:
   - Kích thước bàn cờ cố định **30 × 30** với 900 ô cờ, tọa độ hàng 1–30 và cột `A–Z, AA–AD`.
   - Điều hướng thông minh: Tự động căn giữa khi bắt đầu, hỗ trợ nút **"🎯 Nước mới nhất"** và **"📍 Giữa bàn cờ"**.
   - Hỗ trợ cuộn 2D mượt mà và thu phóng (Zoom in/out từ 65% đến 150%) trên cả Mobile (390px), Tablet (768px) và Desktop (1440px).
2. **Cơ chế chọn người đi trước ngẫu nhiên (Random Turn Start)**:
   - Server tự động chọn ngẫu nhiên một người chơi trong phòng để đánh nước đầu tiên.
   - Khi Rematch (đấu lại), server chọn ngẫu nhiên lại độc lập để đảm bảo tuyệt đối tính công bằng.
   - Thông báo rõ ràng: *"🎲 [Tên người chơi] được hệ thống chọn đi trước!"*.
3. **Hỗ trợ 3 hoặc 4 người chơi trong một ván**:
   - Tùy chọn cấu hình phòng 3 hoặc 4 người khi tạo phòng.
   - Mỗi người chơi sở hữu một màu sắc và ký hiệu riêng biệt:
     - 🟦 **Người chơi 1**: Ký hiệu `X` (Xanh dương - `#2563EB`)
     - 🟥 **Người chơi 2**: Ký hiệu `O` (Đỏ - `#DC2626`)
     - 🟪 **Người chơi 3**: Ký hiệu `▲` (Tím - `#7C3AED`)
     - 🟧 **Người chơi 4**: Ký hiệu `■` (Cam vàng - `#D97706`)
4. **Luật chơi Caro chuẩn**:
   - Ai đạt **từ 5 quân liên tiếp trở lên** theo hàng ngang, hàng dọc, đường chéo chính hoặc đường chéo phụ trước là người chiến thắng.
   - Không áp dụng luật chặn 2 đầu; hỗ trợ $\ge 5$ quân.
5. **Thứ tự xoay vòng lượt chơi chặt chẽ**:
   - Xoay vòng cố định theo thứ tự kể từ người được random chọn đi đầu.
   - Server kiểm soát tính hợp lệ của nước đi: đúng lượt, ô chưa có quân, ván cờ đang diễn ra.
6. **Hệ thống phòng qua mã (Room Code)**:
   - Tạo phòng với mã 5 ký tự ngẫu nhiên dễ nhớ (VD: `A4K9B`).
   - Phòng chỉ bắt đầu khi có đủ số người đã cấu hình (3 hoặc 4) và tất cả người chơi đều đã sẵn sàng.
   - Tự động chặn người thứ 5 không thể vào phòng.
7. **Đồng bộ thời gian thực & Hiệu ứng trực quan**:
   - Nước đi cập nhật tức thì trên tất cả màn hình người chơi (dưới 100ms).
   - Đánh dấu nước đi gần nhất (Last Move Indicator) với chấm phát sáng.
   - Đổi màu và hiệu ứng phát sáng cho 5 quân tạo thành đường thắng (Winning Line Glow).
   - Bắn pháo hoa (Confetti) chúc mừng khi chiến thắng.
8. **Xử lý mất kết nối & Tái kết nối (Reconnection)**:
   - Lưu session an toàn trong `localStorage`. Nếu người chơi F5 hoặc rớt mạng ngắn hạn, hệ thống tự động kết nối lại vào đúng phòng và giữ nguyên vị trí/trạng thái.
   - Hiển thị đồng hồ đếm ngược (60 giây) cảnh báo người chơi bị mất kết nối. Nếu quá 60s không kết nối lại, ván cờ sẽ bị hủy để tránh treo bàn cờ.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 18, Vite, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js, Express, Socket.IO.
- **Language**: TypeScript (End-to-End type safety cho Socket events và Game State).
- **Testing**: Vitest (20 tests bao gồm Logic game 30x30, Quản lý phòng & Socket realtime integration).

---

## 🚀 Hướng Dẫn Chạy Trên Môi Trường Cục Bộ (Local)

### 1. Yêu cầu hệ thống
- Node.js >= 18.x
- npm hoặc pnpm

### 2. Cài đặt thư viện
```bash
npm install
```

### 3. Chạy chế độ Phát triển (Development Mode)
Lệnh sau sẽ chạy đồng thời cả Backend (port `3001`) và Vite Frontend (port `5173`):
```bash
npm run dev
```
Mở trình duyệt truy cập: **`http://localhost:5173`**

### 4. Chạy Kiểm thử (Unit & Integration Tests)
```bash
npm test
```

### 5. Build và Chạy môi trường Production
```bash
# Build cả client và server
npm run build

# Khởi động server production (phục vụ cả client và socket tại port 3001)
npm start
```
Truy cập: **`http://localhost:3001`**

---

## 📁 Cấu Trúc Thư Mục

```
urgame/
├── src/
│   ├── shared/
│   │   ├── caro/                # Kiểu dữ liệu và sự kiện Caro
│   │   └── xiangqi/             # Luật bàn cờ và kiểu dữ liệu Cờ Tướng Tam Quốc
│   ├── server/
│   │   ├── index.ts             # Khởi tạo Express và Socket.IO
│   │   └── games/
│   │       ├── caro/            # Luật, quản lý phòng và socket Caro
│   │       └── xiangqi/         # Quản lý phòng và socket Cờ Tướng Tam Quốc
│   └── client/
│       ├── main.tsx             # Entry point React
│       ├── App.tsx              # Điều hướng giữa trang chủ và các game
│       ├── Home.tsx             # Danh sách game
│       ├── index.css            # Kiểu giao diện chung
│       └── games/
│           ├── caro/            # Sảnh, bàn cờ, kết nối và CSS của Caro
│           └── xiangqi/         # Sảnh, bàn cờ và CSS của Cờ Tướng Tam Quốc
├── test/
│   └── ...                      # Kiểm thử luật và luồng Socket.IO của hai game
├── package.json
├── tsconfig.json
├── tsconfig.server.json
└── vite.config.js
```
