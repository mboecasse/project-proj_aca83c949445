// File: src/config/database.js
// Generated: 2025-10-16 07:46:25 UTC
// Project ID: proj_aca83c949445
// Task ID: task_gsfu9wyibz37


const mongoose = require('mongoose');

async * Implements singleton pattern with connection pooling, retry logic,
 * event handling, and graceful shutdown.
 *
 * @module config/database
 */

/**
 * Mongoose connection options
 * Configured for production use with connection pooling and timeouts
 */


const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4
  retryWrites: true,
  w: 'majority'
};

/**
 * Connection state tracking
 */

let isConnecting = false;

let connectionPromise = null;

/**
 * Retry configuration
 */


const MAX_RETRIES = 3;


const INITIAL_RETRY_DELAY = 1000;

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Connect to MongoDB database
 *
 * Implements singleton pattern - returns existing connection if already connected.
 * Includes retry logic with exponential backoff for failed connections.
 *
 * @async
 * @returns {Promise<mongoose.Connection>} Mongoose connection instance
 * @throws {Error} If connection fails after all retries or if MONGODB_URI is missing
 */


const connectDB = async () => {
  try {
    // Validate environment variable
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return mongoose.connection;
    }

    // Check if connection attempt is in progress
    if (isConnecting && connectionPromise) {
      console.log('MongoDB connection attempt already in progress');
      return connectionPromise;
    }

    isConnecting = true;

    // Create connection promise with retry logic
    connectionPromise = (async () => {
      let lastError;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`MongoDB connection attempt ${attempt} of ${MAX_RETRIES}`);

          // Attempt connection
          const conn = await mongoose.connect(process.env.MONGODB_URI, options);

          isConnecting = false;
          connectionPromise = null;

          // Log success (without exposing credentials)
          const dbHost = conn.connection.host;
          const dbName = conn.connection.name;
          console.log(`MongoDB Connected: ${dbHost}/${dbName}`);

          return conn.connection;
        } catch (error) {
          lastError = error;
          console.error(`MongoDB connection attempt ${attempt} failed:`, error.message);

          if (attempt < MAX_RETRIES) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
            console.log(`Retrying in ${delay}ms...`);
            await sleep(delay);
          }
        }
      }

      // All retries exhausted
      isConnecting = false;
      connectionPromise = null;
      throw new Error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts: ${lastError.message}`);
    })();

    return connectionPromise;
  } catch (error) {
    isConnecting = false;
    connectionPromise = null;
    console.error('MongoDB Connection Error:', error.message);

    // Exit process on connection failure
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB database
 * Used primarily for testing and graceful shutdown
 *
 * @async
 * @returns {Promise<void>}
 */


const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      isConnecting = false;
      connectionPromise = null;
      console.log('MongoDB connection closed');
    }
  } catch (error) {
    console.error('Error closing MongoDB connection:', error.message);
    throw error;
  }
};

/**
 * Get current connection health status
 *
 * @returns {Object} Connection status information
 */


const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    state: states[mongoose.connection.readyState],
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name
  };
};

/**
 * Event Listeners for Connection Monitoring
 */

// Connected event
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

// Error event
mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err.message);
});

// Disconnected event
mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Reconnected event
mongoose.connection.on('reconnected', () => {
  console.log('Mongoose reconnected to MongoDB');
});

/**
 * Graceful Shutdown Handlers
 * Ensures database connections are properly closed on process termination
 */

// SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination (SIGINT)');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error.message);
    process.exit(1);
  }
});

// SIGTERM (kill command)
process.on('SIGTERM', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination (SIGTERM)');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error.message);
    process.exit(1);
  }
});

// Uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error.message);
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed due to uncaught exception');
  } catch (closeError) {
    console.error('Error closing connection:', closeError.message);
  }
  process.exit(1);
});

// Unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed due to unhandled rejection');
  } catch (closeError) {
    console.error('Error closing connection:', closeError.message);
  }
  process.exit(1);
});

/**
 * Module Exports
 *
 * Primary export: connectDB function
 * Additional exports for testing and monitoring
 */
module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.disconnectDB = disconnectDB;
module.exports.getConnectionStatus = getConnectionStatus;
module.exports.connection = mongoose.connection;
