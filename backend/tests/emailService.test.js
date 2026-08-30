const test = require('node:test');
const assert = require('node:assert/strict');

test('sendOtpEmail sends through Resend when RESEND_API_KEY is configured', async () => {
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.MAIL_FROM = 'PTIT Learning <onboarding@resend.dev>';

  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({ id: 'email-id' }) };
  };

  try {
    const { sendOtpEmail } = require('../src/utils/emailService');
    await sendOtpEmail({
      to: 'student@example.com',
      otpCode: '123456',
      purpose: 'register',
      expiresInMinutes: 10,
    });
  } finally {
    global.fetch = originalFetch;
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer re_test_key');
  assert.match(calls[0].options.body, /student@example\.com/);
  assert.match(calls[0].options.body, /123456/);
});
