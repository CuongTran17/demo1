#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# VPS Minimal Setup — CHỈ cài Nginx + Firewall
# VPS chỉ làm relay (reverse proxy), KHÔNG cần Node.js hay MySQL
#
# Chạy 1 lần trên VPS mới:
#   bash vps-minimal-setup.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

VPS_IP="103.161.118.158"

echo "======================================================"
echo "  PTIT IPN Relay Setup (Nginx only)"
echo "  VPS: $VPS_IP"
echo "======================================================"

# ── 1. Cập nhật hệ thống ──────────────────────────────
echo "[1/4] Cập nhật hệ thống..."
apt-get update -y

# ── 2. Cài Nginx ──────────────────────────────────────
echo "[2/4] Cài Nginx..."
apt-get install -y nginx

# ── 3. Firewall ───────────────────────────────────────
echo "[3/4] Cấu hình Firewall..."
apt-get install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
# Port 3001 chỉ cần accessible từ SSH tunnel (127.0.0.1), KHÔNG cần mở public
ufw --force enable

# ── 4. Cấu hình sshd: cho phép reverse tunnel bind 0.0.0.0 ──
# (Mặc định SSH tunnel chỉ bind 127.0.0.1, Nginx proxy 127.0.0.1:3001 là đủ)
echo "[4/4] Cấu hình SSH cho phép tunnel..."
if ! grep -q "AllowTcpForwarding yes" /etc/ssh/sshd_config; then
  echo "AllowTcpForwarding yes" >> /etc/ssh/sshd_config
fi
# Ubuntu 24.04 dùng ssh.service thay vì sshd.service
if systemctl list-units --type=service | grep -q "ssh.service"; then
  systemctl reload ssh
elif systemctl list-units --type=service | grep -q "sshd.service"; then
  systemctl reload sshd
fi

# ── Tạo Nginx config ──────────────────────────────────
cat > /etc/nginx/sites-available/ptit-ipn << 'EOF'
limit_req_zone $binary_remote_addr zone=ipn_limit:10m rate=10r/s;

server {
    listen 80;
    server_name 103.161.118.158;

    # Chỉ nhận POST /webhook từ SePay → relay về máy local qua SSH tunnel
    location /webhook {
        limit_req zone=ipn_limit burst=20 nodelay;

        if ($request_method !~ ^(POST)$) {
            return 405 '{"error":"Method Not Allowed"}';
        }

        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_read_timeout    30s;
        proxy_buffering       off;
    }

    # Health check
    location /health {
        access_log off;
        return 200 '{"status":"relay_ok"}';
        add_header Content-Type application/json;
    }

    # Chặn tất cả URL khác
    location / {
        return 403 '{"error":"Forbidden"}';
        add_header Content-Type application/json;
    }
}
EOF

# Enable config
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/ptit-ipn /etc/nginx/sites-enabled/ptit-ipn
nginx -t && systemctl reload nginx

echo ""
echo "======================================================"
echo "  VPS Relay sẵn sàng!"
echo ""
echo "  Trên máy local, chạy:"
echo "    npm run vps-tunnel"
echo ""
echo "  Sau đó cài IPN URL trên SePay:"
echo "    http://$VPS_IP/webhook"
echo "======================================================"
