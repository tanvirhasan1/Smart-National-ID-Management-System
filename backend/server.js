const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
// const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/db');
require('./models/User');
require('./models/Application');
require('./models/Appointment');
require('./models/SupportTicket');
require('./models/Center');
require('./models/AuditLog');

const appointmentRoutes = require('./routes/appointments');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const applicationRoutes = require('./routes/applications');
const supportRoutes = require('./routes/support');
const cookieParser = require('cookie-parser');

const app = express();

// connect database
connectDB();

// trust proxy for production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// basic security
app.use(helmet());

const allowedOrigins = Array.from(
  new Set([
    'http://localhost:3000',
    'http://localhost:5173',
    ...(process.env.FRONTEND_URL || '')
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean)
  ])
);

// cors config
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, '');

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true
  })
);

// testing purpose only
// rate limit fully disabled
/*
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});
app.use('/api/', limiter);
*/

// body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// cookie parser
app.use(cookieParser());

// logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// root route
app.get('/', (req, res) => {
  res.send('Smart NID Backend is running');
});

// health route
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend server is healthy'
  });
});

// api routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/support', supportRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});