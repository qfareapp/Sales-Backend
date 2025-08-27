require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Routes
const enquiryRoutes = require('./routes/enquiry');
const dailyUpdateRoutes = require('./routes/dailyUpdate');
const productionRoutes = require('./routes/production');
const wagonRoutes = require('./routes/wagons');
const inventoryRoutes = require('./routes/inventory');

const app = express();

/* ---------------------- CORS ---------------------- */
const rawOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const allowVercelPreviews = String(process.env.ALLOW_VERCEL_PREVIEWS || '')
  .toLowerCase() === 'true';

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // non-browser requests
    if (rawOrigins.includes(origin)) return cb(null, true);

    try {
      const { hostname } = new URL(origin);
      if (allowVercelPreviews && hostname.endsWith('.vercel.app')) {
        return cb(null, true);
      }
    } catch (_) {}

    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

/* ---------------------- Middleware ---------------------- */
app.use(express.json());

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

/* ---------------------- Health ---------------------- */
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* ---------------------- Routes ---------------------- */
app.use('/api/inventory', inventoryRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/daily-updates', dailyUpdateRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/wagons', wagonRoutes);

/* ---------------------- MongoDB ---------------------- */
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('❌ MONGODB_URI not found in environment.');
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

/* ---------------------- Error handler ---------------------- */
app.use((err, req, res, _next) => {
  console.error('❌ Server Error:', err.message);
  res.status(err.status || 500).json({ status: 'Error', message: err.message });
});

/* ---------------------- Start ---------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});
