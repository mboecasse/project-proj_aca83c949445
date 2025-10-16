// File: src/models/Task.js
// Generated: 2025-10-16 07:46:56 UTC
// Project ID: proj_aca83c949445
// Task ID: task_w9nf2ayn94u0


const logger = require('../utils/logger');


const mongoose = require('mongoose');

/**
 * Task Schema
 * Defines the structure and validation rules for task documents
 */


const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'in-progress', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid status'
      },
      default: 'pending',
      lowercase: true,
      trim: true
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: '{VALUE} is not a valid priority'
      },
      default: 'medium',
      lowercase: true,
      trim: true
    },
    dueDate: {
      type: Date,
      validate: {
        validator: function(value) {
          // Allow null/undefined (optional field)
          if (!value) return true;
          // For new documents, due date must be in the future
          if (this.isNew) {
            const now = new Date();
            return value > now;
          }
          // For updates, allow past dates if task is already completed/cancelled
          return true;
        },
        message: 'Due date must be in the future for new tasks'
      }
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must be assigned to a user'],
      index: true
    },
    category: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [50, 'Category cannot exceed 50 characters']
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/**
 * Indexes for optimized queries
 */
// Compound index for common queries
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ category: 1, assignee: 1 });
taskSchema.index({ priority: -1, dueDate: 1 });

/**
 * Virtual property to check if task is overdue
 */
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate) return false;
  return this.dueDate < new Date() &&
         this.status !== 'completed' &&
         this.status !== 'cancelled';
});

/**
 * Virtual property to calculate days until due
 */
taskSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const diff = this.dueDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

/**
 * Pre-save middleware
 * Automatically set completedAt when task is marked as completed
 */
taskSchema.pre('save', function(next) {
  try {
    // Set completedAt when status changes to completed
    if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
      logger.debug('Task marked as completed', { taskId: this._id });
    }

    // Clear completedAt if status changes from completed to something else
    if (this.isModified('status') && this.status !== 'completed' && this.completedAt) {
      this.completedAt = undefined;
      logger.debug('Task status changed from completed', { taskId: this._id });
    }

    next();
  } catch (error) {
    logger.error('Error in task pre-save middleware', { error: error.message });
    next(error);
  }
});

/**
 * Pre-update middleware for findOneAndUpdate
 * Handle completedAt for update operations
 */
taskSchema.pre('findOneAndUpdate', function(next) {
  try {
    const update = this.getUpdate();

    // Handle $set operator
    if (update.$set && update.$set.status === 'completed' && !update.$set.completedAt) {
      update.$set.completedAt = new Date();
    }

    // Handle direct update
    if (update.status === 'completed' && !update.completedAt) {
      if (update.$set) {
        update.$set.completedAt = new Date();
      } else {
        update.completedAt = new Date();
      }
    }

    // Clear completedAt if status changes from completed
    if ((update.$set && update.$set.status && update.$set.status !== 'completed') ||
        (update.status && update.status !== 'completed')) {
      if (update.$set) {
        update.$set.completedAt = null;
      } else {
        update.completedAt = null;
      }
    }

    next();
  } catch (error) {
    logger.error('Error in task pre-update middleware', { error: error.message });
    next(error);
  }
});

/**
 * Instance method: Mark task as completed
 * @returns {Promise<Task>} Updated task
 */
taskSchema.methods.markAsCompleted = async function() {
  try {
    this.status = 'completed';
    this.completedAt = new Date();
    const saved = await this.save();
    logger.info('Task marked as completed', { taskId: this._id });
    return saved;
  } catch (error) {
    logger.error('Failed to mark task as completed', {
      taskId: this._id,
      error: error.message
    });
    throw error;
  }
};

/**
 * Instance method: Reassign task to new user
 * @param {ObjectId} newAssigneeId - ID of the new assignee
 * @returns {Promise<Task>} Updated task
 */
taskSchema.methods.reassign = async function(newAssigneeId) {
  try {
    this.assignee = newAssigneeId;
    const saved = await this.save();
    logger.info('Task reassigned', {
      taskId: this._id,
      newAssignee: newAssigneeId
    });
    return saved;
  } catch (error) {
    logger.error('Failed to reassign task', {
      taskId: this._id,
      error: error.message
    });
    throw error;
  }
};

/**
 * Static method: Find tasks by assignee with optional filters
 * @param {ObjectId} assigneeId - ID of the assignee
 * @param {Object} filters - Additional filters (status, priority, etc.)
 * @returns {Promise<Array>} Array of tasks
 */
taskSchema.statics.findByAssignee = function(assigneeId, filters = {}) {
  try {
    return this.find({ assignee: assigneeId, ...filters })
      .populate('assignee', 'name email')
      .sort({ dueDate: 1, priority: -1 })
      .exec();
  } catch (error) {
    logger.error('Failed to find tasks by assignee', {
      assigneeId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Static method: Get all overdue tasks
 * @returns {Promise<Array>} Array of overdue tasks
 */
taskSchema.statics.getOverdueTasks = function() {
  try {
    return this.find({
      dueDate: { $lt: new Date() },
      status: { $nin: ['completed', 'cancelled'] }
    })
      .populate('assignee', 'name email')
      .sort({ dueDate: 1 })
      .exec();
  } catch (error) {
    logger.error('Failed to get overdue tasks', { error: error.message });
    throw error;
  }
};

/**
 * Static method: Get task statistics for a user
 * @param {ObjectId} assigneeId - ID of the assignee
 * @returns {Promise<Array>} Aggregated statistics
 */
taskSchema.statics.getTaskStatistics = function(assigneeId) {
  try {
    return this.aggregate([
      {
        $match: {
          assignee: mongoose.Types.ObjectId(assigneeId)
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]).exec();
  } catch (error) {
    logger.error('Failed to get task statistics', {
      assigneeId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Static method: Get tasks by category
 * @param {String} category - Category name
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} Array of tasks
 */
taskSchema.statics.findByCategory = function(category, filters = {}) {
  try {
    // Sanitize category input to prevent NoSQL injection
    if (typeof category !== 'string') {
      throw new Error('Category must be a string');
    }

    const sanitizedCategory = category.toLowerCase().trim();

    return this.find({ category: sanitizedCategory, ...filters })
      .populate('assignee', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  } catch (error) {
    logger.error('Failed to find tasks by category', {
      category,
      error: error.message
    });
    throw error;
  }
};

/**
 * Static method: Get tasks due within specified days
 * @param {Number} days - Number of days to look ahead
 * @param {ObjectId} assigneeId - Optional assignee filter
 * @returns {Promise<Array>} Array of tasks
 */
taskSchema.statics.getTasksDueWithin = function(days, assigneeId = null) {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const query = {
      dueDate: {
        $gte: new Date(),
        $lte: futureDate
      },
      status: { $nin: ['completed', 'cancelled'] }
    };

    if (assigneeId) {
      query.assignee = assigneeId;
    }

    return this.find(query)
      .populate('assignee', 'name email')
      .sort({ dueDate: 1, priority: -1 })
      .exec();
  } catch (error) {
    logger.error('Failed to get tasks due within days', {
      days,
      assigneeId,
      error: error.message
    });
    throw error;
  }
};


const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
