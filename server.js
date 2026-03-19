// ============================================
// FlavorShare - Main Server (MS2)
// ============================================
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override');
const path = require('path');
const passport = require('passport');
const helmet = require('helmet');
const morgan = require('morgan');

// Config imports
const connectDB = require('./config/db');
const { initializePassport } = require('./config/passport');

// Middleware imports
const { setUserLocals } = require('./middleware/auth');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const userRoutes = require('./routes/userRoutes');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Security Middleware (Helmet.js)
// ============================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://accounts.google.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ============================================
// Request Logging (Morgan)
// ============================================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ============================================
// Connect to MongoDB
// ============================================
connectDB();

// ============================================
// Body Parsers & Static Files
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// Session Configuration
// ============================================
app.use(session({
  secret: process.env.SESSION_SECRET || 'flavorshare-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60,
    touchAfter: 24 * 3600
  }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// ============================================
// Passport (Google OAuth)
// ============================================
app.use(passport.initialize());
app.use(passport.session());
initializePassport();

// ============================================
// Global Middleware
// ============================================
app.use(setUserLocals);

// ============================================
// View Engine
// ============================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============================================
// Routes
// ============================================
app.use('/', authRoutes);
app.use('/', recipeRoutes);
app.use('/', userRoutes);

// Landing Page
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/home');
  }
  res.render('pages/landing', {
    title: 'FlavorShare - Share Your Culinary Journey'
  });
});

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================
// Error Handling
// ============================================
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║   🍽️  FlavorShare running at http://localhost:${PORT}     ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED REJECTION:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  process.exit(1);
});
