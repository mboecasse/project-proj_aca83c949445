// File: src/controllers/userController.js
// Generated: 2025-10-16 07:48:22 UTC
// Project ID: proj_aca83c949445
// Task ID: task_5a03tcker86d


const User = require('../models/User');


const bcrypt = require('bcryptjs');


const logger = require('../utils/logger');

/**
 * Get all users
 * @route GET /api/users
 * @access Private (Admin only)
 */


const getUsers = async (req, res, next) => {
  try {
    // Only admins can view all users
    if (!req.user || req.user.role !== 'admin') {
      logger.warn('Unauthorized access attempt to get all users', { userId: req.user?._id });
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.'
      });
    }

    const users = await User.find({ isDeleted: { $ne: true } }).select('-password -__v');

    logger.info('Users retrieved', { count: users.length, adminId: req.user._id });

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Get users error', { error: error.message });
    next(error);
  }
};

/**
 * Get user by ID
 * @route GET /api/users/:id
 * @access Private
 */


const getUserById = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Authorization check: users can only view their own profile unless they're admin
    if (!req.user) {
      logger.warn('Unauthorized access attempt - no user in request', { userId });
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      logger.warn('Unauthorized access attempt to view user profile', {
        requesterId: req.user._id,
        targetUserId: userId
      });
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own profile.'
      });
    }

    const user = await User.findById(userId).select('-password -__v');

    if (!user) {
      logger.warn('User not found', { userId });
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    logger.info('User retrieved', { userId, requesterId: req.user._id });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get user by ID error', { userId: req.params.id, error: error.message });
    next(error);
  }
};

/**
 * Create user
 * @route POST /api/users
 * @access Private (Admin only)
 */


const createUser = async (req, res, next) => {
  try {
    // Only admins can create users
    if (!req.user || req.user.role !== 'admin') {
      logger.warn('Unauthorized user creation attempt', { userId: req.user?._id });
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.'
      });
    }

    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

    if (existingUser) {
      logger.warn('User creation failed - email already exists', { email });
      return res.status(400).json({
        success: false,
        error: 'Email already in use'
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password
    });

    logger.info('User created', { userId: user._id, email: user.email, createdBy: req.user._id });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    logger.error('Create user error', { error: error.message });
    next(error);
  }
};

/**
 * Update user
 * @route PUT /api/users/:id
 * @access Private
 */


const updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Authorization check: users can only update their own profile unless they're admin
    if (!req.user) {
      logger.warn('Unauthorized update attempt - no user in request', { userId });
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      logger.warn('Unauthorized update attempt', {
        requesterId: req.user._id,
        targetUserId: userId
      });
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only update your own profile.'
      });
    }

    const allowedUpdates = ['name', 'email', 'bio', 'avatar', 'preferences'];
    const updates = {};

    // Filter only allowed fields
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Check if email is being changed and if it's already taken
    if (updates.email) {
      updates.email = updates.email.toLowerCase().trim();

      const currentUser = await User.findById(userId);

      if (currentUser && updates.email !== currentUser.email) {
        const emailExists = await User.findOne({
          email: updates.email,
          _id: { $ne: userId }
        });

        if (emailExists) {
          logger.warn('User update failed - email already in use', { userId, email: updates.email });
          return res.status(400).json({
            success: false,
            error: 'Email already in use'
          });
        }
      }
    }

    // Trim string fields
    if (updates.name) updates.name = updates.name.trim();
    if (updates.bio) updates.bio = updates.bio.trim();

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!user) {
      logger.warn('User update failed - user not found', { userId });
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    logger.info('User updated', { userId, updatedFields: Object.keys(updates), updatedBy: req.user._id });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    logger.error('Update user error', { userId: req.params.id, error: error.message });
    next(error);
  }
};

/**
 * Delete user
 * @route DELETE /api/users/:id
 * @access Private
 */


const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Authorization check: users can only delete their own account unless they're admin
    if (!req.user) {
      logger.warn('Unauthorized delete attempt - no user in request', { userId });
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      logger.warn('Unauthorized delete attempt', {
        requesterId: req.user._id,
        targetUserId: userId
      });
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only delete your own account.'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      logger.warn('User deletion failed - user not found', { userId });
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Soft delete approach - mark as deleted with timestamp
    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    logger.info('User deleted (soft delete)', {
      userId,
      email: user.email,
      deletedAt: user.deletedAt,
      deletedBy: req.user._id
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Delete user error', { userId: req.params.id, error: error.message });
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
