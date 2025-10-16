// File: src/routes/authRoutes.js
// Generated: 2025-10-16 07:51:03 UTC
// Project ID: proj_aca83c949445
// Task ID: task_9maj6kpsx93g


const authController = require('../controllers/authController');


const express = require('express');


const logger = require('../utils/logger');

const { RateLimiter } = require('../middleware/rateLimiter');

const { Validator } = require('../middleware/validator');

const { auth } = require('../middleware/auth');

const { csrfProtection } = require('../middleware/csrf');


const router = express.Router();

// Initialize rate limiter


const rateLimiter = new RateLimiter();

/**
 * POST /register
 * Register a new user account
 * Public route with rate limiting and validation
 */
router.post(
  '/register',
  rateLimiter.authLimiter,
  csrfProtection,
  Validator.validateRegister,
  Validator.validate,
  async (req, res, next) => {
    try {
      await authController.register(req, res, next);
    } catch (error) {
      logger.error('Error in POST /auth/register', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }
);

/**
 * POST /login
 * Authenticate user and return tokens
 * Public route with strict rate limiting and validation
 */
router.post(
  '/login',
  rateLimiter.strictLimiter,
  csrfProtection,
  Validator.validateLogin,
  Validator.validate,
  async (req, res, next) => {
    try {
      await authController.login(req, res, next);
    } catch (error) {
      logger.error('Error in POST /auth/login', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }
);

/**
 * POST /logout
 * Logout user and invalidate refresh token
 * Protected route - requires valid access token
 */
router.post('/logout', auth, csrfProtection, async (req, res, next) => {
  try {
    await authController.logout(req, res, next);
  } catch (error) {
    logger.error('Error in POST /auth/logout', {
      error: error.message,
      userId: req.userId
    });
    next(error);
  }
});

/**
 * POST /refresh
 * Generate new access token using refresh token
 * Protected route with moderate rate limiting
 */
router.post(
  '/refresh',
  auth,
  rateLimiter.authLimiter,
  csrfProtection,
  Validator.validateRefreshToken,
  Validator.validate,
  async (req, res, next) => {
    try {
      await authController.refreshToken(req, res, next);
    } catch (error) {
      logger.error('Error in POST /auth/refresh', {
        error: error.message,
        userId: req.userId
      });
      next(error);
    }
  }
);

/**
 * POST /forgot-password
 * Request password reset token
 * Public route with rate limiting to prevent abuse
 */
router.post(
  '/forgot-password',
  rateLimiter.authLimiter,
  csrfProtection,
  Validator.validateEmail,
  Validator.validate,
  async (req, res, next) => {
    try {
      await authController.forgotPassword(req, res, next);
    } catch (error) {
      logger.error('Error in POST /auth/forgot-password', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }
);

/**
 * POST /reset-password
 * Reset password using reset token
 * Public route with validation
 */
router.post(
  '/reset-password',
  rateLimiter.authLimiter,
  csrfProtection,
  Validator.validatePasswordReset,
  Validator.validate,
  async (req, res, next) => {
    try {
      await authController.resetPassword(req, res, next);
    } catch (error) {
      logger.error('Error in POST /auth/reset-password', {
        error: error.message,
        token: req.body.token ? 'provided' : 'missing'
      });
      next(error);
    }
  }
);

/**
 * POST /verify-email
 * Verify user email with verification token
 * Public route with validation
 */
router.post(
  '/verify-email',
  rateLimiter.authLimiter,
  csrfProtection,
  Validator.validateEmailVerification,
  Validator.validate,
  async (req, res, next) => {
    try {
      await authController.verifyEmail(req, res, next);
    } catch (error) {
      logger.error('Error in POST /auth/verify-email', {
        error: error.message,
        token: req.body.token ? 'provided' : 'missing'
      });
      next(error);
    }
  }
);

/**
 * POST /resend-verification
 * Resend email verification token
 * Public route with rate limiting
 */
router.post(
  '/resend-verification',
  rateLimiter.authLimiter,
  csrfProtection,
  Validator.validateEmail,
  Validator.validate,
  async (req, res, next) => {
    try {
      await authController.resendVerification(req, res, next);
    } catch (error) {
      logger.error('Error in POST /auth/resend-verification', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }
);

/**
 * GET /me
 * Get current authenticated user profile
 * Protected route - requires valid access token
 */
router.get('/me', auth, async (req, res, next) => {
  try {
    await authController.getCurrentUser(req, res, next);
  } catch (error) {
    logger.error('Error in GET /auth/me', {
      error: error.message,
      userId: req.userId
    });
    next(error);
  }
});

/**
 * PUT /me
 * Update current authenticated user profile
 * Protected route - requires valid access token
 */
router.put(
  '/me',
  auth,
  csrfProtection,
  Validator.validateProfileUpdate,
  Validator.validate,
  async (req, res, next) => {
    try {
      await authController.updateProfile(req, res, next);
    } catch (error) {
      logger.error('Error in PUT /auth/me', {
        error: error.message,
        userId: req.userId
      });
      next(error);
    }
  }
);

/**
 * POST /change-password
 * Change password for authenticated user
 * Protected route - requires valid access token and current password
 */
router.post(
  '/change-password',
  auth,
  rateLimiter.authLimiter,
  csrfProtection,
  Validator.validatePasswordChange,
  Validator.validate,
  async (req, res, next) => {
    try {
      await authController.changePassword(req, res, next);
    } catch (error) {
      logger.error('Error in POST /auth/change-password', {
        error: error.message,
        userId: req.userId
      });
      next(error);
    }
  }
);

module.exports = router;
