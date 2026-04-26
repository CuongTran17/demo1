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
- Quản lý khóa học, giỏ hàng, đơn hàng, mã giảm giá
- Thanh toán SePay + IPN webhook (hỗ trợ ngrok tunnel)
- Theo dõi tiến độ học, video progress theo segment
- Đánh giá khóa học (review/rating) + phản hồi từ teacher/admin
- Cấp chứng chỉ PDF tự động khi hoàn thành 100% khóa học
- Dashboard theo vai trò admin/teacher/student
- Flash sale theo toàn bộ, theo danh mục, hoặc theo danh sách khóa học

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

### Frontend (`web/package.json`)

- `npm run dev`: chạy Vite dev server
- `npm run build`: build production
- `npm run preview`: preview build
- `npm run lint`: lint mã nguồn

## API modules (tóm tắt)

- `/api/auth`: đăng ký, OTP, đăng nhập, profile, đổi mật khẩu
- `/api/courses`: danh sách, tìm kiếm, chi tiết, khóa học đã mua
- `/api/cart`: giỏ hàng
- `/api/orders`: tạo đơn, huỷ đơn, validate discount, instant checkout
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
