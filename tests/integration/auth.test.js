// File: tests/integration/auth.test.js
// Generated: 2025-10-16 07:54:09 UTC
// Project ID: proj_aca83c949445
// Task ID: task_qcrgvu6fgd44

      const jwt = require('jsonwebtoken');


const User = require('../../src/models/User');


const app = require('../../src/app');


const logger = require('../../src/utils/logger');


const mongoose = require('mongoose');


const request = require('supertest');

/**
 * Authentication Integration Tests
 * Tests user registration, login, and protected route access
 */
describe('Authentication Integration Tests', () => {
  // Setup and teardown
  beforeAll(async () => {
    try {
      // Check if already connected
      if (mongoose.connection.readyState === 1) {
        logger.info('Already connected to database');
        return;
      }

      // Connect to test database - require environment variable
      const testMongoUri = process.env.MONGODB_TEST_URI;
      if (!testMongoUri) {
        throw new Error('MONGODB_TEST_URI environment variable is required for tests');
      }
      await mongoose.connect(testMongoUri);
      logger.info('Connected to test database');
    } catch (error) {
      logger.error('Failed to connect to test database', { error: error.message });
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Cleanup and close connection
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
      logger.info('Closed test database connection');
    } catch (error) {
      logger.error('Failed to close test database connection', { error: error.message });
    }
  });

  beforeEach(async () => {
    try {
      // Clear users collection before each test
      await User.deleteMany({});
    } catch (error) {
      logger.error('Failed to clear users collection', { error: error.message });
      throw error;
    }
  });

  describe('POST /api/auth/register', () => {
    const validUser = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      username: 'testuser'
    };

    it('should register a new user with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT format
      expect(res.body.data).toHaveProperty('email', validUser.email);
      expect(res.body.data).toHaveProperty('username', validUser.username);
      expect(res.body.data).not.toHaveProperty('password');

      // Verify user exists in database
      const user = await User.findOne({ email: validUser.email });
      expect(user).toBeTruthy();
      expect(user.email).toBe(validUser.email);
      expect(user.username).toBe(validUser.username);
      expect(user.password).not.toBe(validUser.password); // Should be hashed
    });

    it('should reject registration with duplicate email', async () => {
      // Create user first
      await User.create(validUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/email.*already/i);
    });

    it('should reject registration with duplicate username', async () => {
      await User.create(validUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, email: 'different@example.com' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/username.*already/i);
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, email: 'invalid-email' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject registration with weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, password: '123' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/password/i);
    });

    it('should reject registration with missing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ password: validUser.password, username: validUser.username })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject registration with missing password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: validUser.email, username: validUser.username })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject registration with missing username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: validUser.email, password: validUser.password })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject registration with empty fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: '', password: '', username: '' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject registration with password less than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, password: 'Short1!' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    const userCredentials = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      username: 'testuser'
    };

    beforeEach(async () => {
      // Create user before each login test
      await request(app)
        .post('/api/auth/register')
        .send(userCredentials);
    });

    it('should login with correct credentials and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userCredentials.email, password: userCredentials.password })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT format
      expect(res.body.data).toHaveProperty('email', userCredentials.email);
      expect(res.body.data).toHaveProperty('username', userCredentials.username);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should login with username instead of email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userCredentials.username, password: userCredentials.password })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('username', userCredentials.username);
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userCredentials.email, password: 'WrongPassword123!' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
      expect(res.body).not.toHaveProperty('token');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: userCredentials.password })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
      expect(res.body).not.toHaveProperty('token');
    });

    it('should reject login with missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: userCredentials.password })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject login with missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userCredentials.email })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject login with empty credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: '', password: '' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      // Register and login to get token
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          username: 'testuser'
        });

      authToken = res.body.token;
      userId = res.body.data._id;
    });

    it('should access protected route with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('_id', userId);
      expect(res.body.data).toHaveProperty('email', 'test@example.com');
      expect(res.body.data).toHaveProperty('username', 'testuser');
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should reject access without token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject access with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject access with malformed authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', authToken)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject access with expired token', async () => {
      // Create a token with immediate expiry
      const expiredToken = jwt.sign(
        { userId: userId },
        process.env.JWT_ACCESS_SECRET || 'test_secret',
        { expiresIn: '0s' }
      );

      // Wait a moment to ensure token is expired
      await new Promise(resolve => setTimeout(resolve, 100));

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject access with token for non-existent user', async () => {
      // Delete the user but keep the token
      await User.findByIdAndDelete(userId);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/auth/update-profile', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          username: 'testuser'
        });

      authToken = res.body.token;
      userId = res.body.data._id;
    });

    it('should update user profile with valid data', async () => {
      const updates = {
        username: 'updateduser',
        email: 'updated@example.com'
      };

      const res = await request(app)
        .put('/api/auth/update-profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('username', updates.username);
      expect(res.body.data).toHaveProperty('email', updates.email);
      expect(res.body.data).not.toHaveProperty('password');

      // Verify update in database
      const user = await User.findById(userId);
      expect(user.username).toBe(updates.username);
      expect(user.email).toBe(updates.email);
    });

    it('should reject profile update without authentication', async () => {
      const res = await request(app)
        .put('/api/auth/update-profile')
        .send({ username: 'newusername' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject profile update with duplicate email', async () => {
      // Create another user
      await User.create({
        email: 'another@example.com',
        password: 'SecurePass123!',
        username: 'anotheruser'
      });

      const res = await request(app)
        .put('/api/auth/update-profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'another@example.com' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject profile update with invalid email format', async () => {
      const res = await request(app)
        .put('/api/auth/update-profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'invalid-email' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/auth/change-password', () => {
    let authToken;
    const userCredentials = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      username: 'testuser'
    };

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(userCredentials);

      authToken = res.body.token;
    });

    it('should change password with valid current password', async () => {
      const passwordData = {
        currentPassword: userCredentials.password,
        newPassword: 'NewSecurePass456!'
      };

      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');

      // Verify can login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: userCredentials.email, password: passwordData.newPassword })
        .expect(200);

      expect(loginRes.body).toHaveProperty('token');
    });

    it('should reject password change with incorrect current password', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewSecurePass456!'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject password change without authentication', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .send({
          currentPassword: userCredentials.password,
          newPassword: 'NewSecurePass456!'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject password change with weak new password', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: userCredentials.password,
          newPassword: '123'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving to database', async () => {
      const userCredentials = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        username: 'testuser'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userCredentials);

      const user = await User.findOne({ email: userCredentials.email });
      expect(user.password).not.toBe(userCredentials.password);
      expect(user.password).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt hash format
    });
  });

  describe('JWT Token Structure', () => {
    it('should generate valid JWT token structure', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          username: 'testuser'
        });

      const token = res.body.token;
      const tokenParts = token.split('.');

      expect(tokenParts).toHaveLength(3);
      expect(tokenParts[0]).toBeTruthy(); // Header
      expect(tokenParts[1]).toBeTruthy(); // Payload
      expect(tokenParts[2]).toBeTruthy(); // Signature
    });

    it('should include user ID in JWT payload', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          username: 'testuser'
        });

      const token = res.body.token;
      const secret = process.env.JWT_ACCESS_SECRET || 'test_secret';
      const decoded = jwt.verify(token, secret);

      expect(decoded).toHaveProperty('userId');
      expect(decoded.userId).toBe(res.body.data._id);
    });
  });
});

module.exports = {};
