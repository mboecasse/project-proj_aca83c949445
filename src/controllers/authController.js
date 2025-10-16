// File: src/controllers/authController.js
// Generated: 2025-10-16 07:49:40 UTC
// Project ID: proj_aca83c949445
// Task ID: task_g0fnqrhfzrsa


const EmailService = require('../services/emailService');


const TokenService = require('../services/tokenService');


const User = require('../models/User');


const bcrypt = require('bcryptjs');


const crypto = require('crypto');


const logger = require('../utils/logger');

/**
 * Register a new user
 * POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, username } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain uppercase, lowercase, number, and special character'
      });
    }

    // Check if user already exists (case-insensitive)
    const existingUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      username: username || email.split('@')[0]
    });

    // Generate tokens
    const accessToken = TokenService.generateAccessToken(user._id);
    const refreshToken = TokenService.generateRefreshToken(user._id);

    // Store refresh token
    await TokenService.storeRefreshToken(user._id, refreshToken);

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info('User registered successfully', {
      userId: user._id,
      email: user.email
    });

    res.status(201).json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role
        }
      },
      message: 'User registered successfully'
    });
  } catch (error) {
    logger.error('Registration error', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user with password field
    const user = await User.findOne({
      email: email.toLowerCase()
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logger.warn('Failed login attempt', {
        email: email.toLowerCase(),
        ip: req.ip
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate tokens
    const accessToken = TokenService.generateAccessToken(user._id);
    const refreshToken = TokenService.generateRefreshToken(user._id);

    // Store refresh token
    await TokenService.storeRefreshToken(user._id, refreshToken);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info('User logged in successfully', {
      userId: user._id,
      email: user.email,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role
        }
      },
      message: 'Login successful'
    });
  } catch (error) {
    logger.error('Login error', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'No refresh token provided'
      });
    }

    // Remove refresh token from database
    await TokenService.removeRefreshToken(refreshToken);

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    logger.info('User logged out successfully', {
      userId: req.userId || 'unknown'
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'No refresh token provided'
      });
    }

    // Verify and validate refresh token
    const decoded = await TokenService.verifyRefreshToken(refreshToken);

    if (!decoded) {
      res.clearCookie('refreshToken');
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }

    // Check if refresh token exists in database
    const isValid = await TokenService.validateRefreshToken(decoded.userId, refreshToken);

    if (!isValid) {
      res.clearCookie('refreshToken');
      return res.status(401).json({
        success: false,
        error: 'Refresh token not found or revoked'
      });
    }

    // Verify user still exists and is active
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.clearCookie('refreshToken');
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate new access token
    const newAccessToken = TokenService.generateAccessToken(user._id);

    // Optionally rotate refresh token
    const shouldRotate = process.env.ROTATE_REFRESH_TOKENS === 'true';
    let newRefreshToken = refreshToken;

    if (shouldRotate) {
      newRefreshToken = TokenService.generateRefreshToken(user._id);
      await TokenService.removeRefreshToken(refreshToken);
      await TokenService.storeRefreshToken(user._id, newRefreshToken);

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }

    logger.info('Access token refreshed', {
      userId: user._id,
      rotated: shouldRotate
    });

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken
      },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    logger.error('Token refresh error', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Forgot password - send reset token
 * POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Find user by email (case-insensitive)
    const user = await User.findOne({
      email: email.toLowerCase()
    });

    // Always return success to prevent user enumeration
    if (!user) {
      logger.warn('Password reset requested for non-existent email', {
        email: email.toLowerCase(),
        ip: req.ip
      });

      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      });
    }

    // Generate secure random reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token before storing
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Store hashed token with expiration (1 hour)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send password reset email with unhashed token
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      await EmailService.sendPasswordResetEmail(user.email, resetUrl);

      logger.info('Password reset email sent', {
        userId: user._id,
        email: user.email
      });
    } catch (emailError) {
      // Clear reset token if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      logger.error('Failed to send password reset email', {
        userId: user._id,
        error: emailError.message
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to send password reset email'
      });
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent'
    });
  } catch (error) {
    logger.error('Forgot password error', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Reset password using token
 * POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required'
      });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain uppercase, lowercase, number, and special character'
      });
    }

    // Hash the provided token to match database format
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Check if new password is different from old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Invalidate all existing refresh tokens (force re-login)
    await TokenService.removeAllUserRefreshTokens(user._id);

    // Send password change confirmation email
    try {
      await EmailService.sendPasswordChangedEmail(user.email);
    } catch (emailError) {
      logger.error('Failed to send password changed confirmation email', {
        userId: user._id,
        error: emailError.message
      });
    }

    logger.info('Password reset successfully', {
      userId: user._id,
      email: user.email
    });

    res.json({
      success: true,
      message: 'Password reset successfully. Please login with your new password'
    });
  } catch (error) {
    logger.error('Reset password error', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    logger.error('Get current user error', {
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// Required exports for contract compliance


const getAuths = async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      error: 'Method not implemented'
    });
  } catch (error) {
    next(error);
  }
};


const getAuthById = async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      error: 'Method not implemented'
    });
  } catch (error) {
    next(error);
  }
};


const createAuth = async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      error: 'Method not implemented'
    });
  } catch (error) {
    next(error);
  }
};


const updateAuth = async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      error: 'Method not implemented'
    });
  } catch (error) {
    next(error);
  }
};


const deleteAuth = async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      error: 'Method not implemented'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register: exports.register,
  login: exports.login,
  logout: exports.logout,
  refreshToken: exports.refreshToken,
  forgotPassword: exports.forgotPassword,
  resetPassword: exports.resetPassword,
  getCurrentUser: exports.getCurrentUser,
  getAuths,
  getAuthById,
  createAuth,
  updateAuth,
  deleteAuth
};
