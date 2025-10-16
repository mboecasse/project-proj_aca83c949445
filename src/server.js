// File: src/server.js
// Generated: 2025-10-16 07:52:23 UTC
// Project ID: proj_aca83c949445
// Task ID: task_gm0dqbvcytym


const app = require('./app');


const config = require('./config/env');


const logger = require('./utils/logger');

const { connectDB, disconnectDB } = require('./config/database');


let server;

let isShuttingDown = false;

/**
 * Start HTTP server
 * Connects to database before starting server
 */
async function startServer() {
  try {
    // Connect to database first
    await connectDB();
    logger.info('Database connected successfully');

    // Start HTTP server
    const port = config.port || 3000;
    server = app.listen(port, () => {
      logger.info(`Server running on port ${port} in ${config.env} mode`);
      logger.info(`Process ID: ${process.pid}`);
    });

    // Configure server timeouts
    // keepAliveTimeout should be higher than ALB idle timeout (60s)
    server.keepAliveTimeout = 65000;
    // headersTimeout should be higher than keepAliveTimeout
    server.headersTimeout = 66000;
    // Request timeout (2 minutes)
    server.timeout = 120000;

    // Handle server errors
    server.on('error', handleServerError);

  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

/**
 * Handle server-specific errors
 * @param {Error} error - Server error
 */


function handleServerError(error) {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${config.port} is already in use`);
  } else if (error.code === 'EACCES') {
    logger.error(`Port ${config.port} requires elevated privileges`);
  } else {
    logger.error('Server error occurred', { error: error.message, code: error.code });
  }
  process.exit(1);
}

/**
 * Graceful shutdown handler
 * Closes server and database connections cleanly
 * @param {string} signal - Shutdown signal received
 */
async function gracefulShutdown(signal) {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring signal', { signal });
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} received, starting graceful shutdown`);

  // If server hasn't started yet, exit immediately
  if (!server) {
    logger.info('Server not started, exiting immediately');
    await disconnectDB().catch(err => {
      logger.error('Error closing database connection', { error: err.message });
    });
    process.exit(0);
  }

  // Set shutdown timeout (30 seconds)
  const shutdownTimeout = setTimeout(() => {
    logger.error('Forced shutdown due to timeout (30s exceeded)');
    process.exit(1);
  }, 30000);

  try {
    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed - no longer accepting connections');

      // Close database connection
      disconnectDB()
        .then(() => {
          logger.info('Database connection closed successfully');
          clearTimeout(shutdownTimeout);
          logger.info('Graceful shutdown completed');
          process.exit(0);
        })
        .catch((dbError) => {
          logger.error('Error closing database connection', {
            error: dbError.message,
            stack: dbError.stack
          });
          clearTimeout(shutdownTimeout);
          process.exit(1);
        });
    });

    // Log in-flight requests
    logger.info('Waiting for in-flight requests to complete...');

    // Handle case where server.close() callback never fires
    // This can happen if server is already closing or has no connections
    setTimeout(async () => {
      if (isShuttingDown) {
        logger.warn('Server close callback not fired, forcing database disconnect');
        try {
          await disconnectDB();
          logger.info('Database connection closed successfully');
          clearTimeout(shutdownTimeout);
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (dbError) {
          logger.error('Error closing database connection', {
            error: dbError.message,
            stack: dbError.stack
          });
          clearTimeout(shutdownTimeout);
          process.exit(1);
        }
      }
    }, 5000);

  } catch (error) {
    logger.error('Error during shutdown', { error: error.message, stack: error.stack });
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception - shutting down', {
    error: error.message,
    stack: error.stack
  });

  // Exit immediately to prevent infinite loops
  try {
    if (server && !isShuttingDown) {
      isShuttingDown = true;
      server.close(() => {
        process.exit(1);
      });
      // Force exit after 5 seconds if server.close() doesn't complete
      setTimeout(() => process.exit(1), 5000);
    } else {
      process.exit(1);
    }
  } catch (shutdownError) {
    logger.error('Error during emergency shutdown', { error: shutdownError.message });
    process.exit(1);
  }
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection - shutting down', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise
  });

  // Exit immediately to prevent infinite loops
  try {
    if (server && !isShuttingDown) {
      isShuttingDown = true;
      server.close(() => {
        process.exit(1);
      });
      // Force exit after 5 seconds if server.close() doesn't complete
      setTimeout(() => process.exit(1), 5000);
    } else {
      process.exit(1);
    }
  } catch (shutdownError) {
    logger.error('Error during emergency shutdown', { error: shutdownError.message });
    process.exit(1);
  }
});

/**
 * Handle SIGTERM signal (Docker, Kubernetes, PM2)
 */
process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM');
});

/**
 * Handle SIGINT signal (Ctrl+C)
 */
process.on('SIGINT', () => {
  gracefulShutdown('SIGINT');
});

/**
 * Handle SIGUSR2 signal (nodemon restart)
 */
process.on('SIGUSR2', () => {
  gracefulShutdown('SIGUSR2');
});

// Start server only if this file is run directly
if (require.main === module) {
  startServer();
}

// Export for testing purposes
module.exports = {
  startServer,
  gracefulShutdown
};
