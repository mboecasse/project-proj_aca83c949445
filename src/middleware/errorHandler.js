// File: src/middleware/errorHandler.js
// Generated: 2025-10-16 07:47:58 UTC
// Project ID: proj_aca83c949445
// Task ID: task_35ylxw5fybzf


const logger = require('../utils/logger');

/**
 * Custom Application Error Class
 * Used for operational errors with specific status codes
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Mongoose CastError (Invalid ObjectId)
 * @param {Error} err - The error object
 * @returns {Object} - Formatted error response
 */


const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return { statusCode: 400, message };
};

/**
 * Handle Mongoose ValidationError
 * @param {Error} err - The error object
 * @returns {Object} - Formatted error response with field-specific errors
 */


const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(e => ({
    field: e.path,
    message: e.message
  }));

  const message = 'Validation failed';
  return { statusCode: 400, message, errors };
};

/**
 * Handle MongoDB Duplicate Key Error (11000)
 * @param {Error} err - The error object
 * @returns {Object} - Formatted error response
 */


const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyPattern)[0];
  const value = err.keyValue[field];
  const message = `${field} '${value}' already exists`;
  return { statusCode: 409, message };
};

/**
 * Handle JWT JsonWebTokenError
 * @returns {Object} - Formatted error response
 */


const handleJWTError = () => {
  const message = 'Invalid token. Please login again';
  return { statusCode: 401, message };
};

/**
 * Handle JWT TokenExpiredError
 * @returns {Object} - Formatted error response
 */


const handleJWTExpiredError = () => {
  const message = 'Token expired. Please login again';
  return { statusCode: 401, message };
};

/**
 * Handle Multer File Upload Errors
 * @param {Error} err - The error object
 * @returns {Object} - Formatted error response
 */


const handleMulterError = (err) => {
  let message = 'File upload error';
  let statusCode = 400;

  if (err.code === 'LIMIT_FILE_SIZE') {
    message = 'File size exceeds the allowed limit';
  } else if (err.code === 'LIMIT_FILE_COUNT') {
    message = 'Too many files uploaded';
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    message = 'Unexpected file field';
  }

  return { statusCode, message };
};

/**
 * Sanitize error message for production
 * Removes sensitive information that could expose system details
 * @param {string} message - Original error message
 * @returns {string} - Sanitized message
 */


const sanitizeErrorMessage = (message) => {
  if (!message || typeof message !== 'string') {
    return 'An error occurred';
  }

  if (process.env.NODE_ENV === 'production') {
    // Remove database field names and technical details
    const sanitized = message
      .replace(/Path `.*?`/g, 'Field')
      .replace(/index: .*? dup key/g, 'duplicate key')
      .replace(/Collection\..*?/g, 'Collection')
      .replace(/\$.*?:/g, 'field:')
      .replace(/MongoError:/g, 'Database error:')
      .replace(/E11000.*?index:/g, 'Duplicate value for')
      .replace(/dup key: \{.*?\}/g, 'duplicate key')
      .replace(/at .*?\(.*?\)/g, '')
      .replace(/\n\s+at .*/g, '')
      .trim();

    return sanitized || 'An error occurred';
  }
  return message;
};

/**
 * Main Error Handler Middleware
 * Catches all errors and sends appropriate response
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */


const errorHandler = (err, req, res, next) => {
  // Default error values
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error with context
  logger.error('Error occurred', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.userId || req.user?._id,
    body: process.env.NODE_ENV === 'development' ? req.body : undefined,
    params: req.params,
    query: req.query,
    statusCode: error.statusCode
  });

  // Transform specific error types
  if (err.name === 'CastError') {
    const transformed = handleCastError(err);
    error.statusCode = transformed.statusCode;
    error.message = transformed.message;
  }

  if (err.name === 'ValidationError') {
    const transformed = handleValidationError(err);
    error.statusCode = transformed.statusCode;
    error.message = transformed.message;
    error.errors = transformed.errors;
  }

  if (err.code === 11000) {
    const transformed = handleDuplicateKeyError(err);
    error.statusCode = transformed.statusCode;
    error.message = transformed.message;
  }

  if (err.name === 'JsonWebTokenError') {
    const transformed = handleJWTError();
    error.statusCode = transformed.statusCode;
    error.message = transformed.message;
  }

  if (err.name === 'TokenExpiredError') {
    const transformed = handleJWTExpiredError();
    error.statusCode = transformed.statusCode;
    error.message = transformed.message;
  }

  if (err.name === 'MulterError') {
    const transformed = handleMulterError(err);
    error.statusCode = transformed.statusCode;
    error.message = transformed.message;
  }

  // Handle express-validator errors
  if (err.array && typeof err.array === 'function') {
    error.statusCode = 400;
    error.message = 'Validation failed';
    error.errors = err.array();
  }

  // Sanitize error message for production
  const sanitizedMessage = sanitizeErrorMessage(error.message);

  // Build error response
  const errorResponse = {
    success: false,
    error: {
      message: sanitizedMessage,
      statusCode: error.statusCode
    }
  };

  // Add field-specific errors if available
  if (error.errors) {
    errorResponse.error.errors = error.errors;
  }

  // Include stack trace and original message only in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.originalMessage = err.message;
  }

  // Send error response
  res.status(error.statusCode).json(errorResponse);
};

/**
 * 404 Not Found Handler
 * Catches requests to undefined routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */


const notFound = (req, res, next) => {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404
  );

  logger.warn('Route not found', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  next(error);
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch promise rejections
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function
 */


const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Handle Uncaught Exceptions
 * Log and exit gracefully
 */
process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', {
    error: error.message,
    stack: error.stack
  });

  process.exit(1);
});

/**
 * Handle Unhandled Promise Rejections
 * Log and exit gracefully
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', {
    reason: reason,
    promise: promise
  });

  process.exit(1);
});

module.exports = {
  errorHandler,
  notFound,
  AppError,
  asyncHandler
};
