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
// VNPay redirects user here after payment — verify & update order
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

    const orderId = vnp_Params.vnp_TxnRef;
    const responseCode = vnp_Params.vnp_ResponseCode;

    if (secureHash === signed) {
      if (responseCode === '00') {
        // Payment successful — update order & grant access
        await Order.updateStatus(Number(orderId), 'completed');
        await Order.logPaymentApproval(Number(orderId), null, 'vnpay_auto', `VNPay thanh toán thành công. TransactionNo: ${vnp_Params.vnp_TransactionNo}`);
        return res.json({ code: '00', message: 'Thanh toán thành công', orderId });
      } else {
        // Payment failed or cancelled
        await Order.updateStatus(Number(orderId), 'cancelled');
        return res.json({ code: responseCode, message: 'Thanh toán thất bại', orderId });
      }
    } else {
      return res.status(400).json({ code: '97', message: 'Chữ ký không hợp lệ' });
    }
  } catch (err) {
    console.error('VNPay return error:', err);
    res.status(500).json({ error: 'Lỗi xử lý kết quả thanh toán' });
  }
});

// ============ GET /api/vnpay/ipn ============
// VNPay IPN callback — server-to-server confirmation
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

    if (secureHash === signed) {
      const orderId = Number(vnp_Params.vnp_TxnRef);
      const responseCode = vnp_Params.vnp_ResponseCode;

      if (responseCode === '00') {
        await Order.updateStatus(orderId, 'completed');
        await Order.logPaymentApproval(orderId, null, 'vnpay_ipn', `VNPay IPN confirmed. TransactionNo: ${vnp_Params.vnp_TransactionNo}`);
      } else {
        await Order.updateStatus(orderId, 'cancelled');
      }

      return res.json({ RspCode: '00', Message: 'success' });
    } else {
      return res.json({ RspCode: '97', Message: 'Fail checksum' });
    }
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
