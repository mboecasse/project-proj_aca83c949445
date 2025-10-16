// File: tests/integration/tasks.test.js
// Generated: 2025-10-16 07:53:55 UTC
// Project ID: proj_aca83c949445
// Task ID: task_8ske7apjadrn


const Task = require('../../src/models/Task');


const User = require('../../src/models/User');


const app = require('../../src/app');


const logger = require('../../src/utils/logger');


const mongoose = require('mongoose');


const request = require('supertest');

/**
 * Integration tests for task management endpoints
 * Tests CRUD operations, authentication, authorization, and data validation
 */
describe('Task Management Integration Tests', () => {
  let authToken;
  let userId;
  let taskId;
  let otherUserToken;
  let otherUserId;

  beforeAll(async () => {
    // Connect to test database
    const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/taskmanager_test';
    await mongoose.connect(testDbUri);
    logger.info('Connected to test database');
  });

  beforeEach(async () => {
    // Clear database collections
    await User.deleteMany({});
    await Task.deleteMany({});

    // Create and authenticate primary test user
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'Password123!'
      });

    authToken = userResponse.body.token;
    userId = userResponse.body.user.id || userResponse.body.user._id;

    // Create second user for authorization tests
    const otherUserResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Other User',
        email: 'otheruser@example.com',
        password: 'Password123!'
      });

    otherUserToken = otherUserResponse.body.token;
    otherUserId = otherUserResponse.body.user.id || otherUserResponse.body.user._id;
  });

  afterAll(async () => {
    await mongoose.connection.close();
    logger.info('Closed test database connection');
  });

  describe('POST /api/tasks', () => {
    it('should create a new task with valid data', async () => {
      const taskData = {
        title: 'Complete project documentation',
        description: 'Write comprehensive API documentation',
        status: 'pending',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.title).toBe(taskData.title);
      expect(response.body.data.description).toBe(taskData.description);
      expect(response.body.data.status).toBe(taskData.status);
      expect(response.body.data.priority).toBe(taskData.priority);
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');

      taskId = response.body.data._id;
    });

    it('should create task with minimal required fields', async () => {
      const taskData = {
        title: 'Simple task'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(taskData.title);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.priority).toBe('medium');
    });

    it('should fail without authentication', async () => {
      const taskData = {
        title: 'Test Task'
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail with missing required title field', async () => {
      const taskData = {
        description: 'Missing title'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/title/i);
    });

    it('should fail with invalid status value', async () => {
      const taskData = {
        title: 'Test Task',
        status: 'invalid_status'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid priority value', async () => {
      const taskData = {
        title: 'Test Task',
        priority: 'invalid_priority'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid due date', async () => {
      const taskData = {
        title: 'Test Task',
        dueDate: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      // Create multiple tasks for the authenticated user
      await Task.create([
        { title: 'Task 1', userId, status: 'pending', priority: 'high', createdAt: new Date('2024-01-01') },
        { title: 'Task 2', userId, status: 'in_progress', priority: 'medium', createdAt: new Date('2024-01-02') },
        { title: 'Task 3', userId, status: 'completed', priority: 'low', createdAt: new Date('2024-01-03') },
        { title: 'Task 4', userId, status: 'pending', priority: 'high', dueDate: new Date('2024-12-31') }
      ]);

      // Create task for other user
      await Task.create({ title: 'Other User Task', userId: otherUserId, status: 'pending' });
    });

    it('should return only authenticated user tasks', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(4);
      response.body.data.forEach(task => {
        expect(task.userId.toString()).toBe(userId.toString());
      });
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=completed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('completed');
    });

    it('should filter tasks by priority', async () => {
      const response = await request(app)
        .get('/api/tasks?priority=high')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach(task => {
        expect(task.priority).toBe('high');
      });
    });

    it('should filter tasks by multiple criteria', async () => {
      const response = await request(app)
        .get('/api/tasks?status=pending&priority=high')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach(task => {
        expect(task.status).toBe('pending');
        expect(task.priority).toBe('high');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/tasks?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('should sort tasks by createdAt descending by default', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const dates = response.body.data.map(task => new Date(task.createdAt).getTime());
      const sortedDates = [...dates].sort((a, b) => b - a);
      expect(dates).toEqual(sortedDates);
    });

    it('should sort tasks by dueDate ascending', async () => {
      const response = await request(app)
        .get('/api/tasks?sortBy=dueDate&order=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/tasks/:id', () => {
    let testTaskId;

    beforeEach(async () => {
      const task = await Task.create({
        title: 'Test Task',
        description: 'Test Description',
        userId,
        status: 'pending',
        priority: 'medium'
      });
      testTaskId = task._id;
    });

    it('should return task by ID for owner', async () => {
      const response = await request(app)
        .get(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id.toString()).toBe(testTaskId.toString());
      expect(response.body.data.title).toBe('Test Task');
      expect(response.body.data.description).toBe('Test Description');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/tasks/${testTaskId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/not found/i);
    });

    it('should return 403 when accessing other user task', async () => {
      const otherUserTask = await Task.create({
        title: 'Other User Task',
        userId: otherUserId,
        status: 'pending'
      });

      const response = await request(app)
        .get(`/api/tasks/${otherUserTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/not authorized/i);
    });

    it('should return 400 for invalid task ID format', async () => {
      const response = await request(app)
        .get('/api/tasks/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    let testTaskId;

    beforeEach(async () => {
      const task = await Task.create({
        title: 'Original Title',
        description: 'Original Description',
        userId,
        status: 'pending',
        priority: 'medium'
      });
      testTaskId = task._id;
    });

    it('should update task with valid data', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
        status: 'in_progress',
        priority: 'high'
      };

      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.status).toBe(updateData.status);
      expect(response.body.data.priority).toBe(updateData.priority);
      expect(new Date(response.body.data.updatedAt).getTime()).toBeGreaterThan(
        new Date(response.body.data.createdAt).getTime()
      );
    });

    it('should update task status transition', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
    });

    it('should update only provided fields', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'New Title Only' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('New Title Only');
      expect(response.body.data.description).toBe('Original Description');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .send({ title: 'Updated' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail when updating other user task', async () => {
      const otherUserTask = await Task.create({
        title: 'Other Task',
        userId: otherUserId,
        status: '

}}}}))))