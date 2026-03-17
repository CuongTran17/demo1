const crypto = require('crypto');
const EmailOtp = require('../models/EmailOtp');
const { sendOtpEmail } = require('./emailService');

const DEFAULT_EXPIRES_MINUTES = Number(process.env.OTP_EXPIRES_MINUTES || 10);
const DEFAULT_COOLDOWN_SECONDS = Number(process.env.OTP_COOLDOWN_SECONDS || 60);
const DEFAULT_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashOtp({ email, purpose, otpCode }) {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || 'ptit-learning-otp-secret';
  return crypto
    .createHash('sha256')
    .update(`${email}:${purpose}:${otpCode}:${secret}`)
    .digest('hex');
}

function generateOtpCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

async function requestOtp({ email, purpose }) {
  const normalizedEmail = normalizeEmail(email);
  const cooldownRemaining = await EmailOtp.getCooldownRemainingSeconds(
    normalizedEmail,
    purpose,
    DEFAULT_COOLDOWN_SECONDS
  );

  if (cooldownRemaining > 0) {
    const error = new Error(`Vui lòng chờ ${cooldownRemaining} giây trước khi gửi lại OTP`);
    error.code = 'OTP_COOLDOWN';
    error.remainingSeconds = cooldownRemaining;
    throw error;
  }

  const otpCode = generateOtpCode();
  const otpHash = hashOtp({ email: normalizedEmail, purpose, otpCode });

  const otpId = await EmailOtp.create({
    email: normalizedEmail,
    purpose,
    otpHash,
    expiresInMinutes: DEFAULT_EXPIRES_MINUTES,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
  });

  try {
    await sendOtpEmail({
      to: normalizedEmail,
      otpCode,
      purpose,
      expiresInMinutes: DEFAULT_EXPIRES_MINUTES,
    });
  } catch (error) {
    await EmailOtp.deleteById(otpId);
    throw error;
  }

  return {
    expiresInMinutes: DEFAULT_EXPIRES_MINUTES,
    cooldownSeconds: DEFAULT_COOLDOWN_SECONDS,
  };
}

async function verifyOtp({ email, purpose, otpCode }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = String(otpCode || '').trim();

  if (!/^\d{6}$/.test(normalizedOtp)) {
    return { ok: false, reason: 'invalid_format' };
  }

  const record = await EmailOtp.getLatestActive(normalizedEmail, purpose);
  if (!record) {
    return { ok: false, reason: 'not_found' };
  }

  if (record.consumed_at) {
    return { ok: false, reason: 'already_used' };
  }

  if (new Date(record.expires_at).getTime() <= Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  if (Number(record.attempts) >= Number(record.max_attempts)) {
    return { ok: false, reason: 'max_attempts' };
  }

  const expectedHash = hashOtp({ email: normalizedEmail, purpose, otpCode: normalizedOtp });
  const matched = safeEqual(record.otp_hash, expectedHash);

  if (!matched) {
    await EmailOtp.increaseAttempts(record.otp_id);
    return {
      ok: false,
      reason: 'invalid_code',
      remainingAttempts: Math.max(Number(record.max_attempts) - Number(record.attempts) - 1, 0),
    };
  }

  await EmailOtp.markConsumed(record.otp_id);
  return { ok: true };
}

module.exports = {
  requestOtp,
  verifyOtp,
  normalizeEmail,
};
