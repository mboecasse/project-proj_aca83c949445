// File: tests/unit/models/Task.test.js
// Generated: 2025-10-16 07:48:13 UTC
// Project ID: proj_aca83c949445
// Task ID: task_e6yvyjdyivet


const Task = require('../../../src/models/Task');


const mongoose = require('mongoose');

const { MongoMemoryServer } = require('mongodb-memory-server');

async * Tests the Task model schema validation, default values, enum constraints,
 * and data integrity rules.
 *
 * @module tests/unit/models/Task.test
 */

describe('Task Model', () => {
  let mongoServer;

  /**
   * Setup in-memory MongoDB server before all tests
   */
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    try {
      await mongoose.connect(mongoUri);
    } catch (error) {
      await mongoServer.stop();
      throw error;
    }
  });

  /**
   * Cleanup after all tests
   */
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  /**
   * Clear Task collection after each test
   */
  afterEach(async () => {
    await Task.deleteMany({});
  });

  describe('Required Fields', () => {
    it('should require title field', async () => {
      const task = new Task({
        userId: new mongoose.Types.ObjectId()
      });

      const error = task.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.title).toBeDefined();
      expect(error.errors.title.kind).toBe('required');
    });

    it('should require userId field', async () => {
      const task = new Task({
        title: 'Test Task'
      });

      const error = task.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.userId).toBeDefined();
      expect(error.errors.userId.kind).toBe('required');
    });

    it('should create task with required fields', async () => {
      const userId = new mongoose.Types.ObjectId();
      const task = new Task({
        title: 'Test Task',
        userId: userId
      });

      const savedTask = await task.save();

      expect(savedTask._id).toBeDefined();
      expect(savedTask.title).toBe('Test Task');
      expect(savedTask.userId.toString()).toBe(userId.toString());
    });

    it('should fail validation when both required fields are missing', async () => {
      const task = new Task({});

      const error = task.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.title).toBeDefined();
      expect(error.errors.userId).toBeDefined();
    });
  });

  describe('Default Values', () => {
    it('should set default status to pending', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId()
      });

      await task.save();

      expect(task.status).toBe('pending');
    });

    it('should set createdAt timestamp', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId()
      });

      await task.save();

      expect(task.createdAt).toBeDefined();
      expect(task.createdAt).toBeInstanceOf(Date);
    });

    it('should set updatedAt timestamp', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId()
      });

      await task.save();

      expect(task.updatedAt).toBeDefined();
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on modification', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId()
      });

      await task.save();
      const originalUpdatedAt = task.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      task.title = 'Updated Task';
      await task.save();

      expect(task.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should not set default priority', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId()
      });

      await task.save();

      expect(task.priority).toBeUndefined();
    });
  });

  describe('Status Enum Validation', () => {
    it('should accept pending status', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId(),
        status: 'pending'
      });

      await expect(task.save()).resolves.toBeDefined();
      expect(task.status).toBe('pending');
    });

    it('should accept in-progress status', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId(),
        status: 'in-progress'
      });

      await expect(task.save()).resolves.toBeDefined();
      expect(task.status).toBe('in-progress');
    });

    it('should accept completed status', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId(),
        status: 'completed'
      });

      await expect(task.save()).resolves.toBeDefined();
      expect(task.status).toBe('completed');
    });

    it('should reject invalid status values', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId(),
        status: 'invalid-status'
      });

      await expect(task.save()).rejects.toThrow();
    });

    it('should reject empty string status', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId(),
        status: ''
      });

      await expect(task.save()).rejects.toThrow();
    });
  });

  describe('Priority Enum Validation', () => {
    it('should accept low priority', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId(),
        priority: 'low'
      });

      await expect(task.save()).resolves.toBeDefined();
      expect(task.priority).toBe('low');
    });

    it('should accept medium priority', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId(),
        priority: 'medium'
      });

      await expect(task.save()).resolves.toBeDefined();
      expect(task.priority).toBe('medium');
    });

    it('should accept high priority', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId(),
        priority: 'high'
      });

      await expect(task.save()).resolves.toBeDefined();
      expect(task.priority).toBe('high');
    });

    it('should reject invalid priority values', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId(),
        priority: 'urgent'
      });

      await expect(task.save()).rejects.toThrow();
    });

    it('should allow undefined priority', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId()
      });

      await expect(task.save()).resolves.toBeDefined();
      expect(task.priority).toBeUndefined();
    });
  });

  describe('Optional Fields', () => {
    it('should save task without description', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId()
      });

      const savedTask = await task.save();

      expect(savedTask.description).toBeUndefined();
    });

    it('should save task with description', async () => {
      const task = new Task({
        title: 'Test Task',
        description: 'Task description',
        userId: new mongoose.Types.ObjectId()
      });

      const savedTask = await task.save();

      expect(savedTask.description).toBe('Task description');
    });

    it('should save task with empty description', async () => {
      const task = new Task({
        title: 'Test Task',
        description: '',
        userId: new mongoose.Types.ObjectId()
      });

      const savedTask = await task.save();

      expect(savedTask.description).toBe('');
    });

    it('should save task without dueDate', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId()
      });

      const savedTask = await task.save();

      expect(savedTask.dueDate).toBeUndefined();
    });

    it('should save task with dueDate', async () => {
      const dueDate = new Date('2024-12-31');
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId(),
        dueDate: dueDate
      });

      const savedTask = await task.save();

      expect(savedTask.dueDate).toEqual(dueDate);
    });

    it('should save task with all optional fields', async () => {
      const dueDate = new Date('2024-12-31');
      const task = new Task({
        title: 'Test Task',
        description: 'Complete task description',
        status: 'in-progress',
        priority: 'high',
        userId: new mongoose.Types.ObjectId(),
        dueDate: dueDate
      });

      const savedTask = await task.save();

      expect(savedTask.description).toBe('Complete task description');
      expect(savedTask.status).toBe('in-progress');
      expect(savedTask.priority).toBe('high');
      expect(savedTask.dueDate).toEqual(dueDate);
    });
  });

  describe('Data Integrity', () => {
    it('should trim whitespace from title', async () => {
      const task = new Task({
        title: '  Test Task  ',
        userId: new mongoose.Types.ObjectId()
      });

      await task.save();

      expect(task.title).toBe('Test Task');
    });

    it('should trim whitespace from description', async () => {
      const task = new Task({
        title: 'Test Task',
        description: '  Task description  ',
        userId: new mongoose.Types.ObjectId()
      });

      await task.save();

      expect(task.description).toBe('Task description');
    });

    it('should reject title exceeding maximum length', async () => {
      const longTitle = 'a'.repeat(300);
      const task = new Task({
        title: longTitle,
        userId: new mongoose.Types.ObjectId()
      });

      await expect(task.save()).rejects.toThrow();
    });

    it('should accept title at maximum length', async () => {
      const maxTitle = 'a'.repeat(200);
      const task = new Task({
        title: maxTitle,
        userId: new mongoose.Types.ObjectId()
      });

      await expect(task.save()).resolves.toBeDefined();
    });

    it('should reject empty title', async () => {
      const task = new Task({
        title: '',
        userId: new mongoose.Types.ObjectId()
      });

      const error = task.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.title).toBeDefined();
    });

    it('should reject title with only whitespace', async () => {
      const task = new Task({
        title: '   ',
        userId: new mongoose.Types.ObjectId()
      });

      const error = task.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.title).toBeDefined();
    });

    it('should validate userId as ObjectId', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: 'invalid-id'
      });

      const error = task.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.userId).toBeDefined();
    });

    it('should accept valid ObjectId for userId', async () => {
      const validObjectId = new mongoose.Types.ObjectId();
      const task = new Task({
        title: 'Test Task',
        userId: validObjectId
      });

      await expect(task.save()).resolves.toBeDefined();
      expect(task.userId.toString()).toBe(validObjectId.toString());
    });

    it('should reject invalid date for dueDate', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId(),
        dueDate: 'invalid-date'
      });

      await expect(task.save()).rejects.toThrow();
    });

    it('should accept valid date string for dueDate', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId(),
        dueDate: '2024-12-31'
      });

      await expect(task.save()).resolves.toBeDefined();
      expect(task.dueDate).toBeInstanceOf(Date);
    });
  });

  describe('Query Operations', () => {
    it('should find task by id', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId()
      });

      await task.save();

      const foundTask = await Task.findById(task._id);

      expect(foundTask).toBeDefined();
      expect(foundTask.title).toBe('Test Task');
    });

    it('should find tasks by userId', async () => {
      const userId = new mongoose.Types.ObjectId();

      await Task.create([
        { title: 'Task 1', userId: userId },
        { title: 'Task 2', userId: userId },
        { title: 'Task 3', userId: new mongoose.Types.ObjectId() }
      ]);

      const userTasks = await Task.find({ userId: userId });

      expect(userTasks).toHaveLength(2);
      expect(userTasks[0].userId.toString()).toBe(userId.toString());
      expect(userTasks[1].userId.toString()).toBe(userId.toString());
    });

    it('should find tasks by status', async () => {
      const userId = new mongoose.Types.ObjectId();

      await Task.create([
        { title: 'Task 1', userId: userId, status: 'pending' },
        { title: 'Task 2', userId: userId, status: 'completed' },
        { title: 'Task 3', userId: userId, status: 'pending' }
      ]);

      const pendingTasks = await Task.find({ status: 'pending' });

      expect(pendingTasks).toHaveLength(2);
      expect(pendingTasks.every(task => task.status === 'pending')).toBe(true);
    });

    it('should update task fields', async () => {
      const task = new Task({
        title: 'Test Task',
        userId: new mongoose.Types.ObjectId(),
        status: 'pending'
      });

      await task.save();

      task.status = 'completed';
      task.description = 'Updated description';

}}})))