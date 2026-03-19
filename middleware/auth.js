const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ============================================
// Session-based Authentication Middleware
// ============================================

// Check if user is authenticated (session-based)
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  
  // Check for JWT token in header (for API access)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return verifyJWT(req, res, next);
  }
  
  res.redirect('/login');
};

// Check if user is a guest (not logged in)
const isGuest = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/home');
  }
  next();
};

// Make user data available to all views
const setUserLocals = async (req, res, next) => {
  res.locals.user = null;
  res.locals.isAuthenticated = false;
  res.locals.isAdmin = false;
  res.locals.googleAuthAvailable = process.env.GOOGLE_CLIENT_ID && 
                                    process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id';
  
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      if (user) {
        res.locals.user = user;
        res.locals.isAuthenticated = true;
        res.locals.isAdmin = user.role === 'admin';
      }
    } catch (error) {
      console.error('Error fetching user for locals:', error);
    }
  }
  next();
};

// ============================================
// JWT Token-based Authentication
// ============================================

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET || 'flavorshare-jwt-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Verify JWT token middleware
const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'flavorshare-jwt-secret');
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. User not found.' 
      });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please login again.' 
      });
    }
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

// ============================================
// Role-Based Access Control (RBAC)
// ============================================

// Check if user has admin role
const isAdmin = (req, res, next) => {
  if (req.session && req.session.userRole === 'admin') {
    return next();
  }
  
  // For API requests
  if (req.user && req.user.role === 'admin') {
    return next();
  }

  // Return 403 Forbidden
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin privileges required.' 
    });
  }
  
  res.status(403).render('pages/error', {
    title: 'Access Denied',
    message: 'You do not have permission to access this page. Admin privileges required.'
  });
};

// Check if user has specific role(s)
const hasRole = (...roles) => {
  return (req, res, next) => {
    const userRole = req.session?.userRole || req.user?.role;
    
    if (!userRole || !roles.includes(userRole)) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(403).json({ 
          success: false, 
          message: `Access denied. Required role: ${roles.join(' or ')}` 
        });
      }
      
      return res.status(403).render('pages/error', {
        title: 'Access Denied',
        message: 'You do not have permission to perform this action.'
      });
    }
    
    next();
  };
};

// Check resource ownership (user can only modify their own resources)
const isOwnerOrAdmin = (model) => {
  return async (req, res, next) => {
    try {
      const resource = await model.findById(req.params.id);
      
      if (!resource) {
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
          return res.status(404).json({ 
            success: false, 
            message: 'Resource not found.' 
          });
        }
        return res.status(404).render('pages/error', {
          title: 'Not Found',
          message: 'The requested resource was not found.'
        });
      }

      const userId = req.session?.userId || req.user?._id;
      const userRole = req.session?.userRole || req.user?.role;
      const resourceOwnerId = resource.author || resource.user || resource._id;

      // Allow if user is owner or admin
      if (resourceOwnerId.toString() === userId.toString() || userRole === 'admin') {
        req.resource = resource;
        return next();
      }

      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You can only modify your own resources.' 
        });
      }
      
      res.status(403).render('pages/error', {
        title: 'Access Denied',
        message: 'You do not have permission to modify this resource.'
      });
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  isAuthenticated,
  isGuest,
  setUserLocals,
  generateToken,
  verifyJWT,
  isAdmin,
  hasRole,
  isOwnerOrAdmin
};
