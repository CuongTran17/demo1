# PTIT Learning

Nền tảng học trực tuyến gồm:
- Backend API: Node.js + Express + MySQL
- Frontend web: React + Vite

Repository này đã chuyển từ hướng mobile cũ sang web app chạy qua thư mục `web`.

## Công nghệ chính

- Backend: Express 4, mysql2, JWT, bcrypt, Nodemailer, SePay SDK
- Frontend: React 19, React Router 7, Axios, ApexCharts, Vite 7
- Database: MySQL 8

## Cấu trúc dự án

```text
ptit-learning-mobile/
├── backend/
│   ├── src/
│   │   ├── config/          # Kết nối database
│   │   ├── middleware/      # Auth, RBAC
│   │   ├── models/          # Data access layer
│   │   ├── routes/          # API routes
│   │   └── server.js        # Main API server (port 3000)
│   ├── migrations/          # SQL migration bổ sung
│   ├── scripts/             # Ngrok/VPS tunnel, setup scripts
│   └── package.json
├── web/
│   ├── src/
│   │   ├── api/             # Axios client
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── styles/
│   └── package.json
└── database/
    └── 01-create-schema.sql
```

## Tính năng nổi bật

- Xác thực JWT + OTP email cho đăng ký/quên mật khẩu
- Quản lý khóa học, combo khóa học, giỏ hàng, đơn hàng, mã giảm giá
- Thanh toán SePay + IPN webhook (hỗ trợ ngrok tunnel)
- Theo dõi tiến độ học, gợi ý tiếp tục học, video progress theo segment
- Đánh giá khóa học (review/rating) + phản hồi từ teacher/admin
- Cấp chứng chỉ PDF tự động khi hoàn thành 100% khóa học
- Dashboard theo vai trò admin/teacher/student, có báo cáo doanh thu và hành vi khách hàng
- Flash sale theo toàn bộ, theo danh mục, hoặc theo danh sách khóa học
- Mã giảm giá có thể validate và gợi ý tự động trong giỏ hàng/checkout

## Yêu cầu môi trường

- Node.js 18+
- MySQL 8.0+
- npm

## Cài đặt nhanh

### 1) Tạo database

```sql
CREATE DATABASE ptit_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ptit_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON ptit_learning.* TO 'ptit_user'@'localhost';
FLUSH PRIVILEGES;
```

Import schema:

```bash
mysql -u ptit_user -p ptit_learning < database/01-create-schema.sql
```

Ghi chú:
- `database/01-create-schema.sql` là file schema chính.
- Khi đã import file schema chính, thường không cần chạy thêm migration `backend/migrations/02-add-reviews.sql`.
- File schema chính đã bao gồm course bundles, mã giảm giá, flash sale, analytics, chứng chỉ và các bảng phục vụ dashboard.

### 1.1) Seed dữ liệu demo (tùy chọn)

Các lệnh seed mặc định chạy ở chế độ dry-run, chỉ kiểm tra số lượng dữ liệu hiện có và in kế hoạch insert. Dùng dry-run trên máy đang có dữ liệu để xem trước; khi setup máy mới thì chạy bản `:apply`.

```bash
cd backend

# Dry-run: thêm dữ liệu demo nhưng không đụng dữ liệu khóa học
npm run seed:demo

# Apply: insert dữ liệu demo nhưng không thay đổi dữ liệu khóa học đang có
npm run seed:demo:apply

# Dry-run/Apply kèm dữ liệu khóa học mẫu cho database mới hoặc quá trống
npm run seed:demo:courses
npm run seed:demo:courses:apply
```

Ghi chú:
- `seed:demo` phù hợp khi database đã có khóa học thật và chỉ cần thêm blog, liên hệ, wishlist, review, thông báo, combo, flash sale.
- `seed:demo:courses:apply` chỉ nên dùng cho database mới hoặc môi trường demo chưa có đủ khóa học.

### 2) Cài và chạy backend

```bash
cd backend
npm install
```

Tạo file `backend/.env` (ví dụ):

