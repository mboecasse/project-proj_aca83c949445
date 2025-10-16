// File: src/routes/userRoutes.js
// Generated: 2025-10-16 07:50:52 UTC
// Project ID: proj_aca83c949445
// Task ID: task_o0dhe6pcscrj

    const Comment = require('../models/Comment');
    const Post = require('../models/Post');
    const Session = require('../models/Session');


const User = require('../models/User');


const bcrypt = require('bcryptjs');


const crypto = require('crypto');


const express = require('express');


const logger = require('../utils/logger');

const { Validator } = require('../middleware/validator');

const { auth } = require('../middleware/auth');

const { body } = require('express-validator');


const router = express.Router();

/**
 * Validation rules for profile update
 */


const profileUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),
  body('avatar')
    .optional()
    .trim()
    .isURL()
    .withMessage('Avatar must be a valid URL')
];

/**
 * Validation rules for account deletion request
 */


const deletionRequestValidation = [
  body('password')
    .notEmpty()
    .withMessage('Password is required for account deletion')
];

/**
 * Validation rules for account deletion confirmation
 */


const deletionConfirmValidation = [
  body('confirmationToken')
    .notEmpty()
    .withMessage('Confirmation token is required')
];

/**
 * GET /profile
 * Get authenticated user's profile
 */
router.get('/profile', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-password -__v');

    if (!user) {
      logger.warn('User profile not found', { userId: req.userId });
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    logger.info('User profile retrieved', { userId: req.userId });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Failed to retrieve user profile', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
});

/**
 * PUT /profile
 * Update authenticated user's profile
 */
router.put('/profile', auth, profileUpdateValidation, Validator.validate, async (req, res, next) => {
  try {
    const { name, email, bio, avatar } = req.body;
    const updateFields = {};

    // Build update object with only provided fields
    if (name !== undefined) {
      updateFields.name = name;
    }

    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.userId }
      });

      if (existingUser) {
        logger.warn('Email already in use', {
          userId: req.userId,
          email
        });
        return res.status(409).json({
          success: false,
          error: 'Email already in use'
        });
      }

      updateFields.email = email;
    }

    if (bio !== undefined) {
      updateFields.bio = bio;
    }

    if (avatar !== undefined) {
      updateFields.avatar = avatar;
    }

    // Check if there are fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided for update'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateFields },
      {
        new: true,
        runValidators: true
      }
    ).select('-password -__v');

    if (!user) {
      logger.warn('User not found for update', { userId: req.userId });
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    logger.info('User profile updated', {
      userId: req.userId,
      updatedFields: Object.keys(updateFields)
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      logger.warn('Validation error during profile update', {
        userId: req.userId,
        error: error.message
      });
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: Object.values(error.errors).map(err => err.message)
      });
    }

    logger.error('Failed to update user profile', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
});

/**
 * POST /profile/deletion-request
 * Request account deletion with password verification
 */
router.post('/profile/deletion-request', auth, deletionRequestValidation, Validator.validate, async (req, res, next) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.userId);

    if (!user) {
      logger.warn('User not found for deletion request', { userId: req.userId });
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logger.warn('Invalid password for deletion request', { userId: req.userId });
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    // Generate confirmation token
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(confirmationToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token in user document
    await User.findByIdAndUpdate(req.userId, {
      $set: {
        deletionToken: tokenHash,
        deletionTokenExpiry: tokenExpiry
      }
    });

    logger.info('Account deletion requested', {
      userId: req.userId,
      email: user.email
    });

    res.json({
      success: true,
      message: 'Deletion request created. Use the confirmation token to complete deletion.',
      confirmationToken: confirmationToken,
      expiresIn: '15 minutes'
    });
  } catch (error) {
    logger.error('Failed to request account deletion', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
});

/**
 * DELETE /profile
 * Delete authenticated user's account with confirmation token
 */
router.delete('/profile', auth, deletionConfirmValidation, Validator.validate, async (req, res, next) => {
  const session = await User.startSession();
  session.startTransaction();

  try {
    const { confirmationToken } = req.body;

    const user = await User.findById(req.userId).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      logger.warn('User not found for deletion', { userId: req.userId });
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify confirmation token
    const tokenHash = crypto.createHash('sha256').update(confirmationToken).digest('hex');

    if (!user.deletionToken || user.deletionToken !== tokenHash) {
      await session.abortTransaction();
      session.endSession();
      logger.warn('Invalid deletion token', { userId: req.userId });
      return res.status(401).json({
        success: false,
        error: 'Invalid or missing confirmation token'
      });
    }

    // Check token expiry
    if (!user.deletionTokenExpiry || user.deletionTokenExpiry < new Date()) {
      await session.abortTransaction();
      session.endSession();
      logger.warn('Expired deletion token', { userId: req.userId });
      return res.status(401).json({
        success: false,
        error: 'Confirmation token has expired'
      });
    }

    // Cascade deletion - delete related data

    // Delete user's posts
    await Post.deleteMany({ userId: req.userId }).session(session);

    // Delete user's comments
    await Comment.deleteMany({ userId: req.userId }).session(session);

    // Delete user's sessions (invalidate all tokens)
    await Session.deleteMany({ userId: req.userId }).session(session);

    // Delete user account
    await User.findByIdAndDelete(req.userId).session(session);

    await session.commitTransaction();
    session.endSession();

    logger.info('User account deleted with cascade', {
      userId: req.userId,
      email: user.email
    });

    res.json({
      success: true,
      message: 'Account and all associated data deleted successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    logger.error('Failed to delete user account', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
});

module.exports = router;
