const express = require('express');
const crypto = require('crypto');
const { SePayPgClient } = require('sepay-pg-node');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { auth } = require('../middleware/auth');

const router = express.Router();

function normalizeBase64(value) {
  return String(value || '')
    .trim()
    .replace(/-/g, '+')
    .replace(/_/g, '/');
}

function normalizeSepayEnv(rawEnv, merchantId, secretKey) {
  const env = String(rawEnv || '').trim().toLowerCase();

  if (env === 'sandbox' || env === 'test') {
    return 'sandbox';
  }

  if (env === 'production' || env === 'prod' || env === 'live') {
    return 'production';
  }

  const looksLikeLiveCredentials =
    String(merchantId || '').toUpperCase().includes('LIVE') ||
    String(secretKey || '').startsWith('spsk_live_');

  if (!env) {
    return looksLikeLiveCredentials ? 'production' : 'sandbox';
  }

  const fallbackEnv = looksLikeLiveCredentials ? 'production' : 'sandbox';
  console.warn(`[SePay] Unknown SEPAY_ENV="${rawEnv}". Using "${fallbackEnv}".`);
  return fallbackEnv;
}

// ============ SePay Configuration ============
const SEPAY_MERCHANT_ID = process.env.SEPAY_MERCHANT_ID || 'SP-TEST-TD54A554';
const SEPAY_SECRET_KEY = process.env.SEPAY_SECRET_KEY || 'spsk_test_41D8f24AyGBisC86uHtT4F8zEDvRHUF8';
const SEPAY_ENV = normalizeSepayEnv(process.env.SEPAY_ENV, SEPAY_MERCHANT_ID, SEPAY_SECRET_KEY);

const sepayClient = new SePayPgClient({
  env: SEPAY_ENV,
  merchant_id: SEPAY_MERCHANT_ID,
  secret_key: SEPAY_SECRET_KEY,
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// BACKEND_URL: URL của main backend (dùng cho các redirect khác nếu cần)
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// IPN_URL: URL riêng để nhận IPN từ SePay.
// Khi localhost: chạy `node src/ipn-server.js` rồi tunnel port 3001:
//   cloudflared tunnel --url http://localhost:3001
// Sau đó đặt IPN_URL=https://xxxx.trycloudflare.com/webhook trong .env
// Khi production: IPN_URL=https://yourdomain.com/api/sepay/webhook
const IPN_URL =
  process.env.IPN_URL ||
  (BACKEND_URL.includes('localhost')
    ? 'http://localhost:3001/webhook'
    : `${BACKEND_URL}/api/sepay/webhook`);

// ============ POST /api/sepay/create-payment ============
// Creates order from cart & returns SePay checkout URL + form fields
router.post('/create-payment', auth, async (req, res) => {
  try {
    const { discountCode } = req.body || {};

    // 1. Get cart items
    const cartItems = await Cart.getUserCart(req.user.userId);
    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Giỏ hàng trống' });
    }

    const subtotalAmount = Math.round(cartItems.reduce((sum, c) => sum + Number(c.price || 0), 0));

    // 2. Create order in DB with status 'pending_payment'
    const orderId = await Order.create(
      req.user.userId,
      cartItems,
      'sepay',
      'Thanh toan qua SePay',
      discountCode
    );

    const order = await Order.getById(orderId);
    const totalAmount = Number(order?.total_amount || subtotalAmount);
    const discountAmount = Number(order?.discount_amount || 0);

    const invoiceNumber = `DH${orderId}`;

    // 3. Build SePay checkout URL and form fields via SDK
    const checkoutURL = sepayClient.checkout.initCheckoutUrl();

    const checkoutFormFields = sepayClient.checkout.initOneTimePaymentFields({
      payment_method: 'BANK_TRANSFER',
      order_invoice_number: invoiceNumber,
      order_amount: Math.round(totalAmount),
      currency: 'VND',
      order_description: `Thanh toan don hang ${invoiceNumber}`,
      success_url: `${FRONTEND_URL}/checkout/sepay-return?status=success&orderId=${orderId}`,
      error_url: `${FRONTEND_URL}/checkout/sepay-return?status=error&orderId=${orderId}`,
      cancel_url: `${FRONTEND_URL}/checkout/sepay-return?status=cancel&orderId=${orderId}`,
      // IPN URL: SePay gọi server-to-server khi thanh toán xong.
      // Trỏ tới ipn-server.js (port 3001) qua Cloudflare Tunnel.
      ipn_url: IPN_URL,
    });

    res.json({
      message: 'Tạo thanh toán thành công',
      checkoutURL,
      checkoutFormFields,
      orderId,
      subtotalAmount,
      discountAmount,
      totalAmount,
      discountCode: order?.discount_code || null,
    });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) {
      console.error('SePay create payment error:', err);
    }
    res.status(status).json({ error: err.message || 'Loi tao thanh toan' });
  }
});

// ============ POST /api/sepay/webhook ============
// SePay IPN — server-to-server callback khi thanh toán hoàn tất
// Khi localhost: cần ngrok để SePay gọi được vào đây
// Đặt BACKEND_URL=https://xxxx.ngrok-free.app trong .env, sau đó chạy:
//   ngrok http 3000
router.post('/webhook', async (req, res) => {
  try {
    console.log('[SePay IPN] Received webhook:', JSON.stringify(req.body, null, 2));

    // ── Xác thực chữ ký HMAC-SHA256 ──
    const signature = req.headers['x-sepay-signature'] || req.body.signature;
    if (signature) {
      // Sắp xếp body theo key rồi tạo chuỗi ký
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
      console.log('[SePay IPN] Signature verified OK');
    } else {
      // Sandbox thường không gửi chữ ký — chỉ warn, không reject
      console.warn('[SePay IPN] No signature header received (OK in sandbox)');
    }

    const { order_invoice_number, transaction_status, transaction_id } = req.body;

    if (!order_invoice_number) {
      return res.status(400).json({ success: false, message: 'Missing invoice number' });
    }

    // Extract numeric orderId từ invoice number, e.g. 'DH123' → 123
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
      console.log(`[SePay IPN] Order #${orderId} marked as COMPLETED`);
    } else {
      await Order.updateStatus(orderId, 'cancelled');
      console.log(`[SePay IPN] Order #${orderId} marked as CANCELLED (status: ${transaction_status})`);
    }

    // SePay yêu cầu trả về HTTP 200 với body này
    return res.status(200).json({ success: true, message: 'IPN received' });
  } catch (err) {
    console.error('[SePay IPN] Error:', err);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
});

module.exports = router;
