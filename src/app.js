// File: src/app.js
// Generated: 2025-10-16 07:50:46 UTC
// Project ID: proj_aca83c949445
// Task ID: task_prddn4zfp6cm


const compression = require('compression');


const configureSecurityMiddleware = require('./middleware/security');


const express = require('express');


const logger = require('./utils/logger');


const routes = require('./routes');

const { RateLimiter } = require('./middleware/rateLimiter');

const { errorHandler, notFound } = require('./middleware/errorHandler');

async * This file sets up the complete middleware pipeline in the correct order:
 * 1. Security middleware (helmet, hpp, mongo-sanitize)
 * 2. CORS configuration
 * 3. Body parsing
 * 4. Request logging
 * 5. Rate limiting
 * 6. API routes
 * 7. 404 handler
 * 8. Error handling middleware
 *
 * @module app
 */

// Initialize Express application


const app = express();

// Trust proxy - essential for rate limiting and IP detection behind reverse proxies
app.set('trust proxy', 1);

// Disable x-powered-by header for security
app.disable('x-powered-by');

/**
 * Health check endpoint for monitoring and load balancers
 * Returns application status, timestamp, and uptime
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Configure security middleware
 * Applies helmet, CORS, HPP, and mongo-sanitize
 */
configureSecurityMiddleware(app);

/**
 * Body parsing middleware
 * Parses JSON and URL-encoded data with size limits to prevent DoS attacks
 */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/**
 * Response compression middleware
 * Compresses responses for better performance
 */
app.use(compression());

/**
 * Request logging middleware
 * Logs all incoming requests with method, URL, status, response time, and IP
 */
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
});

/**
 * Rate limiting middleware
 * Applies rate limiting to API routes to prevent abuse
 */


const rateLimiter = new RateLimiter();
app.use('/api/v1', rateLimiter.apiLimiter);

/**
 * Mount API routes
 * All routes are prefixed with /api/v1
 */
app.use('/api/v1', routes);

/**
 * 404 handler for undefined routes
 * Must be placed after all valid routes
 */
app.use(notFound);

/**
 * Global error handling middleware
 * Catches and formats all application errors
 * Must be the last middleware in the stack
 */
app.use(errorHandler);

/**
 * Graceful shutdown handler
 * Handles cleanup when application receives termination signals
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  // Server shutdown will be handled in server.js
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  // Server shutdown will be handled in server.js
});

/**
 * Unhandled promise rejection handler
 * Logs unhandled rejections and exits gracefully
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise,
    reason: reason instanceof Error ? reason.message : reason
  });
});

/**
 * Uncaught exception handler
 * Logs uncaught exceptions and exits gracefully after cleanup
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });

  // Allow time for logging and cleanup before exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Export configured app without starting server
// Server startup is handled in server.js for better testability
module.exports = app;
