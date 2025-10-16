// File: src/validators/authValidator.js
// Generated: 2025-10-16 07:47:21 UTC
// Project ID: proj_aca83c949445
// Task ID: task_9n5lx2ymd4ox


const logger = require('../utils/logger');

const { body, validationResult } = require('express-validator');

/**
 * Password complexity regex
 * Requires: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
 */


const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Username regex
 * Allows: letters, numbers, underscores, hyphens
 */


const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Validation rules for user registration
 */


const registerValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email must not exceed 255 characters'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .isLength({ max: 128 }).withMessage('Password must not exceed 128 characters')
    .matches(PASSWORD_REGEX)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'),

  body('confirmPassword')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),

  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .matches(USERNAME_REGEX)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
    .custom((value) => {
      // Prevent reserved usernames
      const reserved = ['admin', 'root', 'system', 'api', 'null', 'undefined'];
      if (reserved.includes(value.toLowerCase())) {
        throw new Error('This username is reserved and cannot be used');
      }
      return true;
    }),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens, and apostrophes')
];

/**
 * Validation rules for user login
 */


const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email must not exceed 255 characters'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 1, max: 128 }).withMessage('Password must not exceed 128 characters')
];

/**
 * Validation rules for password reset request
 */


const resetPasswordRequestValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
];

/**
 * Validation rules for password reset confirmation
 */


const resetPasswordValidation = [
  body('token')
    .notEmpty().withMessage('Reset token is required')
    .isLength({ min: 20 }).withMessage('Invalid reset token format')
    .trim(),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .isLength({ max: 128 }).withMessage('Password must not exceed 128 characters')
    .matches(PASSWORD_REGEX)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'),

  body('confirmPassword')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

/**
 * Validation rules for password change (authenticated user)
 */


const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .isLength({ max: 128 }).withMessage('Password must not exceed 128 characters')
    .matches(PASSWORD_REGEX)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  body('confirmPassword')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

/**
 * Validation rules for refresh token
 */


const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required')
    .trim()
    .isLength({ min: 20 }).withMessage('Invalid refresh token format')
];

/**
 * Validation rules for email verification
 */


const verifyEmailValidation = [
  body('token')
    .notEmpty().withMessage('Verification token is required')
    .trim()
    .isLength({ min: 20 }).withMessage('Invalid verification token format')
];

/**
 * Validation rules for resending verification email
 */


const resendVerificationValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
];

/**
 * Validation rules for updating profile
 */


const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),

  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .matches(USERNAME_REGEX)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
    .custom((value) => {
      const reserved = ['admin', 'root', 'system', 'api', 'null', 'undefined'];
      if (reserved.includes(value.toLowerCase())) {
        throw new Error('This username is reserved and cannot be used');
      }
      return true;
    }),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email must not exceed 255 characters'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Bio must not exceed 500 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Please provide a valid phone number')
];

/**
 * Middleware to handle validation errors
 * Processes validation results and returns formatted error response
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
      message: err.msg,
      value: err.value
    }));

    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: formattedErrors,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: formattedErrors
    });
  }

  next();
};

/**
 * Custom validator to check password strength
 * Can be used as additional validation beyond regex
 *
 * @param {string} password - Password to validate
 * @returns {boolean} - True if password meets strength requirements
 */


const isStrongPassword = (password) => {
  if (!password || password.length < 8) return false;

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);

  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
};

/**
 * Sanitize user input to prevent XSS and injection attacks
 * Note: express-validator already provides basic sanitization
 * This can be extended for additional security measures
 */


const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  // Remove any HTML tags
  return input.replace(/<[^>]*>/g, '');
};

module.exports = {
  registerValidation,
  loginValidation,
  resetPasswordRequestValidation,
  resetPasswordValidation,
  changePasswordValidation,
  refreshTokenValidation,
  verifyEmailValidation,
  resendVerificationValidation,
  updateProfileValidation,
  handleValidationErrors,
  isStrongPassword,
  sanitizeInput
};
