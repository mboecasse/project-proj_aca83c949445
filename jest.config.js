// File: jest.config.js
// Generated: 2025-10-16 07:46:28 UTC
// Project ID: proj_aca83c949445
// Task ID: task_bdjv3td0i9ej

async * - Configures module path mappings for clean imports
 * - Handles async operations with proper timeouts
 */

module.exports = {
  // Use Node.js environment for backend testing
  testEnvironment: 'node',

  // Setup files to run after Jest is initialized
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Global teardown for cleaning up database connections
  globalTeardown: '<rootDir>/tests/teardown.js',

  // Timeout for async operations (authentication, database queries)
  testTimeout: 10000, // 10 seconds

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Paths to ignore during testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/.vscode/',
    '/.git/'
  ],

  // Coverage collection configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js', // Exclude server entry point
    '!src/config/**', // Exclude configuration files
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],

  // Coverage thresholds - enforce minimum coverage requirements
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    // Stricter thresholds for critical business logic
    './src/controllers/': {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 85
    },
    './src/middleware/auth.js': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/models/': {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 80
    }
  },

  // Coverage output configuration
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@validators/(.*)$': '<rootDir>/src/validators/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1'
  },

  // Module directories for resolution
  moduleDirectories: ['node_modules', 'src'],

  // Clear mocks between tests for isolation
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Detect open handles (unclosed database connections, timers, etc.)
  detectOpenHandles: true,

  // Don't force exit - ensure proper cleanup
  forceExit: false,

  // Verbose output for debugging
  verbose: true,

  // Transform configuration
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.js' }]
  },

  // Ignore patterns for transformation
  transformIgnorePatterns: [
    'node_modules/(?!(supertest)/)'
  ],

  // Maximum number of workers for parallel test execution
  // Use 50% of available CPUs for better performance without overwhelming system
  maxWorkers: '50%',

  // Bail on first test failure during development for faster feedback
  // Set to false in CI/CD to see all failures
  bail: false,

  // Error on deprecated APIs
  errorOnDeprecated: true,

  // Notify on completion (useful for development)
  notify: false,

  // Coverage provider - v8 is faster than babel
  coverageProvider: 'v8',

  // Test result processors
  testResultsProcessor: undefined,

  // Global variables available in tests
  globals: {
    'NODE_ENV': 'test'
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node'],

  // Watch plugins for interactive mode
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Ignore watch patterns
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/'
  ]
};
