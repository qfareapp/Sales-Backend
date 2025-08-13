// Load environment variables from .env
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import routes
const enquiryRoutes = require('./routes/enquiry');
const dailyUpdateRoutes = require('./routes/dailyUpdate');
const productionRoutes = require('./routes/production');
const wagonRoutes = require('./routes/wagons');
const inventoryRoutes = require('./routes/inventory');

const app = express();

/* ---------------------- CORS (env-driven, Vercel-friendly) ---------------------- */
const rawOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
// Set ALLOW_VERCEL_PREVIEWS=true to allow any *.vercel.app preview URL
const allowVercelPreviews = String(process.env.ALLOW_VERCEL_PREVIEWS || '').toLowerCase() === 'true';

app.use(cors({
  origin: (origin, cb) => {
    // Allow non-browser requests (e.g., curl, server-to-server)
    if (!origin) return cb(null, true);

    if (rawOrigins.includes(origin)) return cb(null, true);

    try {
      const { hostname } = new URL(origin);
      if (allowVercelPreviews && hostname.endsWith('.vercel.app')) {
        return cb(null, true);
      }
    } catch (_) { /* ignore parse errors */ }

    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json());

// Static uploads (note: use persistent disk or cloud storage in prod)
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

/* ---------------------- Request logger (optional) ---------------------- */
app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

/* ---------------------- Health check ---------------------- */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

/* ---------------------- API routes ---------------------- */
app.use('/api/inventory', inventoryRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/daily-updates', dailyUpdateRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/wagons', wagonRoutes);

/* ---------------------- MongoDB connection ---------------------- */
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

/* ---------------------- Start server ---------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
