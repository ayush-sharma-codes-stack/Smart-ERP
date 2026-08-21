require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');

const { runMigrations } = require('./db/migrate');

const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/company');
const groupRoutes = require('./routes/group');
const ledgerRoutes = require('./routes/ledger');
const stockRoutes = require('./routes/stock');
const voucherRoutes = require('./routes/voucher');
const reportsRoutes = require('./routes/reports');
const customerRoutes = require('./routes/customer');
const invoiceRoutes = require('./routes/invoice');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS allowed origins dynamically
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    return callback(new Error('CORS Policy violation: Origin not allowed - ' + origin));
  },
  credentials: true,
};

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Base Route & Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// App Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/ledgers', ledgerRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Auto-run DB Migrations and Start Server
async function startServer() {
  try {
    if (process.env.DATABASE_URL) {
      console.log('Running database migrations...');
      await runMigrations(false);
    } else {
      console.warn('DATABASE_URL is not set. Skipping automated migrations.');
    }
  } catch (err) {
    console.error('Failed to run auto-migrations:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`SmartERP backend running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

startServer();
