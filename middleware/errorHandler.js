// ============================================
// Centralized Error Handling Middleware
// ============================================

// Custom Error Class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================
// Error Types
// ============================================

// 400 Bad Request
const badRequest = (message = 'Bad Request') => new AppError(message, 400);

// 401 Unauthorized
const unauthorized = (message = 'Unauthorized. Please login.') => new AppError(message, 401);

// 403 Forbidden
const forbidden = (message = 'Access denied. You do not have permission.') => new AppError(message, 403);

// 404 Not Found
const notFound = (message = 'Resource not found.') => new AppError(message, 404);

// 409 Conflict
const conflict = (message = 'Resource already exists.') => new AppError(message, 409);

// 422 Unprocessable Entity
const unprocessable = (message = 'Invalid input data.') => new AppError(message, 422);

// 500 Internal Server Error
const serverError = (message = 'Internal server error.') => new AppError(message, 500);

// ============================================
// Async Handler Wrapper
// ============================================

// Wraps async functions to catch errors
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ============================================
// 404 Not Found Handler
// ============================================

const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Cannot find ${req.originalUrl} on this server`, 404);
  next(error);
};

// ============================================
// Global Error Handler
// ============================================

const globalErrorHandler = (err, req, res, next) => {
  // Set defaults
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  err.message = err.message || 'Something went wrong';

  // Log error for debugging (in development)
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ ERROR:', {
      status: err.statusCode,
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method
    });
  } else {
    // In production, only log critical errors
    if (err.statusCode >= 500) {
      console.error('❌ SERVER ERROR:', err.message);
    }
  }

  // Handle specific error types
  let error = { ...err };
  error.message = err.message;

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    error = new AppError('Invalid ID format', 400);
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new AppError(`${field} already exists. Please use a different value.`, 409);
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    error = new AppError(messages.join('. '), 400);
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please login again.', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired. Please login again.', 401);
  }

  // Multer File Upload Errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('File too large. Maximum size is 5MB.', 400);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new AppError('Unexpected file upload field.', 400);
  }

  // Send response based on content type
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    // API response
    return res.status(error.statusCode || 500).json({
      success: false,
      status: error.status,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // HTML response for browser requests
  res.status(error.statusCode || 500).render('pages/error', {
    title: getErrorTitle(error.statusCode),
    message: error.message,
    statusCode: error.statusCode
  });
};

// Helper to get error title based on status code
const getErrorTitle = (statusCode) => {
  const titles = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Access Denied',
    404: 'Page Not Found',
    409: 'Conflict',
    422: 'Validation Error',
    500: 'Server Error'
  };
  return titles[statusCode] || 'Error';
};

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  serverError,
  asyncHandler,
  notFoundHandler,
  globalErrorHandler
};
