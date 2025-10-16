// File: src/middleware/auth.js
// Generated: 2025-10-16 07:49:03 UTC
// Project ID: proj_aca83c949445
// Task ID: task_tjo416mx6t8f


const User = require('../models/User');


const config = require('../config/env');


const jwt = require('jsonwebtoken');


const logger = require('../utils/logger');

// Token blacklist for revoked tokens (in production, use Redis or database)


const tokenBlacklist = new Set();

/**
 * Add token to blacklist
 * @param {string} token - JWT token to blacklist
 */


const blacklistToken = (token) => {
  tokenBlacklist.add(token);
};

/**
 * Check if token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {boolean}
 */


const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

/**
 * Authentication middleware - verifies JWT token and attaches user to request
 * @middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */


const auth = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      logger.warn('Authentication failed: No Authorization header provided');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Invalid Authorization header format');
      return res.status(401).json({
        success: false,
        error: 'Invalid token format. Use Bearer token'
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      logger.warn('Authentication failed: Empty token provided');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      logger.warn('Authentication failed: Token has been revoked');
      return res.status(401).json({
        success: false,
        error: 'Token has been revoked'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.accessSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.warn('Authentication failed: Token expired', {
          expiredAt: error.expiredAt
        });
        return res.status(401).json({
          success: false,
          error: 'Token expired'
        });
      }

      if (error.name === 'JsonWebTokenError') {
        logger.warn('Authentication failed: Invalid token', {
          error: error.message
        });
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }

      logger.error('Authentication failed: JWT verification error', {
        error: error.message
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }

    // Fetch user from database (excluding password)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      logger.warn('Authentication failed: User not found', {
        userId: decoded.id
      });
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Attach user and token to request object for downstream use
    req.user = user;
    req.userId = user._id;
    req.token = token;

    logger.debug('Authentication successful', {
      userId: user._id.toString(),
      email: user.email
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error during authentication'
    });
  }
};

/**
 * Optional authentication middleware - attempts to authenticate but doesn't fail if token is missing
 * Useful for routes that have different behavior for authenticated vs unauthenticated users
 * @middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */


const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    // If no token provided, continue without authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug('Optional auth: No token provided, continuing without authentication');
      return next();
    }

    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return next();
    }

    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      logger.debug('Optional auth: Token has been revoked');
      return next();
    }

    // Try to verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.accessSecret);
    } catch (error) {
      // Log but don't fail - just continue without authentication
      logger.debug('Optional auth: Token verification failed', {
        error: error.message
      });
      return next();
    }

    // Try to fetch user
    const user = await User.findById(decoded.id).select('-password');

    if (user) {
      req.user = user;
      req.userId = user._id;
      req.token = token;
      logger.debug('Optional auth: User authenticated', {
        userId: user._id.toString()
      });
    } else {
      logger.debug('Optional auth: User not found', {
        userId: decoded.id
      });
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error', {
      error: error.message
    });
    // Don't fail - continue without authentication
    next();
  }
};

/**
 * Role-based authorization middleware
 * Checks if authenticated user has required role(s)
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */


const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        logger.warn('Authorization failed: No authenticated user');
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (!req.user.role) {
        logger.warn('Authorization failed: User has no role', {
          userId: req.user._id.toString()
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Authorization failed: Insufficient permissions', {
          userId: req.user._id.toString(),
          userRole: req.user.role,
          requiredRoles: allowedRoles
        });
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      logger.debug('Authorization successful', {
        userId: req.user._id.toString(),
        role: req.user.role
      });

      next();
    } catch (error) {
      logger.error('Authorization middleware error', {
        error: error.message
      });
      return res.status(500).json({
        success: false,
        error: 'Internal server error during authorization'
      });
    }
  };
};

/**
 * Middleware to require authentication (alias for auth)
 * Provides clearer semantic meaning in route definitions
 */


const requireAuth = auth;

/**
 * Middleware to attach user if authenticated (alias for optionalAuth)
 * Provides clearer semantic meaning in route definitions
 */


const authenticate = auth;

module.exports = {
  auth,
  optionalAuth,
  authorize,
  requireAuth,
  authenticate,
  blacklistToken,
  isTokenBlacklisted
};
