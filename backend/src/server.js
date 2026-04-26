require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { globalLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ CORS ============
const ALLOWED_ORIGINS = new Set(
  [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:4173',
  ].filter(Boolean)
);

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép requests không có origin (mobile apps, curl, Postman)
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' không được phép`));
    }
  },
  credentials: true,
}));

// ============ Rate limiting toàn cục ============
app.use(globalLimiter);

// ============ Body parsing ============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ============ Routes ============
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/sepay', require('./routes/sepay'));
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/flash-sales', require('./routes/flashSales'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/quizzes', require('./routes/quizzes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ Start Server ============
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 PTIT Learning API server running on http://localhost:${PORT}`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/health`);
  console.log(`🔒 CORS allowed origins: ${[...ALLOWED_ORIGINS].join(', ')}`);
});
