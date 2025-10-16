// File: src/services/redisService.js
// Generated: 2025-10-16 07:49:41 UTC
// Project ID: proj_aca83c949445
// Task ID: task_z8i2ijtg8ava


const config = require('../config/env');


const logger = require('../utils/logger');


const redis = require('ioredis');

/**
 * Key prefixes for different data types
 */


const KEY_PREFIXES = {
  SESSION: 'session:',
  USER_CACHE: 'user:',
  TASK_CACHE: 'task:',
  RATE_LIMIT: 'ratelimit:',
  LOCK: 'lock:'
};

/**
 * Default TTL values (in seconds)
 */


const DEFAULT_TTL = {
  SESSION: 86400, // 24 hours
  CACHE: 3600, // 1 hour
  RATE_LIMIT: 60 // 1 minute
};

/**
 * Redis Service Class
 * Provides methods for session management, caching, and rate limiting
 */
class RedisService {
  constructor() {
    this.client = null;
    this.isReady = false;
  }

  /**
   * Initialize Redis connection
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      const redisConfig = {
        host: config.redis.host || process.env.REDIS_HOST || 'localhost',
        port: config.redis?.port || process.env.REDIS_PORT || 6379,
        password: config.redis?.password || process.env.REDIS_PASSWORD,
        db: config.redis?.db || process.env.REDIS_DB || 0,
        retryStrategy: (times) => {
          const delay = Math.min(times * 100, 3000);
          logger.warn(`Redis reconnecting attempt ${times}, delay: ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        lazyConnect: true
      };

      // Remove password if not set
      if (!redisConfig.password) {
        delete redisConfig.password;
      }

      this.client = new redis(redisConfig);

      // Event handlers
      this.client.on('connect', () => {
        logger.info('Redis client connecting');
      });

      this.client.on('ready', () => {
        this.isReady = true;
        logger.info('Redis client connected and ready', {
          host: redisConfig.host,
          port: redisConfig.port,
          db: redisConfig.db
        });
      });

      this.client.on('error', (error) => {
        this.isReady = false;
        logger.error('Redis client error', {
          error: error.message,
          code: error.code
        });
      });

      this.client.on('close', () => {
        this.isReady = false;
        logger.warn('Redis client connection closed');
      });

      this.client.on('reconnecting', (delay) => {
        this.isReady = false;
        logger.warn('Redis client reconnecting', { delay });
      });

      this.client.on('end', () => {
        this.isReady = false;
        logger.info('Redis client connection ended');
      });

      // Establish connection
      try {
        await this.client.connect();
      } catch (connectError) {
        logger.error('Failed to connect to Redis', {
          error: connectError.message,
          stack: connectError.stack
        });
        throw connectError;
      }

      logger.info('Redis service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Redis service', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isReady = false;
        logger.info('Redis client disconnected gracefully');
      }
    } catch (error) {
      logger.error('Error disconnecting Redis client', {
        error: error.message
      });
      // Force disconnect if graceful quit fails
      if (this.client) {
        this.client.disconnect();
      }
    }
  }

  /**
   * Check if Redis is connected
   * @returns {boolean}
   */
  isConnected() {
    return this.isReady && this.client && this.client.status === 'ready';
  }

  /**
   * Health check - ping Redis
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    try {
      if (!this.isConnected()) {
        return {
          status: 'disconnected',
          connected: false,
          message: 'Redis client not connected'
        };
      }

      const start = Date.now();
      const result = await this.client.ping();
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        connected: true,
        latency: `${latency}ms`,
        response: result
      };
    } catch (error) {
      logger.error('Redis health check failed', {
        error: error.message
      });
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Serialize data for storage
   * @param {*} data - Data to serialize
   * @returns {string}
   * @private
   */
  _serialize(data) {
    try {
      return JSON.stringify(data);
    } catch (error) {
      logger.error('Failed to serialize data', {
        error: error.message,
        dataType: typeof data
      });
      throw new Error('Data serialization failed');
    }
  }

