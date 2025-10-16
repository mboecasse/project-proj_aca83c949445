// File: src/validators/taskValidator.js
// Generated: 2025-10-16 07:46:36 UTC
// Project ID: proj_aca83c949445
// Task ID: task_ddq1fevfc3et


const mongoose = require('mongoose');

const { body, param, query } = require('express-validator');

/**
 * Validation rules for creating a new task
 * @type {Array}
 */


const createTaskValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters')
    .escape(),

  body('status')
    .optional()
    .trim()
    .isIn(['pending', 'in-progress', 'completed'])
    .withMessage('Status must be one of: pending, in-progress, completed'),

  body('priority')
    .optional()
    .trim()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date')
    .custom((value) => {
      const dueDate = new Date(value);
      const now = new Date();
      if (dueDate <= now) {
        throw new Error('Due date must be in the future');
      }
      return true;
    }),

  body('assignedTo')
    .optional()
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Assigned user ID must be a valid MongoDB ObjectId');
      }
      return true;
    })
];

/**
 * Validation rules for updating a task
 * All fields are optional for partial updates
 * @type {Array}
 */


const updateTaskValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters')
    .escape(),

  body('status')
    .optional()
    .trim()
    .isIn(['pending', 'in-progress', 'completed'])
    .withMessage('Status must be one of: pending, in-progress, completed'),

  body('priority')
    .optional()
    .trim()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date')
    .custom((value) => {
      if (value) {
        const dueDate = new Date(value);
        if (isNaN(dueDate.getTime())) {
          throw new Error('Invalid date format');
        }
      }
      return true;
    }),

  body('assignedTo')
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Assigned user ID must be a valid MongoDB ObjectId');
      }
      return true;
    }),

  body('createdBy')
    .not()
    .exists()
    .withMessage('Cannot update createdBy field')
];

/**
 * Validation rules for task ID parameter
 * @type {Array}
 */


const taskIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('Task ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid task ID format');
      }
      return true;
    })
];

/**
 * Validation rules for task query parameters
 * Used for filtering and pagination
 * @type {Array}
 */


const taskQueryValidation = [
  query('status')
    .optional()
    .trim()
    .isIn(['pending', 'in-progress', 'completed'])
    .withMessage('Status must be one of: pending, in-progress, completed'),

  query('priority')
    .optional()
    .trim()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('sortBy')
    .optional()
    .trim()
    .isIn(['createdAt', 'updatedAt', 'dueDate', 'title', 'priority', 'status'])
    .withMessage('Invalid sort field'),

  query('order')
    .optional()
    .trim()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be either asc or desc'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search query must not exceed 200 characters')
    .escape(),

  query('assignedTo')
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Assigned user ID must be a valid MongoDB ObjectId');
      }
      return true;
    }),

  query('dueDateFrom')
    .optional()
    .isISO8601()
    .withMessage('Due date from must be a valid date'),

  query('dueDateTo')
    .optional()
    .isISO8601()
    .withMessage('Due date to must be a valid date')
];

/**
 * Validation rules for bulk task operations
 * @type {Array}
 */


const bulkTaskValidation = [
  body('taskIds')
    .isArray({ min: 1, max: 1000 })
    .withMessage('Task IDs must be a non-empty array with maximum 1000 items')
    .custom((value) => {
      if (!Array.isArray(value)) {
        throw new Error('Task IDs must be an array');
      }
      if (value.length > 1000) {
        throw new Error('Task IDs array cannot exceed 1000 items');
      }
      for (const id of value) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error('All task IDs must be valid MongoDB ObjectIds');
        }
      }
      return true;
    }),

  body('action')
    .optional()
    .trim()
    .isIn(['delete', 'updateStatus', 'updatePriority'])
    .withMessage('Action must be one of: delete, updateStatus, updatePriority'),

  body('status')
    .if(body('action').equals('updateStatus'))
    .trim()
    .isIn(['pending', 'in-progress', 'completed'])
    .withMessage('Status must be one of: pending, in-progress, completed'),

  body('priority')
    .if(body('action').equals('updatePriority'))
    .trim()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high')
];

module.exports = {
  createTaskValidation,
  updateTaskValidation,
  taskIdValidation,
  taskQueryValidation,
  bulkTaskValidation
};
