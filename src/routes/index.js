// File: src/routes/index.js
// Generated: 2025-10-16 07:46:15 UTC
// Project ID: proj_aca83c949445
// Task ID: task_2hlbsg7lp5h2


const authRoutes = require('./authRoutes');


const commentRoutes = require('./commentRoutes');


const express = require('express');


const healthRoutes = require('./healthRoutes');


const logger = require('../utils/logger');


const taskRoutes = require('./taskRoutes');


const userRoutes = require('./userRoutes');

const { authenticate } = require('../middleware/auth');

async * - /users - User management endpoints (profile, update, delete)
 * - /tasks - Task CRUD endpoints (create, read, update, delete)
 * - /comments - Comment management endpoints
 * - /health - API health check and status
 *
 * @module routes
 */


const router = express.Router();

// Import route modules

// Import authentication middleware

/**
 * Mount route modules with appropriate prefixes
 * Order: Public routes first, then protected routes
 */

// Health check routes (public)
router.use('/health', healthRoutes);

// Authentication routes (public)
router.use('/auth', authRoutes);

// User routes (protected)
router.use('/users', authenticate, userRoutes);

// Task routes (protected)
router.use('/tasks', authenticate, taskRoutes);

// Comment routes (protected)
router.use('/comments', authenticate, commentRoutes);

/**
 * Root endpoint
 * Provides API information and available endpoints
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Task Management API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      tasks: '/api/tasks',
      comments: '/api/comments'
    },
    documentation: '/api/docs'
  });
});

/**
 * 404 handler for undefined routes
 * Must be placed after all route definitions
 */
router.use('*', (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: 'The requested resource was not found'
  });
});

/**
 * Global error handling middleware
 * Catches errors from route modules
 */
router.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

module.exports = router;
