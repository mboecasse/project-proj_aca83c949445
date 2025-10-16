// File: tests/setup.js
// Generated: 2025-10-16 07:47:02 UTC
// Project ID: proj_aca83c949445
// Task ID: task_5apdwkz348nd

    const jwt = require('jsonwebtoken');


const crypto = require('crypto');


const mongoose = require('mongoose');

const { MongoMemoryServer } = require('mongodb-memory-server');

* - Environment variables for test mode
 * - Database connection lifecycle (setup/teardown)
 * - Collection cleanup between tests
 * - Mocks for external services
 *
 * @module tests/setup
 */

// Global MongoDB Memory Server instance

let mongoServer;

/**
 * Configure Jest timeout for async operations
 * Increased to 30 seconds to handle database operations
 */
jest.setTimeout(30000);

/**
 * Generate secure random secrets for testing
 */


const generateTestSecret = () => crypto.randomBytes(32).toString('hex');

/**
 * Configure test environment variables
 * These override any .env settings during tests
 */
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = generateTestSecret();
process.env.JWT_ACCESS_EXPIRY = '1h';
process.env.JWT_REFRESH_SECRET = generateTestSecret();
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.PORT = '5001'; // Different port to avoid conflicts

/**
 * Global test utilities
 * Available in all test files via global.testUtils
 */
global.testUtils = {
  /**
   * Generate a valid MongoDB ObjectId
   * @returns {mongoose.Types.ObjectId} Valid ObjectId
   */
  generateValidObjectId: () => new mongoose.Types.ObjectId(),

  /**
   * Create mock user data for testing
   * @param {Object} overrides - Properties to override defaults
   * @returns {Object} Mock user object
   */
  createMockUser: (overrides = {}) => ({
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123!',
    ...overrides
  }),

  /**
   * Create mock task data for testing
   * @param {Object} overrides - Properties to override defaults
   * @returns {Object} Mock task object
   */
  createMockTask: (overrides = {}) => ({
    title: 'Test Task',
    description: 'Test task description for testing purposes',
    status: 'pending',
    priority: 'medium',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    ...overrides
  }),

  /**
   * Create multiple mock tasks
   * @param {number} count - Number of tasks to create
   * @param {Object} baseOverrides - Base properties for all tasks
   * @returns {Array} Array of mock task objects
   */
  createMockTasks: (count = 3, baseOverrides = {}) => {
    return Array.from({ length: count }, (_, index) => ({
      title: `Test Task ${index + 1}`,
      description: `Test task description ${index + 1}`,
      status: ['pending', 'in-progress', 'completed'][index % 3],
      priority: ['low', 'medium', 'high'][index % 3],
      dueDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
      ...baseOverrides
    }));
  },

  /**
   * Generate valid JWT token for testing
   * @param {Object} payload - Token payload
   * @returns {string} JWT token
   */
  generateTestToken: (payload = {}) => {
    return jwt.sign(
      { userId: payload.userId || new mongoose.Types.ObjectId(), ...payload },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY }
    );
  },

  /**
   * Wait for specified milliseconds
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise} Promise that resolves after delay
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

/**
 * Setup hook - runs once before all tests
 * Initializes MongoDB Memory Server and connects to it
 */
beforeAll(async () => {
  try {
    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create({
      binary: {
        version: '7.0.0' // Use stable MongoDB version
      }
    });

    const mongoUri = mongoServer.getUri();

    // Connect mongoose to memory server
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Suppress console output during tests for cleaner test results
    global.console = {
      ...console,
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
  } catch (error) {
    console.error('Failed to setup test environment:', error);
    throw error;
  }
});

/**
 * Cleanup hook - runs after each test
 * Clears all collections to ensure test isolation
 */
afterEach(async () => {
  try {
    // Get all collections
    const collections = mongoose.connection.collections;

    // Clear each collection
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    // Clear all mocks
    jest.clearAllMocks();
  } catch (error) {
    console.error('Failed to cleanup after test:', error);
    throw error;
  }
});

/**
 * Teardown hook - runs once after all tests
 * Disconnects from database and stops MongoDB Memory Server
 */
afterAll(async () => {
  try {
    // Close mongoose connection
    await mongoose.disconnect();

    // Stop MongoDB Memory Server
    if (mongoServer) {
      await mongoServer.stop();
    }

    // Restore console
    global.console = require('console');
  } catch (error) {
    console.error('Failed to teardown test environment:', error);
    throw error;
  }
});

/**
 * Mock external email service
 * Prevents actual emails from being sent during tests
 */
jest.mock('../src/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true)
}), { virtual: true });

/**
 * Mock file upload service if it exists
 * Prevents actual file operations during tests
 */
jest.mock('../src/services/uploadService', () => ({
  uploadFile: jest.fn().mockResolvedValue({
    url: 'http://mock-storage.com/test-file.jpg',
    filename: 'test-file.jpg',
    size: 1024
  }),
  deleteFile: jest.fn().mockResolvedValue(true)
}), { virtual: true });

/**
 * Mock notification service if it exists
 * Prevents actual notifications during tests
 */
jest.mock('../src/services/notificationService', () => ({
  sendNotification: jest.fn().mockResolvedValue(true),
  sendTaskReminder: jest.fn().mockResolvedValue(true),
  sendTaskAssignment: jest.fn().mockResolvedValue(true)
}), { virtual: true });

/**
 * Configure global error handler for unhandled promise rejections
 * Ensures tests fail properly on unhandled errors
 */
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection in tests:', error);
  throw error;
});

module.exports = {};
