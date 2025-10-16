// File: src/utils/logger.js
// Generated: 2025-10-16 07:46:17 UTC
// Project ID: proj_aca83c949445
// Task ID: task_cne0t2s6h1so


const fs = require('fs');


const path = require('path');


const winston = require('winston');

async *   const logger = require('./utils/logger');
 *   logger.info('Message', { metadata });
 *   logger.error('Error occurred', { error: error.message });
 *
 * Log Levels (in order of priority):
 *   - error: Application errors, exceptions, failed operations
 *   - warn: Validation failures, deprecated usage, recoverable issues
 *   - info: Successful operations, user actions, state changes
 *   - http: HTTP request/response logging
 *   - debug: Detailed flow information, database queries
 */

// Ensure logs directory exists


const logsDir = process.env.LOG_DIR || 'logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Deep clone helper to avoid mutating original objects
 */


const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));

  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

/**
 * Recursively sanitize sensitive data from objects
 */


const deepSanitize = (obj, sensitiveKeys) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (obj instanceof Array) return obj.map(item => deepSanitize(item, sensitiveKeys));

  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = deepSanitize(obj[key], sensitiveKeys);
      } else {
        sanitized[key] = obj[key];
      }
    }
  }
  return sanitized;
};

/**
 * Custom format to sanitize sensitive data from logs
 * Removes passwords, tokens, and authorization headers
 */


const sanitizeFormat = winston.format((info) => {
  // Clone the info object to avoid mutating the original
  const clonedInfo = deepClone(info);

  // List of sensitive keys to redact
  const sensitiveKeys = [
    'password',
    'token',
    'accesstoken',
    'refreshtoken',
    'authorization',
    'secret',
    'apikey',
    'api_key',
    'credentials',
    'auth',
    'passwd',
    'pwd'
  ];

  // Deep sanitize the entire cloned object
  return deepSanitize(clonedInfo, sensitiveKeys);
});

/**
 * Determine log level based on environment
 */


const getLogLevel = () => {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
};

/**
 * Create Winston logger instance with multiple transports
 */


const logger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    sanitizeFormat(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'task-management-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error log file - only error level
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),

    // Combined log file - all levels
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],

  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],

  exitOnError: false
});

/**
 * Add console transport for non-production environments
 * Uses colorized and simple format for better readability
 */
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;

        // Add metadata if present
        const metaKeys = Object.keys(meta).filter(key =>
          key !== 'service' &&
          key !== 'environment' &&
          key !== 'timestamp'
        );

        if (metaKeys.length > 0) {
          const metaObj = {};
          metaKeys.forEach(key => {
            metaObj[key] = meta[key];
          });
          msg += ` ${JSON.stringify(metaObj)}`;
        }

        return msg;
      })
    )
  }));
}

/**
 * Stream object for Morgan HTTP logger integration
 * Redirects Morgan output to Winston logger
 */
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

/**
 * Handle logger errors to prevent application crashes
 */
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

/**
 * Capture unhandled promise rejections
 * Log them and optionally exit process in production
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise
  });
});

/**
 * Log process termination signals
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing application');
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing application');
});

module.exports = logger;
