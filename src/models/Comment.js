// File: src/models/Comment.js
// Generated: 2025-10-16 07:47:03 UTC
// Project ID: proj_aca83c949445
// Task ID: task_c0qhlwcujib8


const logger = require('../utils/logger');


const mongoose = require('mongoose');

/**
 * Comment Schema
 * Represents comments and notes on tasks
 */


const commentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task reference is required'],
      index: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true
    },
    content: {
      type: String,
      required: [true, 'Comment content cannot be empty'],
      trim: true,
      minlength: [1, 'Comment must have content'],
      maxlength: [2000, 'Comment cannot exceed 2000 characters']
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editHistory: [
      {
        content: {
          type: String,
          required: true
        },
        editedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Compound indexes for query performance
commentSchema.index({ task: 1, createdAt: 1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ task: 1, isDeleted: 1, createdAt: 1 });

/**
 * Custom validator to prevent empty or whitespace-only comments
 */
commentSchema.path('content').validate(function (value) {
  return value && value.trim().length > 0;
}, 'Comment cannot be empty or contain only whitespace');

/**
 * Pre-save hook to validate task exists
 */
commentSchema.pre('save', async function (next) {
  try {
    if (this.isNew) {
      const Task = mongoose.model('Task');
      const taskExists = await Task.exists({ _id: this.task });
      if (!taskExists) {
        const error = new Error('Referenced task does not exist');
        logger.error('Comment validation failed: task not found', {
          taskId: this.task
        });
        throw error;
      }
    }
    next();
  } catch (error) {
    logger.error('Pre-save validation error', {
      error: error.message,
      taskId: this.task
    });
    next(error);
  }
});

/**
 * Pre-save hook to track edit history
 */
commentSchema.pre('save', function (next) {
  try {
    if (!this.isNew && this.isModified('content')) {
      this.isEdited = true;
      const originalContent = this._doc && this._doc.content;
      if (originalContent && originalContent !== this.content) {
        this.editHistory.push({
          content: originalContent,
          editedAt: new Date()
        });
      }
    }
    next();
  } catch (error) {
    logger.error('Pre-save edit history error', {
      error: error.message,
      commentId: this._id
    });
    next(error);
  }
});

/**
 * Post-save hook to update task's lastActivity timestamp
 */
commentSchema.post('save', async function (doc) {
  try {
    const Task = mongoose.model('Task');
    await Task.findByIdAndUpdate(doc.task, {
      lastActivity: new Date()
    });
    logger.info('Task lastActivity updated after comment save', {
      taskId: doc.task,
      commentId: doc._id
    });
  } catch (error) {
    logger.error('Failed to update task lastActivity', {
      error: error.message,
      taskId: doc.task,
      commentId: doc._id
    });
  }
});

/**
 * Post-validation error handler
 */
commentSchema.post('save', function (error, doc, next) {
  if (error.name === 'ValidationError') {
    logger.error('Comment validation failed', {
      error: error.message,
      errors: error.errors
    });
    next(new Error(`Comment validation failed: ${error.message}`));
  } else {
    next(error);
  }
});

/**
 * Instance method to soft delete a comment
 * @param {ObjectId} deletedByUserId - ID of user deleting the comment
 * @returns {Promise<Comment>} Updated comment
 */
commentSchema.methods.softDelete = async function (deletedByUserId) {
  try {
    if (!this.canModify(deletedByUserId)) {
      const error = new Error('Unauthorized: Only the comment author can delete this comment');
      logger.error('Unauthorized comment deletion attempt', {
        commentId: this._id,
        authorId: this.author,
        attemptedBy: deletedByUserId
      });
      throw error;
    }

    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = deletedByUserId;
    await this.save();
    logger.info('Comment soft deleted', {
      commentId: this._id,
      deletedBy: deletedByUserId
    });
    return this;
  } catch (error) {
    logger.error('Failed to soft delete comment', {
      error: error.message,
      commentId: this._id
    });
    throw error;
  }
};

/**
 * Instance method to check if user can modify comment
 * @param {ObjectId} userId - ID of user attempting modification
 * @returns {Boolean} True if user can modify
 */
commentSchema.methods.canModify = function (userId) {
  return this.author.toString() === userId.toString();
};

/**
 * Static method to find all comments for a task
 * @param {ObjectId} taskId - Task ID
 * @param {Boolean} includeDeleted - Include soft-deleted comments
 * @returns {Promise<Array>} Array of comments
 */
commentSchema.statics.findByTask = async function (taskId, includeDeleted = false) {
  try {
    const query = { task: taskId };
    if (!includeDeleted) {
      query.isDeleted = false;
    }
    const comments = await this.find(query)
      .populate('author', 'name email')
      .sort({ createdAt: 1 });
    logger.info('Fetched comments for task', {
      taskId,
      count: comments.length,
      includeDeleted
    });
    return comments;
  } catch (error) {
    logger.error('Failed to fetch comments for task', {
      error: error.message,
      taskId
    });
    throw error;
  }
};

/**
 * Static method to count comments for a task
 * @param {ObjectId} taskId - Task ID
 * @returns {Promise<Number>} Comment count
 */
commentSchema.statics.countByTask = async function (taskId) {
  try {
    const count = await this.countDocuments({ task: taskId, isDeleted: false });
    logger.info('Counted comments for task', { taskId, count });
    return count;
  } catch (error) {
    logger.error('Failed to count comments for task', {
      error: error.message,
      taskId
    });
    throw error;
  }
};

/**
 * Static method to find comments by author
 * @param {ObjectId} authorId - Author ID
 * @param {Boolean} includeDeleted - Include soft-deleted comments
 * @returns {Promise<Array>} Array of comments
 */
commentSchema.statics.findByAuthor = async function (authorId, includeDeleted = false) {
  try {
    const query = { author: authorId };
    if (!includeDeleted) {
      query.isDeleted = false;
    }
    const comments = await this.find(query)
      .populate('task', 'title')
      .sort({ createdAt: -1 });
    logger.info('Fetched comments by author', {
      authorId,
      count: comments.length,
      includeDeleted
    });
    return comments;
  } catch (error) {
    logger.error('Failed to fetch comments by author', {
      error: error.message,
      authorId
    });
    throw error;
  }
};

/**
 * Virtual property to check if comment was edited
 */
commentSchema.virtual('wasEdited').get(function () {
  return this.updatedAt > this.createdAt;
});

/**
 * Transform output for JSON responses
 */
commentSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    if (ret.isDeleted) {
      ret.content = '[This comment has been deleted]';
      delete ret.editHistory;
    }
    return ret;
  }
});

/**
 * Transform output for object responses
 */
commentSchema.set('toObject', {
  virtuals: true
});


const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
