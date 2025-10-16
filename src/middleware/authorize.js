// File: src/middleware/authorize.js
// Generated: 2025-10-16 07:46:52 UTC
// Project ID: proj_aca83c949445
// Task ID: task_vylex4295dvt


const logger = require('../utils/logger');

/**
 * Role hierarchy definition
 * Higher roles inherit permissions from lower roles
 */


const roleHierarchy = {
  admin: ['admin', 'user'],
  user: ['user']
};

/**
 * Authorization middleware factory
 * Creates middleware to check if authenticated user has required role(s)
 *
 * @param {...string|string[]} allowedRoles - One or more roles allowed to access the route
 * @returns {Function} Express middleware function
 *
 * @example
 * // Single role
 * router.get('/admin/users', authenticate, authorize('admin'), controller);
 *
 * @example
 * // Multiple roles
 * router.get('/dashboard', authenticate, authorize('admin', 'user'), controller);
 *
 * @example
 * // Array of roles
 * router.post('/content', authenticate, authorize(['admin', 'manager']), controller);
 */


const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated (req.user should be set by auth middleware)
      if (!req.user) {
        logger.warn('Authorization attempted without authentication', {
          path: req.path,
          method: req.method
        });

        return res.status(401).json({
          success: false,
          message: 'Authentication required to access this resource'
        });
      }

      // Check if user has role property
      if (!req.user.role) {
        logger.error('User object missing role property', {
          userId: req.user._id || req.user.id,
          path: req.path
        });

        return res.status(403).json({
          success: false,
          message: 'User role information is missing'
        });
      }

      // Flatten roles array (handles both string and array inputs)
      const roles = allowedRoles.flat();

      // Get roles that user's role can access based on hierarchy
      const userRole = req.user.role;
      const accessibleRoles = roleHierarchy[userRole] || [userRole];

      // Check if user's role has permission (direct match or hierarchy)
      const hasPermission = roles.some(allowedRole => {
        return accessibleRoles.includes(allowedRole);
      });

      if (!hasPermission) {
        logger.warn('Authorization failed - insufficient permissions', {
          userId: req.user._id || req.user.id,
          userRole: req.user.role,
          requiredRoles: roles,
          path: req.path,
          method: req.method
        });

        return res.status(403).json({
          success: false,
          message: `User role '${req.user.role}' is not authorized to access this resource`
        });
      }

      // User is authorized, proceed to next middleware
      logger.debug('Authorization successful', {
        userId: req.user._id || req.user.id,
        userRole: req.user.role,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Authorization middleware error', {
        error: error.message,
        stack: error.stack,
        path: req.path
      });

      return res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};

/**
 * Middleware to require authentication
 * Alias for common authentication check
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */


const requireAuth = (req, res, next) => {
  if (!req.user) {
    logger.warn('Authentication required but not provided', {
      path: req.path,
      method: req.method
    });

    return res.status(401).json({
      success: false,
      message: 'Authentication required to access this resource'
    });
  }

  next();
};

/**
 * Middleware to check if user is admin
 * Convenience wrapper for admin-only routes
 *
 * @type {Function}
 */


const requireAdmin = authorize('admin');

/**
 * Check if a user has a specific role
 * Utility function for programmatic role checking
 *
 * @param {Object} user - User object with role property
 * @param {string|string[]} roles - Role(s) to check
 * @returns {boolean} True if user has any of the specified roles
 */


const hasRole = (user, roles) => {
  if (!user || !user.role) {
    return false;
  }

  const roleArray = Array.isArray(roles) ? roles : [roles];
  const userRole = user.role;
  const accessibleRoles = roleHierarchy[userRole] || [userRole];

  return roleArray.some(role => {
    return accessibleRoles.includes(role);
  });
};

/**
 * Middleware to check if authenticated user is accessing their own resource
 * Useful for routes where users can only access their own data
 *
 * @param {string} paramName - Name of route parameter containing user ID (default: 'id')
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/users/:id', authenticate, requireOwnership('id'), controller);
 */


const requireOwnership = (paramName = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const resourceUserId = req.params[paramName];
    const currentUserId = req.user._id.toString() || req.user.id.toString();

    // Allow if user is admin or owns the resource
    if (hasRole(req.user, 'admin') || resourceUserId === currentUserId) {
      return next();
    }

    logger.warn('Ownership check failed', {
      userId: currentUserId,
      resourceUserId,
      path: req.path
    });

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to access this resource'
    });
  };
};

/**
 * Middleware to allow access if user is admin OR owns the resource
 * Combines admin check with ownership check
 *
 * @param {string} paramName - Name of route parameter containing user ID
 * @returns {Function} Express middleware function
 */


const requireAdminOrOwnership = (paramName = 'id') => {
  return requireOwnership(paramName);
};

module.exports = {
  authorize,
  requireAuth,
  requireAdmin,
  requireOwnership,
  requireAdminOrOwnership,
  hasRole,
  // Alias for compatibility
  authenticate: requireAuth
};
