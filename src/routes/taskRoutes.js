// File: src/routes/taskRoutes.js
// Generated: 2025-10-16 07:52:08 UTC
// Project ID: proj_aca83c949445
// Task ID: task_q6zox0mww3za

  const { validationResult } = require('express-validator');


const Task = require('../models/Task');


const User = require('../models/User');


const express = require('express');


const logger = require('../utils/logger');

const { authenticate } = require('../middleware/auth');

const { authorize, requireOwnership } = require('../middleware/authorize');

const { body, query, param } = require('express-validator');


const router = express.Router();

/**
 * Validation middleware for task creation
 */


const validateTaskCreate = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed', 'archived'])
    .withMessage('Status must be one of: pending, in-progress, completed, archived'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date')
    .custom((value) => {
      const dueDate = new Date(value);
      const now = new Date();
      if (dueDate < now) {
        throw new Error('Due date must be in the future');
      }
      return true;
    }),
  body('assignedTo')
    .optional()
    .isArray()
    .withMessage('Assigned users must be an array'),
  body('assignedTo.*')
    .optional()
    .isMongoId()
    .withMessage('Each assigned user must be a valid user ID'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
];

/**
 * Validation middleware for task update
 */


const validateTaskUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed', 'archived'])
    .withMessage('Status must be one of: pending, in-progress, completed, archived'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),
  body('assignedTo')
    .optional()
    .isArray()
    .withMessage('Assigned users must be an array'),
  body('assignedTo.*')
    .optional()
    .isMongoId()
    .withMessage('Each assigned user must be a valid user ID'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
];

/**
 * Validation middleware for task query parameters
 */


const validateTaskQuery = [
  query('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed', 'archived'])
    .withMessage('Status must be one of: pending, in-progress, completed, archived'),
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  query('assignee')
    .optional()
    .isMongoId()
    .withMessage('Assignee must be a valid user ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'title'])
    .withMessage('Sort by must be one of: createdAt, updatedAt, dueDate, priority, status, title'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be either asc or desc'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
];

/**
 * Validation middleware for task ID parameter
 */


const validateTaskId = [
  param('id')
    .isMongoId()
    .withMessage('Task ID must be a valid MongoDB ObjectId')
];

/**
 * Validation middleware for user assignment
 */


const validateAssignment = [
  param('id')
    .isMongoId()
    .withMessage('Task ID must be a valid MongoDB ObjectId'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('User ID must be a valid MongoDB ObjectId')
];

/**
 * Validation middleware for user unassignment
 */


const validateUnassignment = [
  param('id')
    .isMongoId()
    .withMessage('Task ID must be a valid MongoDB ObjectId'),
  param('userId')
    .isMongoId()
    .withMessage('User ID must be a valid MongoDB ObjectId')
];

/**
 * Validation error handler middleware
 */


const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));

    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: formattedErrors
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: formattedErrors
    });
  }

  next();
};

/**
 * GET /tasks
 * Get all tasks with filtering, pagination, and search
 */
router.get('/', authenticate, validateTaskQuery, handleValidationErrors, async (req, res, next) => {
  try {
    const {
      status,
      priority,
      assignee,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
      search,
      startDate,
      endDate
    } = req.query;

    // Build query filter
    const filter = {};

    // Authorization: Users can only see tasks they created or are assigned to
    // Admins and managers can see all tasks
    if (!['admin', 'manager'].includes(req.user.role)) {
      filter.$or = [
        { createdBy: req.userId },
        { assignedTo: req.userId }
      ];
    }

    // Apply filters
    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (assignee) {
      filter.assignedTo = assignee;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Search filter (case-insensitive)
    if (search) {
      filter.$or = filter.$or || [];
      const searchRegex = new RegExp(search, 'i');
      filter.$or.push(
        { title: searchRegex },
        { description: searchRegex }
      );
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    // Execute query
    const [tasks, totalCount] = await Promise.all([
      Task.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email')
        .lean(),
      Task.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    logger.info('Fetched tasks', {
      userId: req.userId,
      count: tasks.length,
      page,
      totalCount
    });

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalCount,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Failed to fetch tasks', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /tasks/:id
 * Get task by ID
 */
router.get('/:id', authenticate, validateTaskId, handleValidationErrors, async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .lean();

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Authorization: Check if user has access to this task
    const isCreator = task.createdBy._id.toString() === req.userId.toString();
    const isAssigned = task.assignedTo.some(user => user._id.toString() === req.userId.toString());
    const isAdminOrManager = ['admin', 'manager'].includes(req.user.role);

    if (!isCreator && !isAssigned && !isAdminOrManager) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this task',
        code: 'UNAUTHORIZED'
      });
    }

    logger.info('Fetched task by ID', {
      userId: req.userId,
      taskId: id
    });

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Failed to fetch task', {
      userId: req.userId,
      taskId: req.params.id,
      error: error.message
    });
    next(error);
  }
});

/**
 * POST /tasks
 * Create new task
 */
router.post('/', authenticate, validateTaskCreate, handleValidationErrors, async (req, res, next) => {
  try {
    const {
      title,
      description,
      status = 'pending',
      priority = 'medium',
      dueDate,
      assignedTo = [],
      tags = []
    } = req.body;

    // Validate assigned users exist
    if (assignedTo.length > 0) {
      const users = await User.find({ _id: { $in: assignedTo } });
      if (users.length !== assignedTo.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more assigned users not found',
          code: 'USER_NOT_FOUND'
        });
      }
    }

    // Create task
    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      assignedTo,
      tags,
      createdBy: req.userId
    });

    // Populate references
    await task.populate('createdBy', 'name email');
    await task.populate('assignedTo', 'name email');

    logger.info('Created new task', {
      userId: req.userId,
      taskId: task._id,
      title: task.title
    });

    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully'
    });
  } catch (error) {
    logger.error('Failed to create task', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
});

/**
 * PATCH /tasks/:id
 * Update task
 */
router.patch('/:id', authenticate, validateTaskId, validateTaskUpdate, handleValidationErrors, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find task
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Authorization: Check if user can update this task
    const isCreator = task.createdBy.toString() === req.userId.toString();
    const isAssigned = task.assignedTo.some(userId => userId.toString() === req.userId.toString());
    const isAdminOrManager = ['admin', 'manager'].includes(req.user.role);

    if (!isCreator && !isAssigned && !isAdminOrManager) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this task',
        code: 'UNAUTHORIZED'
      });
    }

    // Validate assigned users if being updated
    if (updates.assignedTo && updates.assignedTo.length > 0) {
      const users = await User.find({ _id: { $in: updates.assignedTo } });
      if (users.length !== updates.assignedTo.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more assigned users not found',
          code: 'USER_NOT_FOUND'
        });
      }
    }

    // Update task
    Object.assign(task, updates);
    task.updatedAt = new Date();
    await task.save();

    // Populate references
    await task.populate('createdBy', 'name email');
    await task.populate('assignedTo', 'name email');

    logger.info('Updated task', {
