// File: src/utils/apiResponse.js
// Generated: 2025-10-16 07:46:42 UTC
// Project ID: proj_aca83c949445
// Task ID: task_p2bkzkn3sw9t


const logger = require('./logger');

/**
 * ApiResponse class
 * Provides static methods for standardized API responses
 */
class ApiResponse {
  /**
   * Send success response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {String} message - Success message
   * @param {Number} statusCode - HTTP status code (default: 200)
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Express response
   */
  static success(res, data = null, message = 'Success', statusCode = 200, metadata = {}) {
    if (!res || typeof res.status !== 'function') {
      throw new TypeError('Invalid response object: res parameter must be a valid Express response object');
    }

    const response = {
      success: true,
      statusCode,
      message,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };

    logger.info('API Success Response', {
      statusCode,
      message,
      hasData: !!data
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {Number} statusCode - HTTP status code (default: 500)
   * @param {Object} errorDetails - Additional error details
   * @returns {Object} Express response
   */
  static error(res, message = 'Internal Server Error', statusCode = 500, errorDetails = null) {
    if (!res || typeof res.status !== 'function') {
      throw new TypeError('Invalid response object: res parameter must be a valid Express response object');
    }

    const response = {
      success: false,
      statusCode,
      message,
      metadata: {
        timestamp: new Date().toISOString()
      }
    };

    if (errorDetails) {
      response.error = {
        type: errorDetails.name || 'Error',
        details: errorDetails.details || errorDetails.message
      };

      // Include stack trace only in development
      if (process.env.NODE_ENV === 'development' && errorDetails.stack) {
        response.error.stack = errorDetails.stack;
      }
    }

    logger.error('API Error Response', {
      statusCode,
      message,
      errorType: errorDetails?.name
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Send paginated response
   * @param {Object} res - Express response object
   * @param {Array} data - Response data array
   * @param {Number} page - Current page number
   * @param {Number} limit - Items per page
   * @param {Number} total - Total number of items
   * @param {String} message - Success message
   * @returns {Object} Express response
   */
  static paginated(res, data, page, limit, total, message = 'Success') {
    if (!res || typeof res.status !== 'function') {
      throw new TypeError('Invalid response object: res parameter must be a valid Express response object');
    }

    if (!Array.isArray(data)) {
      throw new TypeError('Invalid data parameter: data must be an array');
    }

    if (page === undefined || page === null) {
      throw new TypeError('Invalid page parameter: page is required');
    }

    if (limit === undefined || limit === null) {
      throw new TypeError('Invalid limit parameter: limit is required');
    }

    if (total === undefined || total === null) {
      throw new TypeError('Invalid total parameter: total is required');
    }

    const currentPage = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const totalItems = parseInt(total) || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    const response = {
      success: true,
      statusCode: 200,
      message,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        pagination: {
          currentPage,
          pageSize,
          totalItems,
          totalPages,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1
        }
      }
    };

    logger.info('API Paginated Response', {
      currentPage,
      pageSize,
      totalItems,
      totalPages
    });

    return res.status(200).json(response);
  }

  /**
   * Send created resource response (201)
   * @param {Object} res - Express response object
   * @param {*} data - Created resource data
   * @param {String} message - Success message
   * @returns {Object} Express response
   */
  static created(res, data, message = 'Resource created successfully') {
    return ApiResponse.success(res, data, message, 201);
  }

  /**
   * Send no content response (204)
   * @param {Object} res - Express response object
   * @returns {Object} Express response
   */
  static noContent(res) {
    if (!res || typeof res.status !== 'function') {
      throw new TypeError('Invalid response object: res parameter must be a valid Express response object');
    }

    logger.info('API No Content Response', { statusCode: 204 });
    return res.status(204).send();
  }

  /**
   * Send not found response (404)
   * @param {Object} res - Express response object
   * @param {String} resource - Resource name that was not found
   * @returns {Object} Express response
   */
  static notFound(res, resource = 'Resource') {
    return ApiResponse.error(
      res,
      `${resource} not found`,
      404,
      { name: 'NotFoundError', message: `The requested ${resource.toLowerCase()} could not be found` }
    );
  }

  /**
   * Send validation error response (400)
   * @param {Object} res - Express response object
   * @param {Array|Object} errors - Validation errors
   * @returns {Object} Express response
   */
  static validationError(res, errors) {
    if (!res || typeof res.status !== 'function') {
      throw new TypeError('Invalid response object: res parameter must be a valid Express response object');
    }

    const errorArray = Array.isArray(errors) ? errors : [errors];

    const response = {
      success: false,
      statusCode: 400,
      message: 'Validation failed',
      error: {
        type: 'ValidationError',
        details: errorArray
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    };

    logger.warn('API Validation Error', {
      errorCount: errorArray.length,
      errors: errorArray
    });

    return res.status(400).json(response);
  }

  /**
   * Send unauthorized response (401)
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @returns {Object} Express response
   */
  static unauthorized(res, message = 'Authentication required') {
    return ApiResponse.error(
      res,
      message,
      401,
      { name: 'UnauthorizedError', message }
    );
  }

  /**
   * Send forbidden response (403)
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @returns {Object} Express response
   */
  static forbidden(res, message = 'Access forbidden') {
    return ApiResponse.error(
      res,
      message,
      403,
      { name: 'ForbiddenError', message }
    );
  }

  /**
   * Send internal server error response (500)
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   * @returns {Object} Express response
   */
  static serverError(res, error = null) {
    const message = process.env.NODE_ENV === 'development'
      ? (error?.message || 'Internal server error')
      : 'Internal server error';

    return ApiResponse.error(
      res,
      message,
      500,
      error
    );
  }

  /**
   * Send bad request response (400)
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {Object} details - Additional error details
   * @returns {Object} Express response
   */
  static badRequest(res, message = 'Bad request', details = null) {
    return ApiResponse.error(
      res,
      message,
      400,
      details ? { name: 'BadRequestError', details } : null
    );
  }

  /**
   * Send conflict response (409)
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @returns {Object} Express response
   */
  static conflict(res, message = 'Resource conflict') {
    return ApiResponse.error(
      res,
      message,
      409,
      { name: 'ConflictError', message }
    );
  }

  /**
   * Send custom response with specific status code
   * @param {Object} res - Express response object
   * @param {Number} statusCode - HTTP status code
   * @param {Boolean} success - Success flag
   * @param {String} message - Response message
   * @param {*} data - Response data
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Express response
   */
  static custom(res, statusCode, success, message, data = null, metadata = {}) {
    if (!res || typeof res.status !== 'function') {
      throw new TypeError('Invalid response object: res parameter must be a valid Express response object');
    }

    const response = {
      success,
      statusCode,
      message,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };

    if (data !== null) {
      response.data = data;
    }

    logger.info('API Custom Response', {
      statusCode,
      success,
      message
    });

    return res.status(statusCode).json(response);
  }
}

module.exports = ApiResponse;
