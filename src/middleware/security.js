// File: src/middleware/security.js
// Generated: 2025-10-16 07:46:14 UTC
// Project ID: proj_aca83c949445
// Task ID: task_chn7nt1zcwkd


const cors = require('cors');


const helmet = require('helmet');


const hpp = require('hpp');


const mongoSanitize = require('express-mongo-sanitize');


const rateLimit = require('express-rate-limit');

/**
 * Configure security middleware for the Express application
 * Implements multiple layers of security:
 * - Helmet: Sets various HTTP headers for security
 * - CORS: Manages cross-origin resource sharing
 * - HPP: Protects against HTTP Parameter Pollution attacks
 * - MongoSanitize: Prevents MongoDB injection attacks
 * - Rate Limiting: Protects against brute force and DoS attacks
 *
 * @param {Object} app - Express application instance
 */


const configureSecurityMiddleware = (app) => {
  // Configure Helmet with security headers
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      // HTTP Strict Transport Security
      hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
      },
      // Prevent clickjacking
      frameguard: {
        action: 'deny',
      },
      // Hide X-Powered-By header
      hidePoweredBy: true,
      // Prevent MIME type sniffing
      noSniff: true,
      // Enable XSS filter
      xssFilter: true,
    })
  );

  // Configure CORS
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

  const corsOptions = {
    origin: (origin, callback) => {
      // Require origin header for security - reject requests without origin
      if (!origin) {
        callback(new Error('Origin header required'));
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies to be sent
    optionsSuccessStatus: 200, // For legacy browser support
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours preflight cache
  };

  app.use(cors(corsOptions));

  // Configure rate limiting to prevent brute force and DoS attacks
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs for auth endpoints
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
  });

  // Apply general rate limiting to all requests
  app.use(generalLimiter);

  // Apply stricter rate limiting to authentication endpoints
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);

  // Protect against HTTP Parameter Pollution attacks
  // Whitelist parameters that are allowed to be arrays
  app.use(
    hpp({
      whitelist: [
        'tags',
        'status',
        'priority',
        'assignedTo',
        'sort',
        'fields',
      ],
    })
  );

  // Sanitize data to prevent MongoDB injection attacks
  app.use(
    mongoSanitize({
      replaceWith: '_', // Replace prohibited characters with underscore
      onSanitize: ({ req, key }) => {
        // Log sanitization attempts for security monitoring
        if (process.env.NODE_ENV !== 'test') {
          console.warn(`[Security] Sanitized key "${key}" in request from ${req.ip}`);
        }
      },
    })
  );
};

module.exports = configureSecurityMiddleware;
