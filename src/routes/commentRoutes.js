// File: src/routes/commentRoutes.js
// Generated: 2025-10-16 07:50:36 UTC
// Project ID: proj_aca83c949445
// Task ID: task_2pfwbwvy3ijk


const express = require('express');


const logger = require('../utils/logger');

const { Validator } = require('../middleware/validator');

const { authenticate } = require('../middleware/auth');

const { checkTaskAccess } = require('../middleware/authorization');

const { rateLimiter } = require('../middleware/rateLimiter');


const router = express.Router();

const {
  getComments,
  getCommentById,
  createComment,
  updateComment,
  deleteComment
} = require('../controllers/commentController');

// Validation schemas


const commentValidation = {
  taskId: Validator.isMongoId('taskId'),
  commentId: Validator.isMongoId('commentId'),
  createComment: [
    Validator.isMongoId('taskId'),
    Validator.isString('content', { min: 1, max: 1000, required: true })
  ],
  updateComment: [
    Validator.isMongoId('commentId'),
    Validator.isString('content', { min: 1, max: 1000, required: true })
  ],
  getComments: [
    Validator.isMongoId('taskId'),
    Validator.isInt('page', { min: 1, optional: true }),
    Validator.isInt('limit', { min: 1, max: 100, optional: true }),
    Validator.isIn('sort', ['createdAt', '-createdAt'], { optional: true })
  ]
};

// Rate limiting configuration


const commentRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: 'Too many comment requests, please try again later'
});


const createCommentRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 comment creations per window
  message: 'Too many comments created, please try again later'
});

/**
 * @route   GET /api/tasks/:taskId/comments
 * @desc    Get all comments for a specific task
 * @access  Private (requires authentication)
 * @params  taskId - MongoDB ObjectId of the task
 * @query   page - Page number (default: 1)
 * @query   limit - Results per page (default: 10, max: 100)
 * @query   sort - Sort order (createdAt or -createdAt, default: -createdAt)
 */
router.get('/tasks/:taskId/comments',
  authenticate,
  commentRateLimiter,
  commentValidation.getComments,
  checkTaskAccess,
  async (req, res, next) => {
    try {
      logger.info('Fetching comments for task', {
        taskId: req.params.taskId,
        userId: req.userId
      });
      await getComments(req, res, next);
    } catch (error) {
      logger.error('Error fetching task comments', {
        taskId: req.params.taskId,
        error: error.message
      });
      next(error);
    }
  }
);

/**
 * @route   POST /api/tasks/:taskId/comments
 * @desc    Create a new comment on a task
 * @access  Private (requires authentication)
 * @params  taskId - MongoDB ObjectId of the task
 * @body    content - Comment text (1-1000 characters)
 */
router.post('/tasks/:taskId/comments',
  authenticate,
  createCommentRateLimiter,
  commentValidation.createComment,
  checkTaskAccess,
  async (req, res, next) => {
    try {
      logger.info('Creating comment on task', {
        taskId: req.params.taskId,
        userId: req.userId
      });
      await createComment(req, res, next);
    } catch (error) {
      logger.error('Error creating comment', {
        taskId: req.params.taskId,
        error: error.message
      });
      next(error);
    }
  }
);

/**
 * @route   GET /api/comments/:commentId
 * @desc    Get a single comment by ID
 * @access  Private (requires authentication)
 * @params  commentId - MongoDB ObjectId of the comment
 */
router.get('/comments/:commentId',
  authenticate,
  commentRateLimiter,
  commentValidation.commentId,
  async (req, res, next) => {
    try {
      logger.info('Fetching comment by ID', {
        commentId: req.params.commentId,
        userId: req.userId
      });
      await getCommentById(req, res, next);
    } catch (error) {
      logger.error('Error fetching comment', {
        commentId: req.params.commentId,
        error: error.message
      });
      next(error);
    }
  }
);

/**
 * @route   PUT /api/comments/:commentId
 * @desc    Update a comment
 * @access  Private (requires authentication, user must own comment)
 * @params  commentId - MongoDB ObjectId of the comment
 * @body    content - Updated comment text (1-1000 characters)
 */
router.put('/comments/:commentId',
  authenticate,
  commentRateLimiter,
  commentValidation.updateComment,
  async (req, res, next) => {
    try {
      logger.info('Updating comment', {
        commentId: req.params.commentId,
        userId: req.userId
      });
      await updateComment(req, res, next);
    } catch (error) {
      logger.error('Error updating comment', {
        commentId: req.params.commentId,
        error: error.message
      });
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/comments/:commentId
 * @desc    Delete a comment
 * @access  Private (requires authentication, user must own comment)
 * @params  commentId - MongoDB ObjectId of the comment
 */
router.delete('/comments/:commentId',
  authenticate,
  commentRateLimiter,
  commentValidation.commentId,
  async (req, res, next) => {
    try {
      logger.info('Deleting comment', {
        commentId: req.params.commentId,
        userId: req.userId
      });
      await deleteComment(req, res, next);
    } catch (error) {
      logger.error('Error deleting comment', {
        commentId: req.params.commentId,
        error: error.message
      });
      next(error);
    }
  }
);

module.exports = router;
