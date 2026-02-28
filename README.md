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
| POST | /api/auth/register | Đăng ký |
| POST | /api/auth/login | Đăng nhập |
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
