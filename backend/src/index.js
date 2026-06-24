require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/company');
const groupRoutes = require('./routes/group');
const ledgerRoutes = require('./routes/ledger');
const stockRoutes = require('./routes/stock');
const voucherRoutes = require('./routes/voucher');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
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


// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`SmartERP backend running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
});
