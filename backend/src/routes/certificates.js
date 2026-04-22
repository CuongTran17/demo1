const express = require('express');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const Course = require('../models/Course');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── Font loading ───────────────────────────────────────────────
const FONTS_DIR = path.join(__dirname, '..', '..', 'fonts');
let FONT_REGULAR = null;
let FONT_BOLD = null;
try {
  const r = path.join(FONTS_DIR, 'BeVietnamPro-Regular.ttf');
  const b = path.join(FONTS_DIR, 'BeVietnamPro-Bold.ttf');
  if (fs.existsSync(r) && fs.existsSync(b)) {
    FONT_REGULAR = r;
    FONT_BOLD = b;
  } else {
    console.warn('[Certificate] Vietnamese fonts not found in backend/fonts/ — run: node scripts/download-fonts.js');
  }
} catch {
  console.warn('[Certificate] Could not load Vietnamese fonts');
}

// ── PDF builder ────────────────────────────────────────────────
function buildCertificatePDF(doc, { studentName, courseName, issuedAt }) {
  const W = doc.page.width;
  const H = doc.page.height;

  // Background
  doc.rect(0, 0, W, H).fill('#FFFEF5');

  // Outer border
  doc.rect(18, 18, W - 36, H - 36)
    .lineWidth(3)
    .strokeColor('#667eea')
    .stroke();

  // Inner border
  doc.rect(26, 26, W - 52, H - 52)
    .lineWidth(1)
    .strokeColor('#764ba2')
    .stroke();

  // Top accent bar
  doc.rect(26, 26, W - 52, 6).fill('#667eea');

  // Register fonts
  const regular = FONT_REGULAR || 'Helvetica';
  const bold = FONT_BOLD || 'Helvetica-Bold';
  if (FONT_REGULAR) {
    doc.registerFont('Regular', FONT_REGULAR);
    doc.registerFont('Bold', FONT_BOLD);
  }

  // PTIT LEARNING brand
  doc.font(bold).fontSize(13).fillColor('#667eea')
    .text('PTIT LEARNING', 0, 52, { align: 'center', characterSpacing: 3 });

  // Decorative line
  const lineY = 74;
  doc.moveTo(W / 2 - 120, lineY).lineTo(W / 2 + 120, lineY)
    .lineWidth(1).strokeColor('#764ba2').stroke();

  // Main title
  doc.font(bold).fontSize(22).fillColor('#0f172a')
    .text('CHỨNG NHẬN HOÀN THÀNH KHÓA HỌC', 0, 90, { align: 'center', characterSpacing: 1 });

  // Subtitle
  doc.font(regular).fontSize(13).fillColor('#475569')
    .text('Trân trọng chứng nhận học viên:', 0, 132, { align: 'center' });

  // Student name
  doc.font(bold).fontSize(36).fillColor('#667eea')
    .text(studentName, 60, 158, { align: 'center', width: W - 120 });

  // Middle separator
  const midY = 216;
  doc.moveTo(W / 2 - 80, midY).lineTo(W / 2 + 80, midY)
    .lineWidth(0.5).strokeColor('#cbd5e1').stroke();

  // Completion text
  doc.font(regular).fontSize(13).fillColor('#334155')
    .text('đã hoàn thành xuất sắc khóa học:', 0, 228, { align: 'center' });

  // Course name
  doc.font(bold).fontSize(20).fillColor('#0f172a')
    .text(courseName, 60, 252, { align: 'center', width: W - 120 });

  // Issue date
  const dateStr = new Date(issuedAt).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  doc.font(regular).fontSize(12).fillColor('#64748b')
    .text(`Ngày cấp: ${dateStr}`, 0, H - 80, { align: 'center' });

  // Bottom brand
  doc.font(bold).fontSize(11).fillColor('#667eea')
    .text('PTIT Learning Platform', 0, H - 58, { align: 'center', characterSpacing: 1 });
}

// ── GET /api/certificates/my ───────────────────────────────────
router.get('/my', auth, async (req, res) => {
  try {
    const certs = await Certificate.getByUser(req.user.userId);
    res.json({ certificates: certs });
  } catch (err) {
    console.error('Get my certificates error:', err);
    res.status(500).json({ error: 'Lỗi tải chứng chỉ' });
  }
});

// ── GET /api/certificates/download/:courseId ───────────────────
router.get('/download/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;

    const cert = await Certificate.getByUserAndCourse(req.user.userId, courseId);
    if (!cert) {
      return res.status(404).json({ error: 'Bạn chưa hoàn thành khóa học này' });
    }

    const [user, course] = await Promise.all([
      User.getById(req.user.userId),
      Course.getById(courseId),
    ]);

    const filename = `Certificate_${courseId}_${req.user.userId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    doc.pipe(res);
    buildCertificatePDF(doc, {
      studentName: user.fullname,
      courseName: course.course_name,
      issuedAt: cert.issued_at,
    });
    doc.end();
  } catch (err) {
    console.error('Download certificate error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Lỗi tạo chứng chỉ' });
  }
});

// ── GET /api/certificates/admin/summary ───────────────────────
router.get('/admin/summary', auth, requireRole('admin'), async (req, res) => {
  try {
    const summary = await Certificate.getCourseSummary();
    res.json({ summary });
  } catch (err) {
    console.error('Admin cert summary error:', err);
    res.status(500).json({ error: 'Lỗi tải dữ liệu chứng chỉ' });
  }
});

// ── GET /api/certificates/admin/course/:courseId ───────────────
router.get('/admin/course/:courseId', auth, requireRole('admin'), async (req, res) => {
  try {
    const certs = await Certificate.getByCourse(req.params.courseId);
    res.json({ certificates: certs });
  } catch (err) {
    console.error('Admin cert by course error:', err);
    res.status(500).json({ error: 'Lỗi tải danh sách chứng chỉ' });
  }
});

module.exports = router;
