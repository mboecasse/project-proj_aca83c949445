// File: src/services/tokenService.js
// Generated: 2025-10-16 07:48:56 UTC
// Project ID: proj_aca83c949445
// Task ID: task_g3dxiypqhnvb


const config = require('../config/env');


const crypto = require('crypto');


const jwt = require('jsonwebtoken');


const logger = require('../utils/logger');

/**
 * Custom error classes for token operations
 */
class TokenExpiredError extends Error {
  constructor(message = 'Token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
    this.statusCode = 401;
  }
}

class InvalidTokenError extends Error {
  constructor(message = 'Invalid token') {
    super(message);
    this.name = 'InvalidTokenError';
    this.statusCode = 401;
  }
}

class ConfigurationError extends Error {
  constructor(message = 'Invalid configuration') {
    super(message);
    this.name = 'ConfigurationError';
    this.statusCode = 500;
  }
}

/**
 * TokenService class for JWT and refresh token management
 */
class TokenService {
  constructor() {
    this.ALLOWED_ALGORITHMS = ['HS256'];
    this.MIN_SECRET_LENGTH = 32;
    this._validateConfiguration();
  }

  /**
   * Validate JWT configuration on initialization
   * @private
   * @throws {ConfigurationError}
   */
  _validateConfiguration() {
    if (!config || !config.jwt) {
      throw new ConfigurationError('JWT configuration is missing');
    }

    // Validate access secret
    if (!config.jwt.accessSecret || typeof config.jwt.accessSecret !== 'string') {
      throw new ConfigurationError('JWT access secret is not configured');
    }

    if (config.jwt.accessSecret.length < this.MIN_SECRET_LENGTH) {
      throw new ConfigurationError(
        `JWT access secret must be at least ${this.MIN_SECRET_LENGTH} characters long`
      );
    }

    // Check for weak/default secrets
    const weakSecrets = [
      'secret',
      'your-secret-key',
      'change-me',
      'default',
      'password',
      '12345678',
      'test-secret'
    ];

    if (weakSecrets.some(weak => config.jwt.accessSecret.toLowerCase().includes(weak))) {
      throw new ConfigurationError('JWT secret appears to be a default or weak value');
    }

    // Validate refresh secret if present
    if (config.jwt.refreshSecret) {
      if (typeof config.jwt.refreshSecret !== 'string') {
        throw new ConfigurationError('JWT refresh secret must be a string');
      }

      if (config.jwt.refreshSecret.length < this.MIN_SECRET_LENGTH) {
        throw new ConfigurationError(
          `JWT refresh secret must be at least ${this.MIN_SECRET_LENGTH} characters long`
        );
      }
    }

    // Validate algorithm if specified
    if (Not exported in config && !this.ALLOWED_ALGORITHMS.includes(Not exported in config)) {
      throw new ConfigurationError(
        `JWT algorithm must be one of: ${this.ALLOWED_ALGORITHMS.join(', ')}`
      );
    }

    // Validate expiry settings
    if (!config.jwt.accessExpiry) {
      throw new ConfigurationError('JWT access expiry is not configured');
    }

    if (!config.jwt.refreshExpiry) {
      throw new ConfigurationError('JWT refresh expiry is not configured');
    }

    logger.info('JWT configuration validated successfully');
  }

  /**
   * Get validated algorithm
   * @private
   * @returns {string}
   */
  _getAlgorithm() {
    return this.ALLOWED_ALGORITHMS[0]; // Always use HS256
  }

  /**
   * Generate JWT access token
   * @param {Object} payload - User data to encode { userId, email, role }
   * @returns {string} JWT token
   */
  generateAccessToken(payload) {
    try {
      const { userId, email, role } = payload;

      if (!userId || !email) {
        throw new Error('userId and email are required for token generation');
      }

      const tokenPayload = {
        userId,
        email,
        role: role || 'user'
      };

      const token = jwt.sign(
        tokenPayload,
        config.jwt.accessSecret,
        {
          expiresIn: config.jwt.accessExpiry,
          algorithm: this._getAlgorithm()
        }
      );

      logger.debug('Generated access token', { userId, email });

      return token;
    } catch (error) {
      logger.error('Failed to generate access token', {
        error: error.message,
        payload: { userId: payload?.userId, email: payload?.email }
      });
      throw error;
    }
  }

