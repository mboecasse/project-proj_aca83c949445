// File: src/middleware/rateLimiter.js
// Generated: 2025-10-16 07:49:18 UTC
// Project ID: proj_aca83c949445
// Task ID: task_4owjh11ss1ag


const RedisStore = require('rate-limit-redis');


const config = require('../config/env');


const logger = require('../utils/logger');


const rateLimit = require('express-rate-limit');


const redis = require('redis');

* Provides different rate limit tiers for authentication, API, and public endpoints.
 * Falls back to memory store if Redis is unavailable (development only).
 *
 * @module middleware/rateLimiter
 */

// Redis client instance

let redisClient = null;

let redisConnected = false;

// Store limiter factory functions to create limiters after Redis initialization

let authLimiter = null;

let apiLimiter = null;

let publicLimiter = null;

let strictLimiter = null;

/**
 * Initialize Redis client for rate limiting
 * Handles connection errors gracefully and falls back to memory store
 */


const initializeRedis = async () => {
  if (!config.redis || !config.redis.url) {
    logger.warn('Redis URL not configured, rate limiting will use memory store (not suitable for production)');
    initializeLimiters();
    return;
  }

  try {
    redisClient = redis.createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection limit exceeded');
          }
          return Math.min(retries * 50, 500);
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', { error: err.message });
      redisConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected for rate limiting');
      redisConnected = true;
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
      redisConnected = true;
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis client reconnecting...');
    });

    await redisClient.connect();
    initializeLimiters();
  } catch (error) {
    logger.error('Failed to initialize Redis for rate limiting', { error: error.message });
    logger.warn('Rate limiting will use memory store (not suitable for production with multiple instances)');
    redisClient = null;
    redisConnected = false;
    initializeLimiters();
  }
};

/**
 * Create Redis store with fallback to memory store
 * @param {string} prefix - Prefix for Redis keys
 * @returns {RedisStore|undefined} Redis store or undefined for memory store
 */


const createStoreWithFallback = (prefix) => {
  if (redisClient && redisConnected) {
    try {
      return new RedisStore({
        client: redisClient,
        prefix: prefix,
        sendCommand: (...args) => redisClient.sendCommand(args)
      });
    } catch (error) {
      logger.error('Failed to create Redis store, falling back to memory store', {
        error: error.message,
        prefix
      });
      return undefined;
    }
  }
  return undefined;
};

/**
 * Check if IP is whitelisted
 * @param {Object} req - Express request object
 * @returns {boolean} True if IP should skip rate limiting
 */


const skipRateLimitForWhitelist = (req) => {
  if (!config.security || !config.security.whitelistedIps) {
    return false;
  }

  const whitelistedIPs = config.security.whitelistedIps.split(',').map(ip => ip.trim()).filter(ip => ip);

  if (whitelistedIPs.length === 0) {
    return false;
  }

  const clientIp = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;

  if (!clientIp) {
    return false;
  }

  // Normalize IPv6-mapped IPv4 addresses
  const normalizedIp = clientIp.replace(/^::ffff:/, '');

  return whitelistedIPs.includes(normalizedIp) || whitelistedIPs.includes(clientIp);
};

/**
 * Custom handler for rate limit exceeded
 * Logs violation and sends appropriate response
 */


const rateLimitHandler = (req, res) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    method: req.method,
    userId: req.user?._id || req.userId
  });

  res.status(429).json({
    success: false,
    error: 'Too many requests, please try again later',
    retryAfter: res.getHeader('Retry-After')
  });
};

/**
 * Initialize all rate limiters after Redis connection is established or failed
 */


const initializeLimiters = () => {
  /**
   * Authentication Rate Limiter
   * Strict limits for login, register, and password reset endpoints
   * Prevents brute force attacks
   */
  authLimiter = rateLimit({
    store: createStoreWithFallback('rl:auth:'),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: {
      success: false,
      error: 'Too many authentication attempts, please try again later',
      retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skipSuccessfulRequests: false, // Count all requests
    skip: skipRateLimitForWhitelist,
    handler: rateLimitHandler
  });

  /**
   * API Rate Limiter
   * Moderate limits for general API endpoints
   * Protects against API abuse
   */
  apiLimiter = rateLimit({
    store: createStoreWithFallback('rl:api:'),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 requests per hour
    message: {
      success: false,
      error: 'Too many requests, please try again later',
      retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipRateLimitForWhitelist,
    handler: rateLimitHandler
  });

  /**
   * Public Rate Limiter
   * Lenient limits for public endpoints
   * Basic protection against abuse
   */
  publicLimiter = rateLimit({
    store: createStoreWithFallback('rl:public:'),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per window
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipRateLimitForWhitelist,
    handler: rateLimitHandler
  });

  /**
   * Strict Rate Limiter
   * Very strict limits for sensitive operations
   * Use for password changes, account deletion, etc.
   */
  strictLimiter = rateLimit({
    store: createStoreWithFallback('rl:strict:'),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Only 3 requests per hour
    message: {
      success: false,
      error: 'Too many attempts for this sensitive operation, please try again later',
      retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipRateLimitForWhitelist,
    handler: rateLimitHandler
  });

  logger.info('Rate limiters initialized', { redisConnected });
};

/**
 * Create user-based rate limiter
 * Uses user ID for authenticated requests, falls back to IP for anonymous
 *
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Error message
 * @param {string} options.prefix - Redis key prefix
 * @returns {Function} Express middleware
 */


const createUserBasedLimiter = (options) => {
  const {
    windowMs = 60 * 60 * 1000, // 1 hour default
    max = 100,
    message = 'Too many requests, please try again later',
    prefix = 'rl:user:'
  } = options;

  return rateLimit({
    store: createStoreWithFallback(prefix),
    windowMs,
    max,
    message: {
      success: false,
      error: message
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise fall back to IP
      if (req.user && req.user._id) {
        return `user:${req.user._id}`;
      }
      if (req.userId) {
        return `user:${req.userId}`;
      }
      return `ip:${req.ip}`;
    },
    skip: skipRateLimitForWhitelist,
    handler: rateLimitHandler
  });
};

/**
 * Cleanup function to close Redis connection
 * Should be called on application shutdown
 */


const cleanup = async () => {
  if (redisClient && redisConnected) {
    try {
      await redisClient.quit();
      logger.info('Redis client disconnected');
    } catch (error) {
      logger.error('Error disconnecting Redis client', { error: error.message });
    }
  }
};

/**
 * Middleware wrapper to ensure limiters are initialized
 */


const getLimiterMiddleware = (limiterGetter) => {
  return (req, res, next) => {
    const limiter = limiterGetter();
    if (!limiter) {
      logger.error('Rate limiter not initialized');
      return res.status(500).json({
        success: false,
        error: 'Rate limiting service unavailable'
      });
    }
    return limiter(req, res, next);
  };
};

/**
 * RateLimiter class providing all rate limiting functionality
 */
class RateLimiter {
  constructor() {
    this.authLimiter = getLimiterMiddleware(() => authLimiter);
    this.apiLimiter = getLimiterMiddleware(() => apiLimiter);
    this.publicLimiter = getLimiterMiddleware(() => publicLimiter);
    this.strictLimiter = getLimiterMiddleware(() => strictLimiter);
    this.createUserBasedLimiter = createUserBasedLimiter;
    this.cleanup = cleanup;
    this.initializeRedis = initializeRedis;
  }
}

// Initialize Redis on module load
initializeRedis().catch(error => {
  logger.error('Failed to initialize Redis during module load', { error: error.message });
});

// Handle process termination
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

module.exports = { RateLimiter };
