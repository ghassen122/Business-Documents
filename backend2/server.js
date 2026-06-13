require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const connectDB    = require('./config/db');

const templateRoutes = require('./routes/templates');
const fillRoutes     = require('./routes/fill');
const authRoutes     = require('./routes/auth');
const userRoutes     = require('./routes/user');
const orderRoutes    = require('./routes/orderRouter');
const contactRoutes  = require('./routes/contact');
const invoiceRoutes  = require('./routes/invoice');
const { uploadMiddleware, parseAdmin } = require('./controllers/templateController');

const app  = express();
const PORT = process.env.PORT || 4001;

// ---- Connect to PostgreSQL ----
connectDB();

// ---- Middleware ----
// Raw body MUST be parsed before express.json() for the Stripe webhook route
app.use('/api/orders/webhook', express.raw({ type: 'application/json' }));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '30mb' }));

// ---- Routes ----
app.use('/api/auth',      authRoutes);
app.use('/api/user',      userRoutes);
app.use('/api/orders',    orderRoutes);
app.use('/api/contact',   contactRoutes);
app.post('/api/parse-admin', uploadMiddleware, parseAdmin); // shortcut for admin-ui
app.use('/api/templates', templateRoutes);
app.use('/api/fill',      fillRoutes);
app.use('/api/invoice',   invoiceRoutes);
// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// ---- Start ----
app.listen(PORT, () => {
  console.log(`backend2 running at http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} is already in use.`);
    console.error(`   Run: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT} -State Listen).OwningProcess -Force\n`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
