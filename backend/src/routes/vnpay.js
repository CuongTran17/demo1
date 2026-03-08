const express = require('express');
const crypto = require('crypto');
const qs = require('qs');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { auth } = require('../middleware/auth');

const router = express.Router();

// ============ VNPay Configuration ============
const VNP_TMN_CODE = process.env.VNP_TMN_CODE || '';
const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || '';
const VNP_URL = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNP_RETURN_URL = process.env.VNP_RETURN_URL || 'http://localhost:5173/checkout/vnpay-return';

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
  }
  return sorted;
}

// ============ POST /api/vnpay/create-payment ============
// Creates order from cart & returns VNPay redirect URL
router.post('/create-payment', auth, async (req, res) => {
  try {
    const { bankCode, language } = req.body;

    // 1. Get cart items
    const cartItems = await Cart.getUserCart(req.user.userId);
    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Giỏ hàng trống' });
    }

    const totalAmount = cartItems.reduce((sum, c) => sum + Number(c.price), 0);

    // 2. Create order in DB with status 'pending_payment'
    const orderId = await Order.create(req.user.userId, cartItems, 'vnpay', 'Thanh toán qua VNPay');

    // 3. Build VNPay payment URL
    const date = new Date();
    const createDate = dateToVnpFormat(date);
    const expireDate = dateToVnpFormat(new Date(date.getTime() + 15 * 60 * 1000)); // 15 min

    const ipAddr = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';

    let vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: VNP_TMN_CODE,
      vnp_Locale: language || 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: String(orderId),
      vnp_OrderInfo: `Thanh toan don hang #${orderId}`,
      vnp_OrderType: 'other',
      vnp_Amount: totalAmount * 100, // VNPay requires amount * 100
      vnp_ReturnUrl: VNP_RETURN_URL,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    if (bankCode) {
      vnp_Params.vnp_BankCode = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnp_Params.vnp_SecureHash = signed;

    const paymentUrl = `${VNP_URL}?${qs.stringify(vnp_Params, { encode: false })}`;

    res.json({
      message: 'Tạo thanh toán thành công',
      paymentUrl,
      orderId,
    });
  } catch (err) {
    console.error('VNPay create payment error:', err);
    res.status(500).json({ error: 'Lỗi tạo thanh toán' });
  }
});

// ============ GET /api/vnpay/return ============
// VNPay redirects user here after payment
// Verify signature, check order, update if still pending (idempotent)
router.get('/return', async (req, res) => {
  try {
    let vnp_Params = { ...req.query };
    const secureHash = vnp_Params.vnp_SecureHash;

    delete vnp_Params.vnp_SecureHash;
    delete vnp_Params.vnp_SecureHashType;

    vnp_Params = sortObject(vnp_Params);
    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash !== signed) {
      return res.status(400).json({ code: '97', message: 'Chữ ký không hợp lệ' });
    }

    const orderId = Number(vnp_Params.vnp_TxnRef);
    const responseCode = vnp_Params.vnp_ResponseCode;
    const vnpAmount = Number(vnp_Params.vnp_Amount) / 100; // VNPay sends amount * 100

    // Get current order from DB
    const order = await Order.getById(orderId);
    if (!order) {
      return res.status(404).json({ code: '01', message: 'Đơn hàng không tồn tại' });
    }

    // Verify amount matches
    if (Number(order.total_amount) !== vnpAmount) {
      return res.json({ code: '04', message: 'Số tiền không khớp', orderId });
    }

    // If order already processed, just return current status
    if (order.status === 'completed') {
      return res.json({ code: '00', message: 'Thanh toán thành công', orderId });
    }
    if (order.status === 'cancelled' || order.status === 'rejected') {
      return res.json({ code: '02', message: 'Đơn hàng đã bị hủy', orderId });
    }

    // Only update if order is still pending_payment
    if (order.status === 'pending_payment') {
      if (responseCode === '00') {
        // Payment confirmed by VNPay
        await Order.updateStatus(orderId, 'completed');
        await Order.logPaymentApproval(orderId, null, 'vnpay_return', `VNPay thanh toán thành công. TransactionNo: ${vnp_Params.vnp_TransactionNo || ''}`);
        return res.json({ code: '00', message: 'Thanh toán thành công', orderId });
      } else {
        // Payment failed or user cancelled
        await Order.updateStatus(orderId, 'cancelled');
        await Order.logPaymentApproval(orderId, null, 'vnpay_cancelled', `VNPay trả về mã lỗi: ${responseCode}`);
        return res.json({ code: responseCode, message: 'Thanh toán thất bại', orderId });
      }
    }

    // Fallback: order in unexpected status
    return res.json({ code: responseCode, message: 'Trạng thái đơn hàng không hợp lệ', orderId });
  } catch (err) {
    console.error('VNPay return error:', err);
    res.status(500).json({ error: 'Lỗi xử lý kết quả thanh toán' });
  }
});

// ============ GET /api/vnpay/ipn ============
// VNPay IPN (Instant Payment Notification) — server-to-server callback
// This is the AUTHORITATIVE source of truth for payment confirmation
router.get('/ipn', async (req, res) => {
  try {
    let vnp_Params = { ...req.query };
    const secureHash = vnp_Params.vnp_SecureHash;

    delete vnp_Params.vnp_SecureHash;
    delete vnp_Params.vnp_SecureHashType;

    vnp_Params = sortObject(vnp_Params);
    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // 1. Verify checksum
    if (secureHash !== signed) {
      console.warn('VNPay IPN: Invalid checksum');
      return res.json({ RspCode: '97', Message: 'Fail checksum' });
    }

    const orderId = Number(vnp_Params.vnp_TxnRef);
    const responseCode = vnp_Params.vnp_ResponseCode;
    const vnpAmount = Number(vnp_Params.vnp_Amount) / 100;

    // 2. Check order exists
    const order = await Order.getById(orderId);
    if (!order) {
      console.warn(`VNPay IPN: Order #${orderId} not found`);
      return res.json({ RspCode: '01', Message: 'Order not found' });
    }

    // 3. Verify amount
    if (Number(order.total_amount) !== vnpAmount) {
      console.warn(`VNPay IPN: Amount mismatch for order #${orderId}. Expected ${order.total_amount}, got ${vnpAmount}`);
      return res.json({ RspCode: '04', Message: 'Invalid amount' });
    }

    // 4. Check if order already processed (idempotency)
    if (order.status !== 'pending_payment') {
      console.info(`VNPay IPN: Order #${orderId} already processed (status: ${order.status})`);
      return res.json({ RspCode: '02', Message: 'Order already confirmed' });
    }

    // 5. Process payment result
    if (responseCode === '00') {
      await Order.updateStatus(orderId, 'completed');
      await Order.logPaymentApproval(orderId, null, 'vnpay_ipn', `VNPay IPN xác nhận thành công. TransactionNo: ${vnp_Params.vnp_TransactionNo || ''}`);
      console.info(`VNPay IPN: Order #${orderId} completed successfully`);
    } else {
      await Order.updateStatus(orderId, 'cancelled');
      await Order.logPaymentApproval(orderId, null, 'vnpay_ipn_failed', `VNPay IPN trả về mã lỗi: ${responseCode}`);
      console.info(`VNPay IPN: Order #${orderId} cancelled (code: ${responseCode})`);
    }

    return res.json({ RspCode: '00', Message: 'success' });
  } catch (err) {
    console.error('VNPay IPN error:', err);
    return res.json({ RspCode: '99', Message: 'Unknown error' });
  }
});

// ============ Helper ============
function dateToVnpFormat(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

module.exports = router;
