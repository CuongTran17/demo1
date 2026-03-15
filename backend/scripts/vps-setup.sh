ssh root@103.161.118.158
# Paste toàn bộ nội dung vps-setup.sh vào terminal, hoặc:
bash <(curl -s http://...) # nếu đã upload script#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# VPS Setup Script cho PTIT Learning IPN Server
# VPS IP: 103.161.118.158
# Chạy với quyền root: bash vps-setup.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e  # dừng nếu có lỗi

VPS_IP="103.161.118.158"
APP_DIR="/var/www/ptit-learning/backend"
LOG_DIR="/var/log/ptit"
NODE_VERSION="20"

echo "======================================================"
echo "  PTIT Learning - VPS IPN Setup"
echo "  VPS: $VPS_IP"
echo "======================================================"

# ── 1. Cập nhật hệ thống ──────────────────────────────
echo ""
echo "[1/7] Cập nhật hệ thống..."
apt-get update -y && apt-get upgrade -y

# ── 2. Cài Node.js (LTS) ─────────────────────────────
echo ""
echo "[2/7] Cài Node.js $NODE_VERSION..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs

echo "  Node: $(node -v)"
echo "  npm : $(npm -v)"

# ── 3. Cài MySQL ──────────────────────────────────────
echo ""
echo "[3/7] Cài MySQL Server..."
apt-get install -y mysql-server

# Tạo database và user
mysql -e "
  CREATE DATABASE IF NOT EXISTS ptit_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'ptit_user'@'localhost' IDENTIFIED BY '123456789';
  GRANT ALL PRIVILEGES ON ptit_learning.* TO 'ptit_user'@'localhost';
  FLUSH PRIVILEGES;
"
echo "  MySQL: database 'ptit_learning' và user 'ptit_user' đã sẵn sàng"

# ── 4. Cài PM2 ────────────────────────────────────────
echo ""
echo "[4/7] Cài PM2..."
npm install -g pm2
pm2 --version

# ── 5. Cài Nginx ──────────────────────────────────────
echo ""
echo "[5/7] Cài Nginx..."
apt-get install -y nginx

# ── 6. Cấu hình Firewall (ufw) ───────────────────────
echo ""
echo "[6/7] Cấu hình Firewall..."
apt-get install -y ufw
ufw allow OpenSSH         # SSH
ufw allow 80/tcp          # HTTP  (Nginx)
ufw allow 443/tcp         # HTTPS (Nginx)
ufw allow 3001/tcp        # IPN server (trực tiếp nếu không dùng Nginx)
ufw --force enable

echo "  Firewall rules:"
ufw status numbered

# ── 7. Tạo thư mục app ───────────────────────────────
echo ""
echo "[7/7] Tạo thư mục app..."
mkdir -p "$APP_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$APP_DIR/uploads/course-images"

echo ""
echo "======================================================"
echo "  Setup hoàn tất!"
echo ""
echo "  Bước tiếp theo:"
echo "  1. Copy code lên VPS:"
echo "     rsync -avz --exclude node_modules --exclude .env \\"
echo "       ./backend/ root@$VPS_IP:$APP_DIR/"
echo ""
echo "  2. SSH vào VPS:"
echo "     ssh root@$VPS_IP"
echo ""
echo "  3. Trong VPS, tạo .env:"
echo "     cp $APP_DIR/.env.vps $APP_DIR/.env"
echo "     nano $APP_DIR/.env   # Sửa các giá trị cần thiết"
echo ""
echo "  4. Cài dependencies và chạy migration:"
echo "     cd $APP_DIR && npm install --production"
echo "     mysql -u ptit_user -p ptit_learning < /var/www/ptit-learning/database/01-create-schema.sql"
echo ""
echo "  5. Khởi động với PM2:"
echo "     cd $APP_DIR && pm2 start ecosystem.config.js"
echo "     pm2 save && pm2 startup"
echo ""
echo "  6. Copy Nginx config:"
echo "     cp $APP_DIR/scripts/nginx-ipn.conf /etc/nginx/sites-available/ptit-ipn"
echo "     ln -s /etc/nginx/sites-available/ptit-ipn /etc/nginx/sites-enabled/"
echo "     nginx -t && systemctl reload nginx"
echo ""
echo "  IPN URL (HTTP):  http://$VPS_IP:3001/webhook"
echo "  IPN URL (Nginx): http://$VPS_IP/webhook"
echo "======================================================"
