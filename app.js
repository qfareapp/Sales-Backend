require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

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
    if (!origin) return cb(null, true); // ✅ allow non-browser (Postman, curl)
    if (rawOrigins.includes(origin)) return cb(null, true);

    try {
      const { hostname } = new URL(origin);
      if (allowVercelPreviews && hostname.endsWith('.vercel.app')) {
        return cb(null, true);
      }
    } catch (_) {}

    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

/* ---------------------- Middleware ---------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ✅ needed for multer + form-data

// ✅ Serve static files (uploads, React build, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Optional: Serve React build if deployed together
// app.use(express.static(path.join(__dirname, 'client', 'build')));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

/* ---------------------- Health ---------------------- */
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* ---------------------- Routes ---------------------- */
const enquiryRoutes = require('./routes/enquiry');
const dailyUpdateRoutes = require('./routes/dailyUpdate');
const productionRoutes = require('./routes/production');
const wagonRoutes = require('./routes/wagons');
const inventoryRoutes = require('./routes/inventory');

app.use('/api/inventory', inventoryRoutes);
app.use('/api/enquiries', enquiryRoutes);   // ⚡ includes milestones & project-summary
app.use('/api/daily-updates', dailyUpdateRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/wagons', wagonRoutes);

/* ---------------------- MongoDB ---------------------- */
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('❌ MONGODB_URI not found in environment.');
  process.exit(1);
}

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
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
