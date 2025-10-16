// File: src/config/env.js
// Generated: 2025-10-16 07:46:57 UTC
// Project ID: proj_aca83c949445
// Task ID: task_j9dbmnruq31z


const Joi = require('joi');

/**
 * Environment Configuration
 *
 * Validates all environment variables on application startup using Joi.
 * Application will crash immediately if validation fails.
 *
 * Required variables:
 * - MONGODB_URI: MongoDB connection string
 * - JWT_ACCESS_SECRET: Secret key for JWT access tokens (min 32 characters)
 * - JWT_REFRESH_SECRET: Secret key for JWT refresh tokens (min 32 characters)
 *
 * Optional variables (with defaults):
 * - NODE_ENV: development | production | test (default: development)
 * - PORT: Server port (default: 3000)
 * - JWT_ACCESS_EXPIRY: Access token expiration (default: 15m)
 * - JWT_REFRESH_EXPIRY: Refresh token expiration (default: 7d)
 * - CORS_ORIGIN: CORS allowed origin (default: http://localhost:3000)
 * - RATE_LIMIT_WINDOW_MS: Rate limit window in milliseconds (default: 900000 = 15 minutes)
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 100)
 * - BCRYPT_ROUNDS: Bcrypt salt rounds (default: 10, 1 for test)
 * - LOG_LEVEL: Logging level (default: debug for dev, error for production)
 *
 * See .env.example for complete list
 */


const envSchema = Joi.object({
  // Environment
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development')
    .description('Application environment'),

  // Server
  PORT: Joi.number()
    .port()
    .default(3000)
    .description('Server port number'),

  // Database
  MONGODB_URI: Joi.string()
    .uri()
    .required()
    .description('MongoDB connection string'),

  // JWT Configuration
  JWT_ACCESS_SECRET: Joi.string()
    .min(32)
    .required()
    .description('Secret key for JWT access token signing - must be at least 32 characters'),

  JWT_ACCESS_EXPIRY: Joi.string()
    .pattern(/^[0-9]+(s|m|h|d)$/)
    .default('15m')
    .description('JWT access token expiration time (e.g., 15m, 1h, 7d)'),

  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required()
    .description('Secret key for JWT refresh token signing - must be at least 32 characters'),

  JWT_REFRESH_EXPIRY: Joi.string()
    .pattern(/^[0-9]+(s|m|h|d)$/)
    .default('7d')
    .description('JWT refresh token expiration time (e.g., 15m, 1h, 7d)'),

  // CORS
  CORS_ORIGIN: Joi.string()
    .default('http://localhost:3000')
    .description('CORS allowed origin - use specific URL for security'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .positive()
    .default(900000)
    .description('Rate limit window in milliseconds (default: 15 minutes)'),

  RATE_LIMIT_MAX_REQUESTS: Joi.number()
    .positive()
    .integer()
    .default(100)
    .description('Maximum requests per rate limit window'),

  // Security
  BCRYPT_ROUNDS: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .default(Joi.ref('$NODE_ENV', {
      adjust: (env) => env === 'test' ? 1 : 10
    }))
    .description('Bcrypt salt rounds for password hashing'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default(Joi.ref('$NODE_ENV', {
      adjust: (env) => env === 'production' ? 'error' : 'debug'
    }))
    .description('Logging level'),

  // API Configuration
  API_PREFIX: Joi.string()
    .default('/api')
    .description('API route prefix'),

  // Pagination
  DEFAULT_PAGE_SIZE: Joi.number()
    .integer()
    .positive()
    .default(10)
    .description('Default pagination page size'),

  MAX_PAGE_SIZE: Joi.number()
    .integer()
    .positive()
    .default(100)
    .description('Maximum pagination page size'),

}).unknown(true); // Allow other environment variables but don't validate them

/**
 * Validate environment variables
 * Throws error if validation fails with detailed error messages
 */

const { error, value: envVars } = envSchema.validate(process.env, {
  abortEarly: false, // Show all validation errors at once
  stripUnknown: false, // Keep non-validated environment variables
  context: {
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
});

if (error) {
  const errorMessages = error.details.map(detail => {
    const path = detail.path.join('.');
    return `  • ${path}: ${detail.message}`;
  }).join('\n');

  throw new Error(
    `\n${'='.repeat(80)}\n` +
    `Environment Configuration Error\n` +
    `${'='.repeat(80)}\n\n` +
    `The following environment variables are invalid or missing:\n\n` +
    `${errorMessages}\n\n` +
    `Please check your .env file or environment variables.\n` +
    `See .env.example for reference.\n` +
    `${'='.repeat(80)}\n`
  );
}

/**
 * Validated and typed configuration object
 * Organized by feature/domain for easy access
 */


const config = {
  // Environment
  env: envVars.NODE_ENV,
  isDevelopment: envVars.NODE_ENV === 'development',
  isProduction: envVars.NODE_ENV === 'production',
  isTest: envVars.NODE_ENV === 'test',

  // Server
  port: envVars.PORT,

  // Database
  mongodb: {
    uri: envVars.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },

  // JWT
  jwt: {
    accessSecret: envVars.JWT_ACCESS_SECRET,
    accessExpiry: envVars.JWT_ACCESS_EXPIRY,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshExpiry: envVars.JWT_REFRESH_EXPIRY,
  },

  // CORS
  cors: {
    origin: envVars.CORS_ORIGIN,
    credentials: true,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },

  // Security
  bcryptRounds: envVars.BCRYPT_ROUNDS,

  // Logging
  logLevel: envVars.LOG_LEVEL,

  // API
  apiPrefix: envVars.API_PREFIX,

  // Pagination
  pagination: {
    defaultPageSize: envVars.DEFAULT_PAGE_SIZE,
    maxPageSize: envVars.MAX_PAGE_SIZE,
  },
};

/**
 * Export validated configuration
 * DO NOT export process.env directly - always use this validated config
 */
module.exports = config;

/**
 * Export schema for testing purposes
 * Allows test files to validate custom environment configurations
 */
module.exports.envSchema = envSchema;

/**
 * Export validation function for testing
 * @param {Object} customEnv - Custom environment object to validate
 * @returns {Object} Validated configuration object
 */
module.exports.validateEnv = (customEnv) => {
  const { error, value } = envSchema.validate(customEnv, {
    abortEarly: false,
    stripUnknown: false,
    context: {
      NODE_ENV: customEnv.NODE_ENV || 'development'
    }
  });

  if (error) {
    throw error;
  }

  return value;
};