```env
# Server
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=ptit_user
DB_PASSWORD=your_password
DB_NAME=ptit_learning

# JWT
JWT_SECRET=change_this_to_a_strong_secret
JWT_EXPIRES_IN=7d

# OTP / Email
OTP_EXPIRES_MINUTES=10
OTP_COOLDOWN_SECONDS=60
OTP_MAX_ATTEMPTS=5
OTP_SECRET=change_this_otp_secret

MAIL_SMTP_HOST=smtp.gmail.com
MAIL_SMTP_PORT=465
MAIL_SMTP_SECURE=true
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-gmail-app-password
MAIL_FROM=PTIT Learning <your-email@gmail.com>

# Frontend URL
FRONTEND_URL=http://localhost:5173

# SePay
SEPAY_MERCHANT_ID=your_merchant_id
SEPAY_SECRET_KEY=your_secret_key
SEPAY_ENV=sandbox
BACKEND_URL=http://localhost:3000
SEPAY_IPN_TIMEOUT_MS=1800000

# Optional: ngrok fixed domain
NGROK_AUTHTOKEN=your_ngrok_authtoken
NGROK_DEV_DOMAIN=your-dev-domain.ngrok-free.app

# Optional: dedicated IPN server
IPN_PORT=3001
```

Chạy backend:

```bash
npm run dev
```

Backend mặc định: `http://localhost:3000`

### 3) Cài và chạy frontend web

```bash
cd ../web
npm install
npm run dev
```

Web mặc định: `http://localhost:5173`

Vite đã cấu hình proxy `/api` và `/uploads` về backend `http://localhost:3000`.

## Scripts

### Backend (`backend/package.json`)

- `npm run dev`: chạy API server với nodemon
- `npm start`: chạy API server production mode
- `npm run ipn`: chạy IPN mini server trên port riêng (`/webhook`)
- `npm run ipn:dev`: chạy IPN mini server với nodemon
- `npm run ngrok:sepay`: mở ngrok tunnel cho SePay webhook + inject `IPN_URL` runtime
- `npm run vps-tunnel`: mở SSH reverse tunnel tới VPS relay
- `npm run seed:analytics`: tạo dữ liệu mẫu cho báo cáo hành vi khách hàng
- `npm run seed:demo`: dry-run seed dữ liệu demo, không thay đổi database
- `npm run seed:demo:apply`: insert dữ liệu demo, không thay đổi dữ liệu khóa học
- `npm run seed:demo:courses`: dry-run seed demo kèm khóa học mẫu
- `npm run seed:demo:courses:apply`: insert dữ liệu demo kèm khóa học mẫu cho database mới

### Frontend (`web/package.json`)

- `npm run dev`: chạy Vite dev server
- `npm run build`: build production
- `npm run preview`: preview build
- `npm run lint`: lint mã nguồn

## API modules (tóm tắt)

- `/api/auth`: đăng ký, OTP, đăng nhập, profile, đổi mật khẩu
- `/api/courses`: danh sách, tìm kiếm, chi tiết, khóa học đã mua
- `/api/bundles`: danh sách, chi tiết, review và giỏ hàng combo khóa học
- `/api/cart`: giỏ hàng, combo trong giỏ, gợi ý upsell
- `/api/orders`: tạo đơn, huỷ đơn, validate discount, mã giảm giá khả dụng, instant checkout
- `/api/sepay`: tạo payment + webhook IPN
- `/api/lessons`: bài học, tiến độ, video progress
- `/api/reviews`: review/rating khóa học
- `/api/certificates`: danh sách/tải chứng chỉ PDF
- `/api/admin`: dashboard và quản trị
- `/api/teacher`: dashboard và tác vụ giảng viên

## SePay IPN với ngrok (local)

Khi test SePay local, cần public webhook URL:

```bash
cd backend
npm run ngrok:sepay
```

Script sẽ:
- Mở ngrok tunnel cho backend port 3000
- Tự inject `BACKEND_URL` và `IPN_URL` vào runtime backend
- In ra URL webhook dạng `https://.../api/sepay/webhook`

Bạn chỉ cần copy URL này vào SePay dashboard.

Lưu ý:
- Với môi trường thật, dùng `SEPAY_ENV=production`.
- Với sandbox, dùng `SEPAY_ENV=sandbox`.
- Nếu lệnh thoát với code 1, kiểm tra lại `NGROK_AUTHTOKEN` (phải là authtoken hợp lệ của ngrok).

## Chứng chỉ PDF

Module chứng chỉ dùng font tiếng Việt trong `backend/fonts`.
Nếu thiếu font, chạy:

```bash
cd backend
node scripts/download-fonts.js
```

## Vai trò người dùng

Hệ thống hỗ trợ 3 vai trò: `admin`, `teacher`, `student`.

