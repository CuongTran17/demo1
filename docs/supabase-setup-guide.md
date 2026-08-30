# Hướng Dẫn Thiết Lập Supabase (Database & Storage)

Tài liệu này hướng dẫn chi tiết cách khởi tạo dự án Supabase, import Database Schema và thiết lập Storage Bucket cho hệ thống PTIT Learning.

---

## 1. Tạo dự án trên Supabase

1. Truy cập [https://supabase.com](https://supabase.com) và đăng nhập bằng tài khoản GitHub hoặc Email.
2. Nhấn nút **New project** và chọn Organization của bạn.
3. Điền thông tin dự án:
   - **Name**: `ptit-learning` (hoặc tên tuỳ chọn).
   - **Database Password**: Đặt mật khẩu mạnh và **lưu lại cẩn thận** (cần dùng khi kết nối backend).
   - **Region**: Chọn khu vực gần Việt Nam nhất, ví dụ: `Southeast Asia (Singapore)`.
   - **Pricing Plan**: `Free`.
4. Nhấn **Create new project** và đợi 1-2 phút để Supabase khởi tạo xong cơ sở hạ tầng.

---

## 2. Import Database Schema (PostgreSQL)

1. Trên menu bên trái của Supabase Dashboard, chọn biểu tượng **SQL Editor** (icon `>_`).
2. Nhấn **New query**.
3. Mở file [database/supabase-schema.sql](file:///c:/Users/Lenovo/Downloads/ptit-learning-mobile/database/supabase-schema.sql), copy toàn bộ nội dung và dán vào cửa sổ SQL Editor.
4. Nhấn nút **Run** (hoặc tổ hợp phím `Ctrl + Enter` / `Cmd + Enter`).
5. Kết quả hiển thị `Success. No rows returned` nghĩa là toàn bộ bảng, khóa ngoại, triggers và views đã được khởi tạo thành công.
6. Vào mục **Table Editor** ở menu trái để kiểm tra: bạn sẽ thấy đầy đủ các bảng (`users`, `courses`, `lessons`, `orders`, `quizzes`, `blogs`, `cart_upsell_settings`, v.v.).

---

## 3. Tạo Storage Bucket (Lưu trữ ảnh & file upload)

1. Trên menu bên trái, chọn mục **Storage**.
2. Nhấn **New bucket**:
   - **Name**: `ptit-uploads`
   - **Public bucket**: Bật **ON** (để ảnh khóa học và avatar có thể truy cập qua link public CDN).
3. Nhấn **Save bucket**.
4. Thiết lập Storage Policies:
   - Vào bucket `ptit-uploads` $\rightarrow$ **Configuration** $\rightarrow$ **Policies**.
   - Thêm policy cho phép **Public Read**: Cho phép mọi người đọc ảnh qua URL.
   - Thêm policy cho phép **Authenticated / Service Role Upload**: Cho phép backend upload file lên bucket.

---

## 4. Lấy thông tin kết nối (Connection String & API Keys)

Vào **Project Settings** (icon bánh răng ở góc dưới bên trái):

1. **Database Connection (dành cho Backend kết nối trực tiếp DB)**:
   - Vào mục **Database** $\rightarrow$ Kéo xuống phần **Connection string**.
   - Chọn tab **URI** (hoặc **Node.js**).
   - Copy URI dạng:
     ```
     postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
     ```
2. **API Keys (dành cho Backend kết nối qua Supabase SDK / Storage)**:
   - Vào mục **API**:
     - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
     - **anon / public key**: Dùng cho client/frontend (nếu cần).
     - **service_role secret**: Dùng cho backend server để upload file/quản trị.

---

## 5. Hướng Dẫn Deploy Frontend lên Vercel

1. Đăng nhập [https://vercel.com](https://vercel.com).
2. Nhấn **Add New...** $\rightarrow$ **Project**.
3. Import Git Repository `ptit-learning-mobile` từ GitHub / GitLab.
4. Cấu hình Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Nhấn **Edit** và chọn thư mục `web`.
   - **Build Command**: `npm run build` (mặc định)
   - **Output Directory**: `dist` (mặc định)
5. Cấu hình Environment Variables:
   - Thêm biến `VITE_API_URL` với giá trị là URL Backend của bạn (ví dụ: `https://ptit-api.onrender.com/api`).
6. Nhấn **Deploy**.
7. Sau 30-60 giây, Vercel sẽ cung cấp link truy cập dạng `https://ptit-learning-xxxx.vercel.app`.
