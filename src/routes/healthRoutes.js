// File: src/routes/healthRoutes.js
// Generated: 2025-10-16 07:46:23 UTC
// Project ID: proj_aca83c949445
// Task ID: task_vjblo9aj89p1


const express = require('express');


const logger = require('../utils/logger');


const mongoose = require('../config/database');


const router = express.Router();

// Rate limiting for health checks


const healthCheckCache = {
  lastCheck: 0,
  cachedResult: null,
  cacheDuration: 5000 // 5 seconds cache
};

// Middleware to verify authentication for detailed endpoint


const authenticateDetailedHealth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const validToken = process.env.HEALTH_CHECK_TOKEN;

  if (!validToken) {
    logger.error('HEALTH_CHECK_TOKEN not configured');
    return res.status(503).json({
      status: 'error',
      message: 'Service configuration error'
    });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
  }

  const token = authHeader.substring(7);

  if (token !== validToken) {
    logger.warn('Unauthorized access attempt to detailed health check', {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    return res.status(403).json({
      status: 'error',
      message: 'Invalid authentication credentials'
    });
  }

  next();
};

// Helper function to perform cached database ping
async function getCachedDatabaseStatus() {
  const now = Date.now();

  // Return cached result if still valid
  if (healthCheckCache.cachedResult && (now - healthCheckCache.lastCheck) < healthCheckCache.cacheDuration) {
    return healthCheckCache.cachedResult;
  }

  // Perform new check
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : 'disconnected';

  let dbResponseTime = 0;
  let dbError = null;

  if (dbState === 1) {
    try {
      const pingStart = Date.now();
      await mongoose.connection.db.admin().ping();
      dbResponseTime = Date.now() - pingStart;
    } catch (error) {
      dbError = error.message;
      logger.error('Database ping failed during health check', { error: error.message });
    }
  }

  const result = {
    status: dbStatus,
    responseTime: dbResponseTime,
    error: dbError,
    isHealthy: dbStatus === 'connected' && !dbError
  };

  // Cache the result
  healthCheckCache.lastCheck = now;
  healthCheckCache.cachedResult = result;

  return result;
}

/**
 * GET /health
 * Basic health check endpoint
 * Returns API status, version, timestamp, and database connection status
 * @public - No authentication required
 */
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();

    // Use cached database status to prevent DoS
    const dbCheck = await getCachedDatabaseStatus();

    const isHealthy = dbCheck.isHealthy;
    const statusCode = isHealthy ? 200 : 503;

    const healthResponse = {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbCheck.status,
        responseTime: dbCheck.responseTime
      }
    };

    // Add error message if database is unhealthy
    if (!isHealthy) {
      healthResponse.message = 'Service temporarily unavailable';
      if (dbCheck.error) {
        healthResponse.database.error = 'Database connection error';
      }
    }

    logger.info('Health check performed', {
      status: healthResponse.status,
      dbStatus: dbCheck.status,
      responseTime: Date.now() - startTime
    });

    res.status(statusCode).json(healthResponse);
  } catch (error) {
    logger.error('Health check endpoint error', { error: error.message });

    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
      message: 'Service temporarily unavailable',
      database: {
        status: 'unknown'
      }
    });
  }
});

/**
 * GET /health/detailed
 * Detailed health check with additional system information
 * Includes memory usage and more granular status
 * @protected - Requires authentication via Bearer token
 */
router.get('/detailed', authenticateDetailedHealth, async (req, res) => {
  try {
    const startTime = Date.now();

    // Use cached database status to prevent DoS
    const dbCheck = await getCachedDatabaseStatus();

    const dbState = mongoose.connection.readyState;
    const dbStateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    const dbStatus = dbStateMap[dbState] || 'unknown';

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryInfo = {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
    };

    // Determine overall health
    const isHealthy = dbCheck.isHealthy;
    const statusCode = isHealthy ? 200 : 503;

    const detailedResponse = {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: memoryInfo
      },
      database: {
        status: dbStatus,
        responseTime: dbCheck.responseTime
      }
    };

    if (!isHealthy) {
      detailedResponse.message = 'Service temporarily unavailable';
      if (dbCheck.error) {
        detailedResponse.database.error = 'Database connection error';
      }
    }

    logger.info('Detailed health check performed', {
      status: detailedResponse.status,
      dbStatus,
      responseTime: Date.now() - startTime,
      authenticatedUser: true
    });

    res.status(statusCode).json(detailedResponse);
  } catch (error) {
    logger.error('Detailed health check endpoint error', { error: error.message });

    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
      message: 'Service temporarily unavailable'
    });
  }
});

module.exports = router;
