// File: src/middleware/validator.js
// Generated: 2025-10-16 07:47:15 UTC
// Project ID: proj_aca83c949445
// Task ID: task_cegj7byuvclh


const logger = require('../utils/logger');

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 * Extracts validation errors and returns formatted response
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */


const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg
    }));

    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: formattedErrors
    });

    return res.status(400).json({
      success: false,
      errors: formattedErrors
    });
  }

  next();
};

/**
 * Reusable validation chains for common fields
 */

// Email validation


const validateEmail = body('email')
  .trim()
  .notEmpty().withMessage('Email is required')
  .isEmail().withMessage('Must be a valid email address');

// Password validation for registration


const validatePassword = body('password')
  .notEmpty().withMessage('Password is required')
  .isLength({ min: 8, max: 72 }).withMessage('Password must be between 8 and 72 characters')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number');

// Username validation


const validateUsername = body('username')
  .trim()
  .notEmpty().withMessage('Username is required')
  .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
  .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores');

/**
 * User Registration Validation
 * Validates username, email, and password for new user registration
 */


const validateRegister = [
  validateUsername,
  validateEmail,
  validatePassword,
  body('confirmPassword')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * User Login Validation
 * Validates email and password for user login
 */


const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ max: 72 }).withMessage('Password exceeds maximum length'),
  handleValidationErrors
];

/**
 * Task Creation Validation
 * Validates all fields required for creating a new task
 */


const validateCreateTask = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 100 }).withMessage('Title must not exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
  body('status')
    .optional()
    .isIn(['todo', 'in-progress', 'completed'])
    .withMessage('Status must be one of: todo, in-progress, completed'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),
  body('dueDate')
    .optional()
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Due date cannot be in the past');
      }
      return true;
    }),
  body('assignedTo')
    .optional()
    .isMongoId().withMessage('Assigned user ID must be a valid MongoDB ObjectId'),
  handleValidationErrors
];

/**
 * Task Update Validation
 * Validates fields for updating an existing task (all fields optional)
 */


const validateUpdateTask = [
  param('id')
    .isMongoId().withMessage('Invalid task ID format'),
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: 100 }).withMessage('Title must not exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
  body('status')
    .optional()
    .isIn(['todo', 'in-progress', 'completed'])
    .withMessage('Status must be one of: todo, in-progress, completed'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),
  body('dueDate')
    .optional()
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Due date cannot be in the past');
      }
      return true;
    }),
  body('assignedTo')
    .optional()
    .isMongoId().withMessage('Assigned user ID must be a valid MongoDB ObjectId'),
  handleValidationErrors
];

/**
 * Task ID Parameter Validation
 * Validates MongoDB ObjectId in route parameters
 */


const validateTaskId = [
  param('id')
    .isMongoId().withMessage('Invalid task ID format'),
  handleValidationErrors
];

/**
 * User ID Parameter Validation
 * Validates MongoDB ObjectId for user routes
 */


const validateUserId = [
  param('id')
    .isMongoId().withMessage('Invalid user ID format'),
  handleValidationErrors
];

/**
 * Pagination Query Validation
 * Validates page and limit query parameters
 */


const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  handleValidationErrors
];

/**
 * Task Filter Query Validation
 * Validates query parameters for filtering tasks
 */


const validateTaskFilters = [
  query('status')
    .optional()
    .isIn(['todo', 'in-progress', 'completed'])
    .withMessage('Status must be one of: todo, in-progress, completed'),
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),
  query('dueBefore')
    .optional()
    .isISO8601().withMessage('dueBefore must be a valid ISO 8601 date'),
  query('dueAfter')
    .optional()
    .isISO8601().withMessage('dueAfter must be a valid ISO 8601 date'),
  query('assignedTo')
    .optional()
    .isMongoId().withMessage('assignedTo must be a valid MongoDB ObjectId'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  handleValidationErrors
];

/**
 * User Update Validation
 * Validates fields for updating user profile
 */


const validateUpdateUser = [
  param('id')
    .isMongoId().withMessage('Invalid user ID format'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Must be a valid email address'),
  body('currentPassword')
    .optional()
    .notEmpty().withMessage('Current password is required when changing password')
    .isLength({ max: 72 }).withMessage('Password exceeds maximum length'),
  body('newPassword')
    .optional()
    .isLength({ min: 8, max: 72 }).withMessage('New password must be between 8 and 72 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
    .custom((value, { req }) => {
      if (value && !req.body.currentPassword) {
        throw new Error('Current password is required when setting new password');
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Task Assignment Validation
 * Validates task assignment to users
 */


const validateTaskAssignment = [
  param('id')
    .isMongoId().withMessage('Invalid task ID format'),
  body('assignedTo')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID format'),
  handleValidationErrors
];

/**
 * Generic validate middleware
 * Can be used as standalone validator in routes
 */


const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg
    }));

    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: formattedErrors
    });

    return res.status(400).json({
      success: false,
      errors: formattedErrors
    });
  }

  next();
};


const Validator = {
  // Main validation middleware
  validate,
  handleValidationErrors,

  // User validation
  validateRegister,
  validateLogin,
  validateUpdateUser,
  validateUserId,

  // Task validation
  validateCreateTask,
  validateUpdateTask,
  validateTaskId,
  validateTaskAssignment,

  // Query validation
  validatePagination,
  validateTaskFilters,

  // Reusable validation chains
  validateEmail,
  validatePassword,
  validateUsername
};

module.exports = { Validator };
