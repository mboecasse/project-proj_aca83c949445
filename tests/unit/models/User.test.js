// File: tests/unit/models/User.test.js
// Generated: 2025-10-16 07:47:54 UTC
// Project ID: proj_aca83c949445
// Task ID: task_pp09z949ollc


const User = require('../../../src/models/User');


const mongoose = require('mongoose');

const { MongoMemoryServer } = require('mongodb-memory-server');

describe('User Model', () => {
  let mongoServer;

  /**
   * Setup in-memory MongoDB instance before all tests
   */
  beforeAll(async () => {
    try {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  });

  /**
   * Cleanup database after each test
   */
  afterEach(async () => {
    await User.deleteMany({});
  });

  /**
   * Disconnect and stop MongoDB instance after all tests
   */
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Schema Validation', () => {
    /**
     * Test: Valid user creation with all required fields
     */
    it('should create a valid user with required fields', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toBe(userData.username);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.password).not.toBe(userData.password);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    /**
     * Test: Validation failure without required fields
     */
    it('should fail validation without required fields', async () => {
      const user = new User({});
      let error;

      try {
        await user.save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.username).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });

    /**
     * Test: Validation failure without username
     */
    it('should fail validation without username', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'Password123!'
      });

      await expect(user.save()).rejects.toThrow();
    });

    /**
     * Test: Validation failure without email
     */
    it('should fail validation without email', async () => {
      const user = new User({
        username: 'testuser',
        password: 'Password123!'
      });

      await expect(user.save()).rejects.toThrow();
    });

    /**
     * Test: Validation failure without password
     */
    it('should fail validation without password', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com'
      });

      await expect(user.save()).rejects.toThrow();
    });

    /**
     * Test: Email format validation
     */
    it('should fail validation with invalid email format', async () => {
      const user = new User({
        username: 'testuser',
        email: 'invalid-email',
        password: 'Password123!'
      });

      await expect(user.save()).rejects.toThrow();
    });

    /**
     * Test: Multiple invalid email formats
     */
    it('should reject various invalid email formats', async () => {
      const invalidEmails = [
        'plainaddress',
        '@missinglocal.com',
        'missing@domain',
        'missing.domain@.com',
        'two@@example.com',
        'spaces in@email.com'
      ];

      for (const email of invalidEmails) {
        const user = new User({
          username: 'testuser',
          email: email,
          password: 'Password123!'
        });

        await expect(user.save()).rejects.toThrow();
      }
    });

    /**
     * Test: Valid email formats
     */
    it('should accept valid email formats', async () => {
      const validEmails = [
        'simple@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@example-domain.com'
      ];

      for (let i = 0; i < validEmails.length; i++) {
        const user = new User({
          username: `testuser${i}`,
          email: validEmails[i],
          password: 'Password123!'
        });

        const savedUser = await user.save();
        expect(savedUser.email).toBe(validEmails[i]);
      }
    });

    /**
     * Test: Username minimum length validation
     */
    it('should fail validation with username too short', async () => {
      const user = new User({
        username: 'ab',
        email: 'test@example.com',
        password: 'Password123!'
      });

      await expect(user.save()).rejects.toThrow();
    });

    /**
     * Test: Username maximum length validation
     */
    it('should fail validation with username too long', async () => {
      const user = new User({
        username: 'a'.repeat(51),
        email: 'test@example.com',
        password: 'Password123!'
      });

      await expect(user.save()).rejects.toThrow();
    });

    /**
     * Test: Password minimum length validation
     */
    it('should fail validation with password too short', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Pass1!'
      });

      await expect(user.save()).rejects.toThrow();
    });

    /**
     * Test: Timestamps are automatically created
     */
    it('should automatically add timestamps', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      });

      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    /**
     * Test: UpdatedAt timestamp changes on update
     */
    it('should update updatedAt timestamp on modification', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      });

      const originalUpdatedAt = user.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 100));

      user.username = 'updateduser';
      await user.save();

      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Uniqueness Constraints', () => {
    /**
     * Test: Email uniqueness constraint
     */
    it('should enforce unique email addresses', async () => {
      await User.create({
        username: 'testuser1',
        email: 'test@example.com',
        password: 'Password123!'
      });

      const duplicateUser = new User({
        username: 'testuser2',
        email: 'test@example.com',
        password: 'Password456!'
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });

    /**
     * Test: Username uniqueness constraint
     */
    it('should enforce unique usernames', async () => {
      await User.create({
        username: 'testuser',
        email: 'test1@example.com',
        password: 'Password123!'
      });

      const duplicateUser = new User({
        username: 'testuser',
        email: 'test2@example.com',
        password: 'Password456!'
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });

    /**
     * Test: Case-insensitive email uniqueness
     */
    it('should treat emails as case-insensitive for uniqueness', async () => {
      await User.create({
        username: 'testuser1',
        email: 'Test@Example.com',
        password: 'Password123!'
      });

      const duplicateUser = new User({
        username: 'testuser2',
        email: 'test@example.com',
        password: 'Password456!'
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });
  });

  describe('Password Hashing', () => {
    /**
     * Test: Password is hashed before saving
     */
    it('should hash password before saving', async () => {
      const plainPassword = 'Password123!';
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: plainPassword
      });

      await user.save();

      expect(user.password).not.toBe(plainPassword);
      expect(user.password.length).toBeGreaterThan(20);
      expect(user.password).toMatch(/^\$2[aby]\$/);
    });

    /**
     * Test: Password is not rehashed if not modified
     */
    it('should not hash password if not modified', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      });

      const hashedPassword = user.password;

      user.username = 'updateduser';
      await user.save();

      expect(user.password).toBe(hashedPassword);
    });

    /**
     * Test: Password is rehashed when changed
     */
    it('should rehash password when modified', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      });

      const originalHash = user.password;

      user.password = 'NewPassword456!';
      await user.save();

      expect(user.password).not.toBe(originalHash);
      expect(user.password).not.toBe('NewPassword456!');
    });

    /**
     * Test: Different passwords produce different hashes
     */
    it('should produce different hashes for different passwords', async () => {
      const user1 = await User.create({
        username: 'testuser1',
        email: 'test1@example.com',
        password: 'Password123!'
      });

      const user2 = await User.create({
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'Password456!'
      });

      expect(user1.password).not.toBe(user2.password);
    });

    /**
     * Test: Same password produces different hashes (salt)
     */
    it('should produce different hashes for same password due to salt', async () => {
      const password = 'Password123!';

      const user1 = await User.create({
        username: 'testuser1',
        email: 'test1@example.com',
        password: password
      });

      const user2 = await User.create({
        username: 'testuser2',
        email: 'test2@example.com',
        password: password
      });

      expect(user1.password).not.toBe(user2.password);
    });
  });

  describe('Instance Methods', () => {
    /**
     * Test: comparePassword method with correct password
     */
    it('should compare password correctly with valid password', async () => {
      const plainPassword = 'Password123!';
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: plainPassword
      });

      const isMatch = await user.comparePassword(plainPassword);
      expect(isMatch).toBe(true);
    });

    /**
     * Test: comparePassword method with incorrect password
     */
    it('should return false for incorrect password', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      });

      const isMatch = await user.comparePassword('WrongPassword');
      expect(isMatch).toBe(false);
    });

    /**
     * Test: comparePassword with empty string
     */
    it('should return false for empty password', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      });

      const isMatch = await user.comparePassword('');
      expect(isMatch).toBe(false);
    });

    /**
     * Test: comparePassword is case-sensitive
     */
    it('should be case-sensitive when comparing passwords', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      });

      const isMatch = await user.comparePassword('password123!');
      expect(isMatch).toBe(false);
    });
  });

  describe('JSON Transformation', () => {
    /**
     * Test: Password is not exposed in JSON
     */
    it('should not expose password in JSON response', () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      });

      const userJSON = user.toJSON();

      expect(userJSON.password).toBeUndefined();
      expect(userJSON.username).toBe('testuser');
      expect(userJSON.email).toBe('test@example.com');
    });

    /**
     * Test: Version key is not exposed in JSON
     */
    it('should not expose __v in JSON response', () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      });

      const userJSON = user.toJSON();

      expect(userJSON.__v).toBeUndefined();
    });

    /**
     * Test: Safe fields are included in JSON
     */
    it('should include safe fields in JSON response', () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      });

      const userJSON = user.toJSON();

      expect(userJSON.username).toBeDefined();
      expect(userJSON.email).toBeDefined();
      expect(userJSON._id).toBeDefined();
    });

    /**
     * Test: Timestamps are included in JSON
     */
    it('should include timestamps in JSON response', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      });

      const userJSON = user.toJSON();

      expect(userJSON.createdAt).toBeDefined();
      expect(userJSON.updatedAt).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    /**
     * Test: Trimming whitespace from username
     */
    it('should trim whitespace from username', async () => {
      const user = await User.create({
        username: '  testuser  ',
        email: 'test@example.com',
        password: 'Password123!'
      });

      expect(user.username).toBe('testuser');
    });

    /**
     * Test: Trimming whitespace from email
     */
    it('should trim whitespace from email', async () => {
      const user = await User.create({
        username: 'testuser',
        email: '  test@example.com  ',

}}}}))))