  /**
   * Deserialize data from storage
   * @param {string} data - Data to deserialize
   * @returns {*}
   * @private
   */
  _deserialize(data) {
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to deserialize data', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Validate and sanitize key
   * @param {string} key - Key to validate
   * @returns {string}
   * @private
   */
  _validateKey(key) {
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key: must be a non-empty string');
    }
    // Limit key length to prevent abuse
    if (key.length > 512) {
      throw new Error('Invalid key: exceeds maximum length of 512 characters');
    }
    return key;
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Set session data
   * @param {string} sessionId - Session identifier
   * @param {Object} userData - User data to store
   * @param {number} [ttl=86400] - Time to live in seconds (default: 24 hours)
   * @returns {Promise<boolean>}
   */
  async setSession(sessionId, userData, ttl = DEFAULT_TTL.SESSION) {
    try {
      this._validateKey(sessionId);

      if (!userData || typeof userData !== 'object') {
        throw new Error('Invalid session data: must be an object');
      }

      const key = `${KEY_PREFIXES.SESSION}${sessionId}`;
      const serializedData = this._serialize({
        ...userData,
        createdAt: userData.createdAt || Date.now(),
        lastActivity: Date.now()
      });

      await this.client.setex(key, ttl, serializedData);

      logger.debug('Session set successfully', {
        sessionId,
        ttl,
        userId: userData.userId
      });

      return true;
    } catch (error) {
      logger.error('Failed to set session', {
        sessionId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get session data
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object|null>}
   */
  async getSession(sessionId) {
    try {
      this._validateKey(sessionId);

      const key = `${KEY_PREFIXES.SESSION}${sessionId}`;
      const data = await this.client.get(key);

      if (!data) {
        return null;
      }

      const sessionData = this._deserialize(data);

      logger.debug('Session retrieved successfully', {
        sessionId,
        userId: sessionData?.userId
      });

      return sessionData;
    } catch (error) {
      logger.error('Failed to get session', {
        sessionId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Delete session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<boolean>}
   */
  async deleteSession(sessionId) {
    try {
      this._validateKey(sessionId);

      const key = `${KEY_PREFIXES.SESSION}${sessionId}`;
      const result = await this.client.del(key);

      logger.debug('Session deleted', {
        sessionId,
        existed: result > 0
      });

      return result > 0;
    } catch (error) {
      logger.error('Failed to delete session', {
        sessionId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Refresh session TTL (sliding expiration)
   * @param {string} sessionId - Session identifier
   * @param {number} [ttl=86400] - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  async refreshSessionTTL(sessionId, ttl = DEFAULT_TTL.SESSION) {
    try {
      this._validateKey(sessionId);

      const key = `${KEY_PREFIXES.SESSION}${sessionId}`;
      const result = await this.client.expire(key, ttl);

      logger.debug('Session TTL refreshed', {
        sessionId,
        ttl,
        success: result === 1
      });

      return result === 1;
    } catch (error) {
      logger.error('Failed to refresh session TTL', {
        sessionId,
        error: error.message
      });
      return false;
    }
  }

  // ============================================================================
  // CACHING
  // ============================================================================

  /**
   * Set cache entry
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} [ttl=3600] - Time to live in seconds (default: 1 hour)
   * @returns {Promise<boolean>}
   */
  async setCache(key, value, ttl = DEFAULT_TTL.CACHE) {
    try {
      this._validateKey(key);

      const serializedValue = this._serialize(value);

      if (ttl > 0) {
        await this.client.setex(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }

      logger.debug('Cache set successfully', { key, ttl });

      return true;
    } catch (error) {
      logger.error('Failed to set cache', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get cache entry
   * @param {string} key - Cache key
   * @returns {Promise<*>}
   */
  async getCache(key) {
    try {
      this._validateKey(key);

      const data = await this.client.get(key);

      if (!data) {
        return null;
      }

      const value = this._deserialize(data);

      logger.debug('Cache retrieved successfully', { key });

      return value;
    } catch (error) {
      logger.error('Failed to get cache', {
        key,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async deleteCache(key) {
    try {
      this._validateKey(key);

      const result = await this.client.del(key);

      logger.debug('Cache deleted', {
        key,
        existed: result > 0
      });

      return result > 0;
    } catch (error) {
      logger.error('Failed to delete cache', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Delete cache entries matching pattern
   * @param {string} pattern - Pattern to match (e.g., 'user:*')
   * @returns {Promise<number>}
   */
  async deleteCachePattern(pattern) {
    try {
      this._validateKey(pattern);

      let cursor = '0';
      let deletedCount = 0;
      const batchSize = 100;

      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          batchSize
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          const pipeline = this.client.pipeline();
          keys.forEach(key => pipeline.del(key));
          const results = await pipeline.exec();
          deletedCount += results.filter(([err, result]) => !err && result === 1).length;
        }
      } while (cursor !== '0');

      logger.info('Cache pattern deleted', {
        pattern,
        deletedCount
      });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to delete cache pattern', {
        pattern,
        error: error.message
      });
      return 0;
    }
  }

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  /**
   * Increment rate limit counter
   * @param {string} identifier - Identifier (e.g., IP address, user ID)
   * @param {number} [windowSeconds=60] - Time window in seconds
   * @returns {Promise<number>}
   */
  async incrementRateLimit(identifier, windowSeconds = DEFAULT_TTL.RATE_LIMIT) {
    try {
      this._validateKey(identifier);

      const key = `${KEY_PREFIXES.RATE_LIMIT}${identifier}`;

      // Use Lua script to atomically increment and set expiry
      const luaScript = `
        local current = redis.call('INCR', KEYS[1])
        if current == 1 then
          redis.call('EXPIRE', KEYS[1], ARGV[1])
        end
        return current
      `;

      const count = await this.client.eval(luaScript, 1, key, windowSeconds);

      logger.debug('Rate limit incremented', {
        identifier,
        count,
        windowSeconds
      });

      return count;
    } catch (error) {
      logger.error('Failed to increment rate limit', {
        identifier,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get current rate limit count
   * @param {string} identifier - Identifier
   * @returns {Promise<number>}
   */
  async getRateLimit(identifier) {
    try {
      this._validateKey(identifier);

      const key = `${KEY_PREFIXES.RATE_LIMIT}${identifier}`;
      const count = await this.client.get(key);

      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      logger.error('Failed to get rate limit', {
        identifier,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Reset rate limit counter
   * @param {string} identifier - Identifier
   * @returns {Promise<boolean>}
   */
  async resetRateLimit(identifier) {
    try {
      this._validateKey(identifier);

      const key = `${KEY_PREFIXES.

}}}}