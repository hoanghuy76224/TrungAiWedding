# Thành Trung & Ngọc Ái

Thiệp theo mẫu Bella & Lance, màu xanh xám từ Trinh Hoàng, bỏ passport. Hai trang riêng: `/nhagai/` và `/nhatrai/`. Trang gốc mặc định nhà gái. Quản trị `/admin.html`.

## Nội dung

Nhà gái: đón khách 17:30, khai tiệc 18:30 ngày 05/12/2026, Khách sạn Bình Minh, sảnh San Hô, 211 Lê Lợi, P. Phan Thiết, Lâm Đồng. Lễ Vu Quy tại tư gia lúc 08:00 ngày 06/12/2026.

Nhà trai: đón khách 11:00, khai tiệc 12:00 ngày 06/12/2026, Nhà hàng tiệc cưới Nga Khôi, KM.32, Thôn Lập Đức, X. Tân Lập, Lâm Đồng. Lễ Tân Hôn tại tư gia lúc 09:30 ngày 06/12/2026.

Storytelling giữ nguyên nội dung được cung cấp. Album 31 ảnh từ thư mục Drive được chủ sở hữu chia sẻ công khai bằng liên kết. `assets/photos.json` lưu danh sách ảnh nguồn. Ảnh hiển thị qua Google, chưa sao chép vào repo. Nếu quyền chia sẻ thay đổi ảnh có thể không tải được.

## Triển khai Cloudflare Pages

Kết nối repo này với Cloudflare Pages, không framework, không lệnh build, thư mục đầu ra `/`. Tạo D1 mới dành riêng cho thiệp, gắn binding tên `DB`. Đặt secret `ADMIN_PASSWORD` tối thiểu 16 ký tự trong Pages. Redeploy sau khi gắn binding/secret. Bảng dữ liệu được tự tạo ở lần gọi API đầu tiên. Không chứa mật khẩu trong frontend. Admin dùng cookie HttpOnly, Secure, SameSite, hết hạn sau 6 giờ. API RSVP có kiểm tra dữ liệu, giới hạn tần suất; admin lọc nhà, thống kê, xuất CSV, ẩn phản hồi, tạo link mời cá nhân hóa.

Thiếu DB hoặc secret, API trả lỗi rõ ràng và không hiển thị xác nhận thành công giả. Chưa kết nối Cloudflare thì chưa thể nhận RSVP thật.

## Nhạc

Chờ file nhạc từ khách. Sau khi nhận, thêm file tại `/music.mp3` (MIME audio/mpeg). Cả hai nhà dùng cùng file; nhạc phát sau thao tác mở thiệp. Khi chưa có MP3, trang vẫn hoạt động và không phát nhạc mẫu.
