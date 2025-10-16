// File: src/controllers/commentController.js
// Generated: 2025-10-16 07:49:28 UTC
// Project ID: proj_aca83c949445
// Task ID: task_a4wap0fg4uin


const Comment = require('../models/Comment');


const Task = require('../models/Task');


const logger = require('../utils/logger');

/**
 * Validate and sanitize pagination parameters
 */


const validatePaginationParams = (page, limit) => {
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);

  // Validate page
  if (isNaN(parsedPage) || parsedPage < 1) {
    return { page: 1, limit: 20, error: 'Invalid page parameter' };
  }
  if (parsedPage > 10000) {
    return { page: 1, limit: 20, error: 'Page parameter exceeds maximum allowed value' };
  }

  // Validate limit
  if (isNaN(parsedLimit) || parsedLimit < 1) {
    return { page: parsedPage, limit: 20, error: 'Invalid limit parameter' };
  }
  if (parsedLimit > 100) {
    return { page: parsedPage, limit: 100, error: 'Limit parameter exceeds maximum allowed value of 100' };
  }

  return { page: parsedPage, limit: parsedLimit, error: null };
};

/**
 * Validate and sanitize sort parameter
 */


const validateSortParam = (sort) => {
  const allowedSortFields = ['createdAt', '-createdAt', 'updatedAt', '-updatedAt'];

  if (!allowedSortFields.includes(sort)) {
    return '-createdAt'; // Default safe sort
  }

  return sort;
};

/**
 * Get all comments for a task
 * GET /api/tasks/:taskId/comments
 */
exports.getComments = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { page = 1, limit = 20, sort = '-createdAt', includeDeleted = false } = req.query;

    // Validate and sanitize pagination parameters
    const { page: validPage, limit: validLimit, error: paginationError } = validatePaginationParams(page, limit);
    if (paginationError) {
      return res.status(400).json({
        success: false,
        error: paginationError
      });
    }

    // Validate and sanitize sort parameter
    const validSort = validateSortParam(sort);

    // Verify task exists
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check if user has access to the task
    if (task.assignee.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view comments for this task'
      });
    }

    // Parse includeDeleted as boolean
    const shouldIncludeDeleted = includeDeleted === 'true' || includeDeleted === true;

    // Fetch comments with pagination
    const query = { task: taskId };
    if (!shouldIncludeDeleted) {
      query.isDeleted = false;
    }

    const comments = await Comment.find(query)
      .populate('author', 'name email')
      .populate('deletedBy', 'name email')
      .sort(validSort)
      .limit(validLimit)
      .skip((validPage - 1) * validLimit)
      .lean();

    const totalComments = await Comment.countDocuments(query);

    logger.info('Fetched comments for task', {
      taskId,
      userId: req.userId,
      count: comments.length,
      page: validPage,
      includeDeleted: shouldIncludeDeleted
    });

    res.json({
      success: true,
      data: comments,
      pagination: {
        currentPage: validPage,
        totalPages: Math.ceil(totalComments / validLimit),
        totalComments,
        limit: validLimit
      }
    });
  } catch (error) {
    logger.error('Failed to fetch comments', {
      taskId: req.params.taskId,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get a single comment by ID
 * GET /api/comments/:commentId
 */
exports.getCommentById = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId)
      .populate('author', 'name email')
      .populate('task', 'title assignee')
      .populate('deletedBy', 'name email');

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Check if user has access to the comment's task
    if (comment.task.assignee.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this comment'
      });
    }

    logger.info('Fetched comment by ID', {
      commentId,
      userId: req.userId
    });

    res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    logger.error('Failed to fetch comment', {
      commentId: req.params.commentId,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Create a new comment on a task
 * POST /api/tasks/:taskId/comments
 */
exports.createComment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Comment exceeds maximum length of 2000 characters'
      });
    }

    // Verify task exists
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check if user has access to the task
    if (task.assignee.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to comment on this task'
      });
    }

    // Create comment
    const comment = new Comment({
      content: content.trim(),
      author: req.userId,
      task: taskId
    });

    await comment.save();

    // Populate author details before returning
    await comment.populate('author', 'name email');

    logger.info('Created comment', {
      commentId: comment._id,
      taskId,
      userId: req.userId
    });

    res.status(201).json({
      success: true,
      data: comment,
      message: 'Comment created successfully'
    });
  } catch (error) {
    logger.error('Failed to create comment', {
      taskId: req.params.taskId,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Update a comment
 * PATCH /api/comments/:commentId
 */
exports.updateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Comment exceeds maximum length of 2000 characters'
      });
    }

    // Find comment
    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Check if user can modify the comment
    if (!comment.canModify(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to edit this comment'
      });
    }

    // Check edit time window (15 minutes)
    const editWindow = 15 * 60 * 1000;
    const timeSinceCreation = Date.now() - comment.createdAt.getTime();
    if (timeSinceCreation > editWindow) {
      return res.status(403).json({
        success: false,
        error: 'Edit time window has expired (15 minutes)'
      });
    }

    // Store original content in edit history
    if (!comment.editHistory) {
      comment.editHistory = [];
    }
    comment.editHistory.push({
      content: comment.content,
      editedAt: new Date()
    });

    // Update comment
    comment.content = content.trim();
    comment.isEdited = true;
    await comment.save();

    await comment.populate('author', 'name email');

    logger.info('Updated comment', {
      commentId,
      userId: req.userId,
      editCount: comment.editHistory.length
    });

    res.json({
      success: true,
      data: comment,
      message: 'Comment updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update comment', {
      commentId: req.params.commentId,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Delete a comment (soft delete)
 * DELETE /api/comments/:commentId
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    // Find comment
    const comment = await Comment.findById(commentId).populate('task', 'assignee');
    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Check authorization (author or task owner can delete)
    const isAuthor = comment.author.toString() === req.userId.toString();
    const isTaskOwner = comment.task.assignee.toString() === req.userId.toString();

    if (!isAuthor && !isTaskOwner) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this comment'
      });
    }

    // Soft delete the comment
    await comment.softDelete(req.userId);

    logger.info('Deleted comment', {
      commentId,
      userId: req.userId,
      deletedBy: isAuthor ? 'author' : 'task_owner'
    });

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete comment', {
      commentId: req.params.commentId,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

module.exports = {
  getComments,
  getCommentById,
  createComment,
  updateComment,
  deleteComment
};
