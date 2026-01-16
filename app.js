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
//app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

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
const bogieInspectionRoutes = require('./routes/bogieInspection.routes');
const bogieAfterWheelRoutes = require('./routes/bogieAfterWheelInspection.routes');
const salesProdRoutes = require('./routes/SalesProd.routes');
const authRoutes = require("./routes/auth.routes");
const equipmentMaintenanceRoutes = require('./routes/equipmentMaintenance.routes');
const equipmentMasterRoutes = require("./routes/equipmentMaster.routes.js");
const dashboardUploadRoutes = require('./routes/dashboardUploads');
const quizRoutes = require("./routes/quiz.routes");

app.use('/api/inventory', inventoryRoutes);
app.use('/api/enquiries', enquiryRoutes);   // ⚡ includes milestones & project-summary
app.use('/api/daily-updates', dailyUpdateRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/wagons', wagonRoutes);
app.use('/api/bogie-inspections', bogieInspectionRoutes);
app.use("/api/bogie-inspections", bogieAfterWheelRoutes)
app.use('/api/sales/production', salesProdRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/maintenance', equipmentMaintenanceRoutes);
app.use('/api/maintenance/equipment-master', equipmentMasterRoutes);
app.use("/api/inventory", require("./routes/equipmentInventory.routes.js"));
app.use('/api/dashboard-uploads', dashboardUploadRoutes);
app.use("/api/quiz", quizRoutes);

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