- Có thể quản lý role qua cột `users.role` (khuyến nghị).
- Nếu `role` chưa có giá trị, backend fallback theo email pattern:
  - `admin@ptit.edu.vn` -> admin
  - `teacher<number>@ptit.edu.vn` -> teacher
  - còn lại -> student

## Ghi chú triển khai

- Không commit file `backend/.env`.
- Nên thay toàn bộ secret mặc định trước khi deploy.
- Upload ảnh khóa học được phục vụ qua route `/uploads`.

## Báo cáo hành vi khách hàng

Hệ thống ghi nhận các sự kiện first-party analytics sau khi người dùng chấp nhận cookie analytics:

- `course_click`: người dùng bấm vào thẻ khóa học, được tính là tín hiệu quan tâm.
- `add_to_cart`: người dùng thêm khóa học vào giỏ hàng.
- `checkout_start`: người dùng mở trang thanh toán với giỏ hàng có sản phẩm.
- `payment_created`, `payment_completed`, `payment_cancelled`, `payment_failed`: tín hiệu trạng thái thanh toán.

Admin xem dữ liệu hành vi trong nhóm `Báo cáo`. Dashboard hiển thị tổng lượt quan tâm và số người quan tâm duy nhất, dùng `user_id` cho người dùng đã đăng nhập và `anonymous_id` cho khách.

Báo cáo doanh thu và hành vi khách hàng hỗ trợ lọc theo ngày, tuần, tháng, quý và toàn bộ thời gian. Xuất Excel/PDF dùng đúng khoảng thời gian đang chọn.

Trong dashboard admin, doanh thu và hành vi khách hàng được gộp trong `Báo cáo`. Các công cụ thương mại như flash sale, mã giảm giá, ưu đãi gợi ý giỏ hàng và combo khóa học được gộp trong `Khuyến mãi`.

## Tính năng thương mại điện tử

Storefront hỗ trợ:

- Yêu thích khóa học cho người dùng đã đăng nhập qua `/api/wishlist`.
- Khóa học đã xem gần đây, lưu trong localStorage với key `ptit_recently_viewed_courses`.
- Khóa học liên quan từ `/api/courses/:id/related`, xếp hạng theo danh mục, cấp độ, khoảng giá, độ phổ biến và rating.
- Gợi ý mã giảm giá khả dụng trong giỏ hàng và checkout qua `/api/orders/discount-codes/available`.

Các tính năng này giúp trang khóa học hoạt động giống một catalog thương mại điện tử hơn và giúp người dùng quay lại các khóa học đang cân nhắc.

## Thông báo giỏ hàng và combo khóa học

- Người dùng đã đăng nhập nhận thông báo trong tài khoản khi giỏ hàng cũ vẫn chưa thanh toán. Thông báo hiển thị ở tab `Thông báo` và có thể dẫn về `/cart`.
- Admin tạo combo khóa học trong tab `Khuyến mãi`. Người dùng có thể xem `/bundles`, mở chi tiết combo và thêm combo đang hoạt động vào giỏ hàng.
- Giá gốc combo được tính từ giá hiện tại trong database của các khóa học thuộc combo; admin chỉ nhập giá bán combo.
- Trang chi tiết combo hiển thị giá bán, giá gốc và số tiền/phần trăm tiết kiệm.
- Checkout combo phân bổ giá combo về từng khóa học để luồng ghi danh, tiến độ, chứng chỉ và doanh thu vẫn dùng được với order item cấp khóa học.

## Dashboard và tiến độ học tập

- Menu admin gộp doanh thu và hành vi vào `Báo cáo`; gộp flash sale, mã giảm giá, upsell discount và combo vào `Khuyến mãi`.
- Teacher dashboard gộp thao tác khóa học, báo cáo và yêu cầu thành ít mục hơn. Trang tổng quan có thẻ trạng thái, biểu đồ hiệu quả khóa học, biểu đồ trạng thái yêu cầu và top khóa học bán chạy.
- Trang tiến độ học tập của student có nút tiếp tục học, tổng quan trạng thái học, danh sách tiến độ từng khóa, số khóa đã hoàn thành và trạng thái chứng chỉ.

## UI và phông chữ

Web app dùng thống nhất `Be Vietnam Pro` cho storefront, dashboard, form, giỏ hàng, checkout, input mã giảm giá và placeholder ảnh khóa học.
