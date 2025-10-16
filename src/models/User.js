// File: src/models/User.js
// Generated: 2025-10-16 07:46:15 UTC
// Project ID: proj_aca83c949445
// Task ID: task_g8bag29yqyck


const bcrypt = require('bcryptjs');


const crypto = require('crypto');


const jwt = require('jsonwebtoken');


const logger = require('../utils/logger');


const mongoose = require('mongoose');

/**
 * Helper function to hash sensitive data for logging
 */


function hashForLogging(data) {
  return crypto.createHash('sha256').update(String(data)).digest('hex').substring(0, 16);
}

/**
 * User Schema
 * Defines the structure for user documents in MongoDB
 */


const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        // More robust email validation regex that prevents ReDoS
        // Allows longer TLDs and is more secure
        return /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(v);
      },
      message: 'Please enter a valid email address'
    },
    index: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },
  role: {
    type: String,
    enum: {
      values: ['user', 'admin'],
      message: 'Role must be either user or admin'
    },
    default: 'user'
  }
}, {
  timestamps: true
});

/**
 * Pre-save middleware to hash password before saving
 * Only hashes if password is modified
 */
userSchema.pre('save', async function(next) {
  try {
    // Only hash password if it has been modified
    if (!this.isModified('password')) {
      return next();
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    logger.debug('Password hashed successfully', { userIdHash: hashForLogging(this._id) });
    next();
  } catch (error) {
    logger.error('Error hashing password', { error: error.message });
    next(error);
  }
});

/**
 * Instance method to compare password for authentication
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} - True if password matches
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    logger.error('Error comparing passwords', { error: error.message });
    throw error;
  }
};

/**
 * Instance method to generate JWT authentication token
 * @returns {string} - JWT token
 */
userSchema.methods.generateAuthToken = function() {
  try {
    const token = jwt.sign(
      {
        id: this._id,
        email: this.email,
        role: this.role
      },
      process.env.JWT_ACCESS_SECRET,
      {
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m'
      }
    );

    logger.debug('JWT token generated', { userIdHash: hashForLogging(this._id) });
    return token;
  } catch (error) {
    logger.error('Error generating auth token', {
      userIdHash: hashForLogging(this._id),
      error: error.message
    });
    throw error;
  }
};

/**
 * Static method to find user by credentials
 * Used for login authentication
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - User object if credentials are valid
 * @throws {Error} - If credentials are invalid
 */
userSchema.statics.findByCredentials = async function(email, password) {
  try {
    // Find user by email and include password field
    const user = await this.findOne({ email }).select('+password');

    if (!user) {
      logger.warn('Login attempt failed', { emailHash: hashForLogging(email) });
      throw new Error('Invalid login credentials');
    }

    // Compare provided password with stored hash
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      logger.warn('Login attempt failed', {
        userIdHash: hashForLogging(user._id),
        emailHash: hashForLogging(email)
      });
      throw new Error('Invalid login credentials');
    }

    logger.info('User authenticated successfully', {
      userIdHash: hashForLogging(user._id),
      emailHash: hashForLogging(email)
    });

    return user;
  } catch (error) {
    logger.error('Error in findByCredentials', {
      emailHash: hashForLogging(email),
      error: error.message
    });
    throw error;
  }
};

/**
 * Transform user object to JSON
 * Removes sensitive fields from response
 * @returns {Object} - Safe user object without password
 */
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();

  // Remove sensitive fields
  delete userObject.password;
  delete userObject.__v;

  return userObject;
};

/**
 * Index on email field for query performance
 */
userSchema.index({ email: 1 });

/**
 * Export User model
 */
module.exports = mongoose.model('User', userSchema);
