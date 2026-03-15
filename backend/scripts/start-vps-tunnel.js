/**
 * start-vps-tunnel.js
 * ─────────────────────────────────────────────────────────────
 * Khởi động IPN server (port 3001) + SSH Reverse Tunnel đến VPS.
 *
 * Luồng:
 *   SePay → http://103.161.118.158/webhook (Nginx)
 *              → VPS:3001 (qua SSH reverse tunnel)
 *                  → localhost:3001 (ipn-server.js trên máy local)
 *
 * Yêu cầu:
 *   - Đã copy SSH key lên VPS (ssh-copy-id root@103.161.118.158)
 *   - Nginx đã cài và cấu hình trên VPS (chạy scripts/vps-minimal-setup.sh 1 lần)
 *
 * Chạy:  npm run vps-tunnel
 * ─────────────────────────────────────────────────────────────
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const { spawn } = require('child_process');
const path = require('path');

const VPS_IP = '103.161.118.158';
const VPS_USER = 'root';
const IPN_PORT = parseInt(process.env.IPN_PORT || '3001', 10);

// ── Khởi động IPN server ──────────────────────────────────────
const ipnProcess = spawn('node', [path.resolve(__dirname, '..', 'src', 'ipn-server.js')], {
  stdio: 'inherit',
  env: { ...process.env },
});

ipnProcess.on('error', (err) => {
  console.error('❌ IPN server lỗi:', err.message);
});

// Đợi IPN server khởi động xong rồi mới mở tunnel
setTimeout(() => {
  console.log('\n🔗 Đang mở SSH Reverse Tunnel...');
  console.log(`   VPS ${VPS_IP}:${IPN_PORT} → localhost:${IPN_PORT}\n`);

  // ssh -R 3001:127.0.0.1:3001 -N -T ...  (dùng 127.0.0.1 thay vì localhost để tránh IPv6 issue)
  const sshArgs = [
    '-R', `${IPN_PORT}:127.0.0.1:${IPN_PORT}`,  // reverse tunnel, explicit IPv4
    '-N',                                         // không chạy remote command
    '-T',                                         // không phân bổ TTY
    '-o', 'ServerAliveInterval=30',               // giữ kết nối
    '-o', 'ServerAliveCountMax=3',                // retry 3 lần trước khi đóng
    '-o', 'ExitOnForwardFailure=yes',             // thoát nếu tunnel fail
    '-o', 'StrictHostKeyChecking=no',             // bỏ qua host key check lần đầu
    `${VPS_USER}@${VPS_IP}`,
  ];

  const sshProcess = spawn('ssh', sshArgs, { stdio: 'inherit' });

  sshProcess.on('spawn', () => {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log(`║  IPN URL  : http://${VPS_IP}/webhook`);
    console.log(`║  Cài SePay: http://${VPS_IP}/webhook`);
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  Ctrl+C để dừng tất cả                              ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
  });

  sshProcess.on('close', (code) => {
    console.warn(`\n⚠️  SSH tunnel đóng (code ${code}). Đang dừng IPN server...`);
    ipnProcess.kill();
    process.exit(code);
  });

  sshProcess.on('error', (err) => {
    if (err.code === 'ENOENT') {
      console.error('❌ Không tìm thấy lệnh ssh. Hãy cài OpenSSH Client:');
      console.error('   Windows: Settings → Optional Features → OpenSSH Client');
    } else {
      console.error('❌ SSH lỗi:', err.message);
    }
    ipnProcess.kill();
    process.exit(1);
  });

  // Cleanup khi Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n🛑 Đang dừng IPN server và SSH tunnel...');
    sshProcess.kill();
    ipnProcess.kill();
    process.exit(0);
  });

}, 1500); // đợi 1.5s cho IPN server khởi động