  /**
   * Generate cryptographically secure refresh token
   * @param {string} userId - User ID
   * @returns {Promise<Object>} { token, expiresAt }
   */
  async generateRefreshToken(userId) {
    try {
      if (!userId) {
        throw new Error('userId is required for refresh token generation');
      }

      // Generate cryptographically secure random token
      const token = crypto.randomBytes(40).toString('hex');

      // Calculate expiration date (default 7 days)
      const expiresIn = config.jwt.refreshExpiry || '7d';
      const expiresAt = this._calculateExpiration(expiresIn);

      logger.debug('Generated refresh token', {
        userId,
        expiresAt,
        tokenPreview: `${token.substring(0, 8)}...`
      });

      return {
        token,
        expiresAt,
        userId
      };
    } catch (error) {
      logger.error('Failed to generate refresh token', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Verify and decode JWT access token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   * @throws {TokenExpiredError|InvalidTokenError}
   */
  verifyAccessToken(token) {
    try {
      if (!token) {
        throw new InvalidTokenError('Token is required');
      }

      const decoded = jwt.verify(token, config.jwt.accessSecret, {
        algorithms: this.ALLOWED_ALGORITHMS
      });

      logger.debug('Verified access token', {
        userId: decoded.userId,
        email: decoded.email
      });

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.warn('Access token expired', {
          tokenPreview: token ? `${token.substring(0, 10)}...` : 'none'
        });
        throw new TokenExpiredError();
      }

      if (error.name === 'JsonWebTokenError') {
        logger.warn('Invalid access token', {
          error: error.message,
          tokenPreview: token ? `${token.substring(0, 10)}...` : 'none'
        });
        throw new InvalidTokenError(error.message);
      }

      logger.error('Token verification failed', { error: error.message });
      throw new InvalidTokenError('Token verification failed');
    }
  }

  /**
   * Verify refresh token
   * @param {string} token - Refresh token to verify
   * @param {string} storedToken - Stored token from database
   * @param {Date} expiresAt - Token expiration date
   * @returns {boolean} True if valid
   * @throws {TokenExpiredError|InvalidTokenError}
   */
  verifyRefreshToken(token, storedToken, expiresAt) {
    try {
      if (!token) {
        throw new InvalidTokenError('Refresh token is required');
      }

      if (!this.isValidRefreshTokenFormat(token)) {
        throw new InvalidTokenError('Invalid refresh token format');
      }

      if (!storedToken) {
        throw new InvalidTokenError('Refresh token not found');
      }

      // Use timing-safe comparison to prevent timing attacks
      if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken))) {
        throw new InvalidTokenError('Refresh token does not match');
      }

      if (this.isTokenExpired(expiresAt)) {
        throw new TokenExpiredError('Refresh token has expired');
      }

      logger.debug('Verified refresh token');
      return true;
    } catch (error) {
      if (error instanceof TokenExpiredError || error instanceof InvalidTokenError) {
        throw error;
      }

      logger.error('Refresh token verification failed', { error: error.message });
      throw new InvalidTokenError('Refresh token verification failed');
    }
  }

  /**
   * Decode token without verification (for debugging/logging only)
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded payload or null
   */
  decodeTokenWithoutVerification(token) {
    try {
      if (!token) {
        return null;
      }

      const decoded = jwt.decode(token);
      return decoded;
    } catch (error) {
      logger.debug('Failed to decode token', { error: error.message });
      return null;
    }
  }

  /**
   * Extract user information from token
   * @param {string} token - JWT token
   * @returns {Object|null} User info or null
   */
  extractUserFromToken(token) {
    try {
      const decoded = this.verifyAccessToken(token);
      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    } catch (error) {
      logger.debug('Failed to extract user from token', { error: error.message });
      return null;
    }
  }

  /**
   * Validate token format (basic check before verification)
   * @param {string} token - Token to validate
   * @returns {boolean} True if format is valid
   */
  isValidTokenFormat(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // JWT format: header.payload.signature
    const parts = token.split('.');
    return parts.length === 3;
  }

  /**
   * Calculate expiration date from expiry string
   * @private
   * @param {string} expiryString - Expiry string (e.g., '7d', '24h', '15m')
   * @returns {Date} Expiration date
   */
  _calculateExpiration(expiryString) {
    const now = new Date();

    // Parse expiry string (e.g., '7d', '24h', '15m')
    const match = expiryString.match(/^(\d+)([smhd])$/);

    if (!match) {
      // Default to 7 days if invalid format
      logger.warn('Invalid expiry format, defaulting to 7 days', { expiryString });
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const [, amount, unit] = match;
    const value = parseInt(amount, 10);

    const multipliers = {
      s: 1000,                    // seconds
      m: 60 * 1000,              // minutes
      h: 60 * 60 * 1000,         // hours
      d: 24 * 60 * 60 * 1000     // days
    };

    const milliseconds = value * multipliers[unit];
    return new Date(now.getTime() + milliseconds);
  }

  /**
   * Check if token is expired
   * @param {Date} expiresAt - Expiration date
   * @returns {boolean} True if expired
   */
  isTokenExpired(expiresAt) {
    if (!expiresAt) {
      return true;
    }

    const now = new Date();
    const expiration = new Date(expiresAt);

    return expiration <= now;
  }

  /**
   * Get token expiration info
   * @param {string} token - JWT token
   * @returns {Object|null} { exp, iat, isExpired, expiresIn }
   */
  getTokenExpirationInfo(token) {
    try {
      const decoded = this.decodeTokenWithoutVerification(token);

      if (!decoded || !decoded.exp) {
        return null;
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - now;

      return {
        exp: decoded.exp,
        iat: decoded.iat,
        isExpired: expiresIn <= 0,
        expiresIn: expiresIn > 0 ? expiresIn : 0,
        expiresAt: new Date(decoded.exp * 1000)
      };
    } catch (error) {
      logger.debug('Failed to get token expiration info', { error: error.message });
      return null;
    }
  }

  /**
   * Create token pair (access + refresh)
   * @param {Object} payload - User data
   * @returns {Promise<Object>} { accessToken, refreshToken, expiresAt }
   */
  async createTokenPair(payload) {
    try {
      const accessToken = this.generateAccessToken(payload);
      const refreshTokenData = await this.generateRefreshToken(payload.userId);

      logger.info('Created token pair', {
        userId: payload.userId,
        email: payload.email
      });

      return {
        accessToken,
        refreshToken: refreshTokenData.token,
        refreshTokenExpiresAt: refreshTokenData.expiresAt
      };
    } catch (error) {
      logger.error('Failed to create token pair', {
        error: error.message,
        userId: payload?.userId
      });
      throw error;
    }
  }

  /**
   * Validate refresh token format
   * @param {string} token - Refresh token
   * @returns {boolean} True if valid format
   */
  isValidRefreshTokenFormat(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Refresh tokens are hex strings (80 characters for 40 bytes)
    return /^[a-f0-9]{80}$/i.test(token);
  }
}

// Export singleton instance
module.exports = new TokenService();
