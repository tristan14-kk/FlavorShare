const { body, param, query, validationResult } = require('express-validator');

// ============================================
// Validation Error Handler
// ============================================

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // For API requests, return JSON
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }
    
    // For form submissions, store errors in session and redirect back
    req.session.validationErrors = errors.array();
    req.session.oldInput = req.body;
    return res.redirect('back');
  }
  
  next();
};

// ============================================
// User Validation Rules
// ============================================

const validateSignup = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Full name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Full name can only contain letters and spaces'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
  
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),
  
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address'),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  handleValidationErrors
];

const validateProfileUpdate = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Full name must be between 2 and 50 characters'),
  
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Bio cannot exceed 200 characters'),
  
  body('website')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !value.match(/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/)) {
        throw new Error('Please enter a valid URL');
      }
      return true;
    }),
  
  handleValidationErrors
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .matches(/\d/).withMessage('New password must contain at least one number'),
  
  body('confirmNewPassword')
    .notEmpty().withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  handleValidationErrors
];

// ============================================
// Recipe Validation Rules
// ============================================

const validateRecipe = [
  body('title')
    .trim()
    .notEmpty().withMessage('Recipe title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required'),
  
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Beverages'])
    .withMessage('Invalid category selected'),
  
  body('cookingTime')
    .trim()
    .notEmpty().withMessage('Cooking time is required')
    .isLength({ min: 1, max: 50 }).withMessage('Cooking time is too long'),
  
  body('servings')
    .trim()
    .notEmpty().withMessage('Number of servings is required')
    .isLength({ min: 1, max: 50 }).withMessage('Servings is too long'),
  
  body('ingredients')
    .custom((value) => {
      // Handle both array and string inputs
      const ingredients = Array.isArray(value) ? value : [value];
      const filtered = ingredients.filter(i => i && i.trim());
      if (filtered.length === 0) {
        throw new Error('At least one ingredient is required');
      }
      return true;
    }),
  
  body('instructions')
    .custom((value) => {
      const instructions = Array.isArray(value) ? value : [value];
      const filtered = instructions.filter(i => i && i.trim());
      if (filtered.length === 0) {
        throw new Error('At least one instruction step is required');
      }
      return true;
    }),
  
  handleValidationErrors
];

// ============================================
// File Upload Validation
// ============================================

const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return next(); // File is optional
  }

  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only JPEG, PNG, GIF, and WEBP images are allowed.'
    });
  }

  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB.'
    });
  }

  next();
};

// ============================================
// MongoDB ObjectId Validation
// ============================================

const validateObjectId = [
  param('id')
    .isMongoId().withMessage('Invalid ID format'),
  handleValidationErrors
];

// ============================================
// Search/Query Validation
// ============================================

const validateSearchQuery = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Search query too long'),
  
  query('category')
    .optional()
    .isIn(['', 'all', 'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Beverages'])
    .withMessage('Invalid category'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateSignup,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validateRecipe,
  validateFileUpload,
  validateObjectId,
  validateSearchQuery
};
