# PTIT Learning Mobile

Dự án chuyển đổi từ Java JSP/Servlet sang **Node.js (Express)** + **React Native (Expo)**.

## Cấu trúc dự án

```
ptit-learning-mobile/
├── backend/          # Node.js Express API server
│   ├── src/
│   │   ├── config/       # Database config
│   │   ├── middleware/    # JWT auth middleware
│   │   ├── models/       # Data access layer (MySQL)
│   │   ├── routes/       # Express route handlers
│   │   └── server.js     # Entry point
│   └── package.json
├── mobile/           # React Native (Expo) app
│   ├── src/
│   │   ├── api/          # Axios API client
│   │   ├── components/   # Reusable UI components
│   │   ├── context/      # Auth & Cart context providers
│   │   ├── navigation/   # React Navigation setup
│   │   ├── screens/      # App screens (auth/student/admin/teacher)
│   │   └── utils/        # Theme, helpers
│   └── App.js
└── database/         # SQL schema
```

## Yêu cầu

- **Node.js** 18+
- **MySQL** 8.0+
- **Expo CLI**: `npm install -g expo-cli`

## Cài đặt

### 1. Database

```sql
-- Tạo database
CREATE DATABASE ptit_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ptit_user'@'localhost' IDENTIFIED BY '123456789';
GRANT ALL PRIVILEGES ON ptit_learning.* TO 'ptit_user'@'localhost';

-- Import schema
mysql -u ptit_user -p ptit_learning < database/01-create-schema.sql

-- Nếu bạn đã có database cũ, chạy thêm migration OTP/forgot-password
mysql -u ptit_user -p ptit_learning < database/03-add-email-otp-and-forgot-password.sql
```

### 2. Backend

```bash
cd backend
npm install
npm run dev      # Development (nodemon)
# hoặc
npm start        # Production
```

Server chạy tại: `http://localhost:3000`

Cấu hình thêm trong `backend/.env` để gửi OTP qua Gmail SMTP:

```env
MAIL_SMTP_HOST=smtp.gmail.com
MAIL_SMTP_PORT=465
MAIL_SMTP_SECURE=true
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-gmail-app-password
MAIL_FROM=PTIT Learning <your-email@gmail.com>

OTP_EXPIRES_MINUTES=10
OTP_COOLDOWN_SECONDS=60
OTP_MAX_ATTEMPTS=5
OTP_SECRET=change-this-otp-secret
```

> Với Gmail, bạn nên dùng **App Password** thay vì mật khẩu đăng nhập Gmail thông thường.

### 3. Mobile App

```bash
cd mobile
npm install
npx expo start
```

- Scan QR code bằng Expo Go (iOS/Android)
- Hoặc nhấn `a` để mở Android emulator

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | /api/auth/register/request-otp | Gửi OTP xác minh email đăng ký |
| POST | /api/auth/register | Đăng ký |
| POST | /api/auth/login | Đăng nhập |
| POST | /api/auth/forgot-password/request-otp | Gửi OTP quên mật khẩu |
| POST | /api/auth/forgot-password/reset | Đặt lại mật khẩu bằng OTP |
| GET | /api/auth/me | Thông tin user |
| GET | /api/courses | Danh sách khóa học |
| GET | /api/courses/search | Tìm kiếm |
| GET | /api/cart | Giỏ hàng |
| POST | /api/cart/add | Thêm vào giỏ |
| POST | /api/orders | Tạo đơn hàng |
| GET | /api/lessons?course_id=X | Danh sách bài học |
| POST | /api/lessons/progress/complete | Đánh dấu hoàn thành |
| GET | /api/admin/dashboard | Admin dashboard |
| GET | /api/teacher/dashboard | Teacher dashboard |

## Tài khoản mặc định

| Role | Email | Mật khẩu |
|------|-------|-----------|
| Admin | admin@ptit.edu.vn | admin123 |
| Giảng viên | teacher1@ptit.edu.vn | teacher123 |
| Sinh viên | student@example.com | 123456 |

## So sánh công nghệ

| Thành phần | Java (cũ) | Node.js + RN (mới) |
|------------|-----------|---------------------|
| Backend | Jakarta EE Servlets | Express.js |
| Frontend | JSP Pages | React Native (Expo) |
| Auth | Session + SHA-256 | JWT + bcrypt |
| Database | JDBC | mysql2 connection pool |
| Build | Maven + Tomcat | npm + Expo |

## Lưu ý

- API base URL cho emulator Android: `http://10.0.2.2:3000/api`
- Đổi IP trong `mobile/src/api/index.js` nếu test trên thiết bị thật
- File `.env` chứa JWT secret — đổi cho production

## SePay IPN với ngrok (Local)

Khi test SePay trên máy local, cần URL public để SePay callback vào webhook.

Thêm cấu hình trong `backend/.env` (1 lần):

```env
NGROK_AUTHTOKEN=your_ngrok_authtoken
NGROK_DEV_DOMAIN=your-dev-domain.ngrok-free.app
```

> Nếu bạn dùng custom domain riêng (ví dụ `api.dev.yourdomain.com` đã CNAME về ngrok),
> đặt luôn giá trị đó vào `NGROK_DEV_DOMAIN`.

```bash
cd backend
npm run ngrok:sepay
```

Script sẽ tự:
- Khởi động backend tại port 3000
- Mở ngrok tunnel với domain cố định nếu có `NGROK_DEV_DOMAIN`
- In ra URL IPN dạng `https://xxxx.ngrok-free.app/api/sepay/webhook`

Sau đó:
- Cập nhật URL này trong SePay dashboard
- Không cần sửa `IPN_URL` trong `backend/.env` khi chạy bằng script này (script tự inject runtime)
- Giữ terminal chạy trong suốt quá trình test thanh toán

Lưu ý:
- Script đã tự inject `IPN_URL` vào runtime backend nên không cần sửa tay `IPN_URL` mỗi lần chạy.
- Với key thật của SePay, đặt `SEPAY_ENV=production` trong `backend/.env` (không dùng `live`).
- Nếu test sandbox, đặt `SEPAY_ENV=sandbox`.
- Nếu bạn có API key nhưng không connect được, hãy lấy đúng Authtoken trong dashboard ngrok và đặt vào `NGROK_AUTHTOKEN`.
