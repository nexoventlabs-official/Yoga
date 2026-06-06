require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhook');
const flowEndpointRoutes = require('./routes/flowEndpoint');
const usersRoutes = require('./routes/users');
const eventsRoutes = require('./routes/events');
const enquiriesRoutes = require('./routes/enquiries');
const flowImagesRoutes = require('./routes/flowImages');
const dashboardRoutes = require('./routes/dashboard');
const pdfsRoutes = require('./routes/pdfs');
const programsRoutes = require('./routes/programs');
const batchesRoutes = require('./routes/batches');
const bookingsRoutes = require('./routes/bookings');
const sequencesRoutes = require('./routes/sequences');
const broadcastsRoutes = require('./routes/broadcasts');
const offersRoutes = require('./routes/offers');
const faqsRoutes = require('./routes/faqs');
const paymentRoutes = require('./routes/payment');

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }
      return cb(new Error('CORS blocked: ' + origin));
    },
    credentials: true,
  })
);

app.use(
  express.json({
    limit: '5mb',
    verify: (req, _res, buf) => {
      if (req.originalUrl && req.originalUrl.startsWith('/api/webhook/meta')) {
        req.rawBody = buf.toString();
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (_req, res) =>
  res.json({ name: 'Himalayan Yoga Academy API', status: 'ok', time: new Date().toISOString() })
);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/flow-endpoint', flowEndpointRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/enquiries', enquiriesRoutes);
app.use('/api/flow-images', flowImagesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/pdfs', pdfsRoutes);
app.use('/api/programs', programsRoutes);
app.use('/api/batches', batchesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/sequences', sequencesRoutes);
app.use('/api/broadcasts', broadcastsRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/faqs', faqsRoutes);
app.use('/api/payment', paymentRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }));
app.use((err, _req, res, _next) => {
  console.error('[ErrorHandler]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '5000', 10);

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not configured');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('[Mongo] connected');
  } catch (err) {
    console.error('[Mongo] connection failed:', err.message);
    process.exit(1);
  }

  // Seed default admin
  try {
    const Admin = require('./models/Admin');
    const bcrypt = require('bcryptjs');
    const count = await Admin.countDocuments();
    if (count === 0) {
      const username = process.env.ADMIN_USERNAME || 'admin';
      const password = process.env.ADMIN_PASSWORD || 'admin';
      const passwordHash = await bcrypt.hash(password, 10);
      await Admin.create({ username, passwordHash });
      console.log(`[Seed] Default admin created: ${username}`);
    }
  } catch (err) {
    console.warn('[Seed] admin seed skipped:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`[Server] http://localhost:${PORT}`);
  });
}

start();
