const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated, verifyJWT } = require('../middleware/auth');
const { validateProfileUpdate, validatePasswordChange } = require('../middleware/validation');

// ============================================
// Web Routes (Session-based)
// ============================================

// Profile
router.get('/profile', isAuthenticated, userController.getProfile);

// Edit profile
router.get('/profile/edit', isAuthenticated, userController.getEditProfile);
router.put('/profile', isAuthenticated, validateProfileUpdate, userController.putUpdateProfile);

// Change password
router.get('/profile/change-password', isAuthenticated, userController.getChangePassword);
router.put('/profile/change-password', isAuthenticated, validatePasswordChange, userController.putChangePassword);

// Delete account
router.delete('/profile', isAuthenticated, userController.deleteAccount);

// ============================================
// API Routes (JWT-based)
// ============================================

// Get current user profile
router.get('/api/profile', verifyJWT, userController.apiGetProfile);

// Update profile
router.put('/api/profile', verifyJWT, validateProfileUpdate, userController.apiUpdateProfile);

module.exports = router;
