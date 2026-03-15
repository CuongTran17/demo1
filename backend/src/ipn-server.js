/**
 * SePay IPN Mini Server
 * Chạy độc lập trên port riêng (mặc định 3001).
 * Chỉ nhận IPN từ SePay — không expose toàn bộ backend ra ngoài.
 *
 * Cách dùng:
 *   node src/ipn-server.js
 *   # hoặc dùng nodemon:
 *   nodemon src/ipn-server.js
 *
 * Sau đó tunnel chỉ port 3001:
 *   cloudflared tunnel --url http://localhost:3001
 *
 * Copy URL Cloudflare trả về vào BACKEND_URL trong .env:
 *   BACKEND_URL=https://xxxx.trycloudflare.com
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const crypto = require('crypto');

// Dùng chung models với main server
const Order = require('./models/Order');

const app = express();
const IPN_PORT = process.env.IPN_PORT || 3001;
const SEPAY_SECRET_KEY = process.env.SEPAY_SECRET_KEY || 'spsk_test_41D8f24AyGBisC86uHtT4F8zEDvRHUF8';

function normalizeBase64(value) {
  return String(value || '')
    .trim()
    .replace(/-/g, '+')
    .replace(/_/g, '/');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Chặn tất cả request không phải POST /webhook ──
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/webhook') return next();
  return res.status(403).json({ error: 'Forbidden' });
});

// ============ POST /webhook ============
app.post('/webhook', async (req, res) => {
  try {
    console.log('[SePay IPN] Received:', JSON.stringify(req.body, null, 2));

    // ── Xác thực chữ ký HMAC-SHA256 ──
    const signature = req.headers['x-sepay-signature'] || req.body.signature;
    if (signature) {
      const payload = Object.keys(req.body)
        .filter((k) => k !== 'signature')
        .sort()
        .map((k) => `${k}=${req.body[k]}`)
        .join('&');

      const expectedHex = crypto
        .createHmac('sha256', SEPAY_SECRET_KEY)
        .update(payload)
        .digest('hex');

      const expectedBase64 = crypto
        .createHmac('sha256', SEPAY_SECRET_KEY)
        .update(payload)
        .digest('base64');

      const receivedSig = String(signature).trim();
      const receivedBase64 = normalizeBase64(signature);
      const isValidSig =
        receivedSig === expectedHex ||
        receivedSig === expectedBase64 ||
        receivedBase64 === expectedBase64;

      if (!isValidSig) {
        console.warn('[SePay IPN] Invalid signature!', {
          received: receivedSig,
          expectedHex,
          expectedBase64,
        });
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }
      console.log('[SePay IPN] Signature OK');
    } else {
      console.warn('[SePay IPN] No signature (OK in sandbox)');
    }

    const { order_invoice_number, transaction_status, transaction_id } = req.body;

    if (!order_invoice_number) {
      return res.status(400).json({ success: false, message: 'Missing invoice number' });
    }

    const orderId = Number(order_invoice_number.replace(/^DH/, ''));
    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid invoice number format' });
    }

    const isSuccess =
      transaction_status === 'success' ||
      transaction_status === 'COMPLETED' ||
      transaction_status === 'completed' ||
      transaction_status === 'SUCCESS' ||
      transaction_status === 'PAID' ||
      transaction_status === 'paid' ||
      transaction_status === 'CAPTURED' ||
      transaction_status === 'captured';

    if (isSuccess) {
      await Order.updateStatus(orderId, 'completed');
      await Order.logPaymentApproval(
        orderId,
        null,
        'sepay_ipn',
        `SePay IPN confirmed. TransactionId: ${transaction_id}`
      );
      console.log(`[SePay IPN] Order #${orderId} → COMPLETED`);
    } else {
      await Order.updateStatus(orderId, 'cancelled');
      console.log(`[SePay IPN] Order #${orderId} → CANCELLED (${transaction_status})`);
    }

    return res.status(200).json({ success: true, message: 'IPN received' });
  } catch (err) {
    console.error('[SePay IPN] Error:', err);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
});

app.listen(IPN_PORT, '0.0.0.0', () => {
  console.log(`✅ SePay IPN server running on http://0.0.0.0:${IPN_PORT}/webhook`);
  console.log(`   Public URL: http://<VPS_IP>:${IPN_PORT}/webhook`);
});
