// File: src/controllers/taskController.js
// Generated: 2025-10-16 07:49:19 UTC
// Project ID: proj_aca83c949445
// Task ID: task_30yr0mij0kuu


const Task = require('../models/Task');


const User = require('../models/User');


const logger = require('../utils/logger');


const mongoose = require('mongoose');

/**
 * Sanitize and validate string input
 */


const sanitizeString = (input, maxLength = 100) => {
  if (typeof input !== 'string') {
    return null;
  }
  return input.slice(0, maxLength).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Validate enum values
 */


const validateEnum = (value, allowedValues) => {
  if (typeof value !== 'string') {
    return null;
  }
  return allowedValues.includes(value) ? value : null;
};

/**
 * Validate MongoDB ObjectId
 */


const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && typeof id === 'string';
};

/**
 * Get all tasks with filtering, search, pagination, and sorting
 * @route GET /api/tasks
 * @access Private
 */
exports.getTasks = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
      startDate,
      endDate
    } = req.query;

    // Build query object
    const query = {};
    const authFilter = [];

    // Authorization filter - users see only their tasks unless admin
    if (req.user.role !== 'admin') {
      authFilter.push(
        { createdBy: req.userId },
        { assignedTo: req.userId }
      );
    }

    // Validate and apply filters
    const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const validSortFields = ['createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'title'];

    if (status) {
      const sanitizedStatus = validateEnum(status, validStatuses);
      if (sanitizedStatus) {
        query.status = sanitizedStatus;
      }
    }

    if (priority) {
      const sanitizedPriority = validateEnum(priority, validPriorities);
      if (sanitizedPriority) {
        query.priority = sanitizedPriority;
      }
    }

    if (assignedTo) {
      if (isValidObjectId(assignedTo)) {
        query.assignedTo = assignedTo;
      }
    }

    // Date range filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          query.createdAt.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          query.createdAt.$lte = end;
        }
      }
      if (Object.keys(query.createdAt).length === 0) {
        delete query.createdAt;
      }
    }

    // Search functionality - search in title and description with sanitization
    const searchConditions = [];
    if (search && typeof search === 'string' && search.length > 0) {
      const sanitizedSearch = sanitizeString(search, 200);
      if (sanitizedSearch && sanitizedSearch.length > 0) {
        searchConditions.push(
          { title: { $regex: sanitizedSearch, $options: 'i' } },
          { description: { $regex: sanitizedSearch, $options: 'i' } }
        );
      }
    }

    // Combine authorization filter and search conditions
    if (authFilter.length > 0 && searchConditions.length > 0) {
      query.$and = [
        { $or: authFilter },
        { $or: searchConditions }
      ];
    } else if (authFilter.length > 0) {
      query.$or = authFilter;
    } else if (searchConditions.length > 0) {
      query.$or = searchConditions;
    }

    // Validate and sanitize pagination and sorting
    const sanitizedPage = Math.max(1, parseInt(page) || 1);
    const sanitizedLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const sanitizedSortBy = validateEnum(sortBy, validSortFields) || 'createdAt';
    const sanitizedOrder = order === 'asc' ? 1 : -1;

    // Pagination
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    // Execute query with population
    const tasks = await Task.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ [sanitizedSortBy]: sanitizedOrder })
      .skip(skip)
      .limit(sanitizedLimit);

    // Get total count for pagination
    const total = await Task.countDocuments(query);

    logger.info('Fetched tasks', {
      userId: req.userId,
      count: tasks.length,
      total,
      filters: { status, priority, assignedTo, search }
    });

    res.status(200).json({
      success: true,
      data: tasks,
      pagination: {
        page: sanitizedPage,
        limit: sanitizedLimit,
        total,
        pages: Math.ceil(total / sanitizedLimit)
      }
    });
  } catch (error) {
    logger.error('Failed to fetch tasks', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get single task by ID
 * @route GET /api/tasks/:id
 * @access Private
 */
exports.getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID'
      });
    }

    const task = await Task.findById(id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Authorization check - only creator, assignee, or admin can view
    const isCreator = task.createdBy._id.toString() === req.userId;
    const isAssignee = task.assignedTo && task.assignedTo._id.toString() === req.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isCreator && !isAssignee && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this task'
      });
    }

    logger.info('Fetched task by ID', {
      taskId: id,
      userId: req.userId
    });

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Failed to fetch task', {
      taskId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Create new task
 * @route POST /api/tasks
 * @access Private
 */
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, dueDate, priority, assignedTo, category } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required'
      });
    }

    // Validate due date is not in the past
    if (dueDate && new Date(dueDate) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Due date cannot be in the past'
      });
    }

    // Validate assignee exists if provided
    if (assignedTo) {
      if (!isValidObjectId(assignedTo)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid assignee ID'
        });
      }
      const assigneeExists = await User.findById(assignedTo);
      if (!assigneeExists) {
        return res.status(404).json({
          success: false,
          error: 'Assigned user not found'
        });
      }
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const sanitizedPriority = validateEnum(priority, validPriorities) || 'medium';

    // Create task
    const task = new Task({
      title,
      description,
      dueDate,
      priority: sanitizedPriority,
      status: 'pending',
      createdBy: req.userId,
      assignedTo,
      category
    });

    await task.save();
    await task.populate('createdBy assignedTo', 'name email');

    logger.info('Task created', {
      taskId: task._id,
      userId: req.userId,
      assignedTo
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
};

/**
 * Update task
 * @route PUT /api/tasks/:id
 * @access Private
 */
exports.updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID'
      });
    }

    // Find task first to check permissions
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Authorization check - creator, assignee, or admin can update
    const isCreator = task.createdBy.toString() === req.userId;
    const isAssignee = task.assignedTo && task.assignedTo.toString() === req.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isCreator && !isAssignee && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this task'
      });
    }

    // Prevent updating protected fields
    delete updates.createdBy;
    delete updates.createdAt;

    // Validate status transition if status is being updated
    if (updates.status) {
      const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
      const sanitizedStatus = validateEnum(updates.status, validStatuses);

      if (!sanitizedStatus) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status value'
        });
      }

      const validTransitions = {
        'pending': ['in-progress', 'cancelled'],
        'in-progress': ['completed', 'pending'],
        'completed': [],
        'cancelled': ['pending']
      };

      const currentStatus = task.status;
      if (!validTransitions[currentStatus].includes(sanitizedStatus)) {
        return res.status(400).json({
          success: false,
          error: `Cannot transition from ${currentStatus} to ${sanitizedStatus}`
        });
      }

      updates.status = sanitizedStatus;

      // Set completedAt if marking as completed
      if (sanitizedStatus === 'completed') {
        updates.completedAt = new Date();
      }
    }

    // Validate priority if being updated
    if (updates.priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      const sanitizedPriority = validateEnum(updates.priority, validPriorities);
      if (!sanitizedPriority) {
        return res.status(400).json({
          success: false,
          error: 'Invalid priority value'
        });
      }
      updates.priority = sanitizedPriority;
    }

    // Validate assignee exists if being changed
    if (updates.assignedTo) {
      if (!isValidObjectId(updates.assignedTo)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid assignee ID'
        });
      }
      const assigneeExists = await User.findById(updates.assignedTo);
      if (!assigneeExists) {
        return res.status(404).json({
          success: false,
          error: 'Assigned user not found'
        });
      }
    }

    // Validate due date if being updated
    if (updates.dueDate && new Date(updates.dueDate) < new Date() && task.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Due date cannot be in the past'
      });
    }

    // Update task
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy assignedTo', 'name email');

    logger.info('Task updated', {
      taskId: id,
      userId: req.userId,
      updates: Object.keys(updates)
    });

    res.status(200).json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update task', {
      taskId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Delete task
 * @route DELETE /api/tasks/:id
 * @access Private
 */
exports.deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID'
      });
    }

    // Find task first to check permissions
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Authorization check - only creator or admin can delete
    const isCreator = task.createdBy.toString() === req.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this task'
      });
    }

    await Task.findByIdAndDelete(id);

    logger.info('Task deleted', {
      taskId: id,
      userId: req.userId
    });

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: { id }
    });
  } catch (error) {
    logger.error('Failed to delete task', {
      taskId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Assign task to user
