const nodemailer = require('nodemailer');

let transporter;

function normalizeMailPassword(password) {
  return String(password || '').replace(/\s+/g, '');
}

function resolveMailFrom() {
  const from = String(process.env.MAIL_FROM || '').trim();

  if (!from || from.includes('your-email@gmail.com')) {
    return process.env.MAIL_USER;
  }

  return from;
}

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.MAIL_SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.MAIL_SMTP_PORT || 465);
  const secure = process.env.MAIL_SMTP_SECURE
    ? process.env.MAIL_SMTP_SECURE === 'true'
    : port === 465;

  if (!process.env.MAIL_USER || !process.env.MAIL_PASSWORD) {
    const error = new Error('Thiếu cấu hình MAIL_USER hoặc MAIL_PASSWORD');
    error.code = 'MAIL_CONFIG_MISSING';
    throw error;
  }

  const normalizedPassword = normalizeMailPassword(process.env.MAIL_PASSWORD);

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.MAIL_USER,
      pass: normalizedPassword,
    },
  });

  return transporter;
}

function buildOtpEmail({ otpCode, purpose, expiresInMinutes }) {
  const title = purpose === 'register' ? 'Xác minh đăng ký tài khoản' : 'Xác minh đặt lại mật khẩu';
  const action = purpose === 'register' ? 'hoàn tất đăng ký' : 'đặt lại mật khẩu';

  return {
    subject: `[PTIT Learning] ${title}`,
    text: `Ma OTP cua ban la ${otpCode}. Ma co hieu luc trong ${expiresInMinutes} phut. Vui long khong chia se ma nay.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
        <h2 style="margin-bottom: 8px;">${title}</h2>
        <p>Ma OTP de ${action} la:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 16px 0; color: #1d4ed8;">
          ${otpCode}
        </div>
        <p>Ma co hieu luc trong <strong>${expiresInMinutes} phut</strong>.</p>
        <p style="margin-top: 20px; color: #64748b;">
          Neu ban khong yeu cau thao tac nay, vui long bo qua email nay.
        </p>
      </div>
    `,
  };
}

async function sendOtpEmail({ to, otpCode, purpose, expiresInMinutes }) {
  const mailTransporter = getTransporter();
  const from = resolveMailFrom();
  const content = buildOtpEmail({ otpCode, purpose, expiresInMinutes });

  await mailTransporter.sendMail({
    from,
    to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}

module.exports = {
  sendOtpEmail,
};
