const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');
const { isGuest, isAuthenticated } = require('../middleware/auth');
const { validateLogin, validateSignup } = require('../middleware/validation');
const { isGoogleAuthAvailable } = require('../config/passport');

// ============================================
// Web Routes (Session-based)
// ============================================

// Login
router.get('/login', isGuest, authController.getLogin);
router.post('/login', isGuest, validateLogin, authController.postLogin);

// Signup
router.get('/signup', isGuest, authController.getSignup);
router.post('/signup', isGuest, validateSignup, authController.postSignup);

// Logout
router.post('/logout', isAuthenticated, authController.logout);

// ============================================
// Google OAuth Routes
// ============================================

// Initiate Google OAuth
router.get('/auth/google', isGuest, (req, res, next) => {
  if (!isGoogleAuthAvailable()) {
    req.session.validationErrors = [{ msg: 'Google authentication is not configured' }];
    return res.redirect('/login');
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// Google OAuth callback
router.get('/auth/google/callback', 
  (req, res, next) => {
    if (!isGoogleAuthAvailable()) {
      return res.redirect('/login');
    }
    passport.authenticate('google', { 
      failureRedirect: '/login',
      failureMessage: true 
    })(req, res, next);
  },
  authController.googleCallback
);

// ============================================
// API Routes (JWT-based)
// ============================================

// API Login - returns JWT token
router.post('/api/auth/login', validateLogin, authController.apiLogin);

// API Signup - returns JWT token
router.post('/api/auth/signup', validateSignup, authController.apiSignup);

module.exports = router;
