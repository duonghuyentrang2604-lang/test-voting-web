# Web bình chọn tiết mục v2 (Vercel + Upstash Redis)

Trang: /  (người tham gia, in mã QR trỏ tới đây) · /live.html (màn hình lớn, có QR) · /admin.html (quản trị)

Biến môi trường trên Vercel:
- ADMIN_EMAIL, ADMIN_PASSWORD  (đăng nhập /admin.html; nên đặt mật khẩu dài)
- MAX_PER_IP (tùy chọn, mặc định 50 phiếu/mạng/ngày)
- Các biến Upstash do Vercel tự thêm khi kết nối database.

Quy trình sự kiện: đăng nhập admin → nhập Excel → chiếu /live.html → bấm Mở → Đóng → Công bố.
