// File: src/services/emailService.js
// Generated: 2025-10-16 07:53:31 UTC
// Project ID: proj_aca83c949445
// Task ID: task_9jgk4x6nuu21


const config = require('../config/env');


const logger = require('../utils/logger');


const sgMail = require('@sendgrid/mail');

/**
 * Email Service using SendGrid for task reminders and notifications
 * Handles all email communications for the task management system
 */
class EmailService {
  constructor() {
    this.fromEmail = config.sendgrid.fromEmail || process.env.SENDGRID_FROM_EMAIL;
    this.apiKey = config.sendgrid?.apiKey || process.env.SENDGRID_API_KEY;
    this.appUrl = config.app?.url || process.env.APP_URL || 'http://localhost:3000';
    this.isProduction = process.env.NODE_ENV === 'production';

    // Initialize SendGrid
    if (this.apiKey) {
      sgMail.setApiKey(this.apiKey);
    } else {
      logger.warn('SendGrid API key not configured - emails will not be sent');
    }

    // Email template types
    this.templates = {
      TASK_REMINDER: 'task-reminder',
      TASK_ASSIGNED: 'task-assigned',
      TASK_UPDATED: 'task-updated',
      TASK_COMPLETED: 'task-completed',
      DEADLINE_ALERT: 'deadline-alert',
      PASSWORD_RESET: 'password-reset',
      WELCOME: 'welcome',
      VERIFICATION: 'verification'
    };

    // Rate limiting tracking
    this.emailsSentPerUser = new Map();
    this.maxEmailsPerHour = 50;

    // Start cleanup interval for memory management
    this.startCleanupInterval();
  }

  /**
   * Start periodic cleanup of rate limit tracking
   */
  startCleanupInterval() {
    // Clean up every 15 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupRateLimitTracking();
    }, 15 * 60 * 1000);

    // Prevent interval from keeping process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Clean up old entries from rate limit tracking
   */
  cleanupRateLimitTracking() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    let cleanedCount = 0;

    for (const [email, timestamps] of this.emailsSentPerUser.entries()) {
      const recentEmails = timestamps.filter(timestamp => timestamp > oneHourAgo);

      if (recentEmails.length === 0) {
        // Remove entry if no recent emails
        this.emailsSentPerUser.delete(email);
        cleanedCount++;
      } else if (recentEmails.length < timestamps.length) {
        // Update with filtered timestamps
        this.emailsSentPerUser.set(email, recentEmails);
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Rate limit tracking cleanup completed', {
        entriesRemoved: cleanedCount,
        remainingEntries: this.emailsSentPerUser.size
      });
    }
  }

  /**
   * Core email sending function with retry logic
   * @param {Object} emailData - Email configuration
   * @param {string} emailData.to - Recipient email
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.html - HTML content
   * @param {string} emailData.text - Plain text content
   * @param {string} emailData.templateId - Template identifier
   * @param {Object} emailData.dynamicData - Template data
   * @returns {Promise<Object>} Send result
   */
  async sendEmail({ to, subject, html, text, templateId, dynamicData }) {
    try {
      // Validate email configuration
      if (!this.apiKey) {
        logger.warn('SendGrid not configured - skipping email', { to: to ? '[REDACTED]' : 'undefined', subject });
        return { success: false, error: 'Email service not configured' };
      }

      // Validate recipient email
      if (!this.isValidEmail(to)) {
        logger.error('Invalid email address', { to: '[REDACTED]' });
        throw new Error('Invalid email address');
      }

      // Check rate limiting
      if (!this.checkRateLimit(to)) {
        logger.warn('Rate limit exceeded for user', { to: '[REDACTED]' });
        throw new Error('Email rate limit exceeded');
      }

      // Generate content from template if needed
      const emailHtml = html || this.generateHtmlFromTemplate(templateId, dynamicData);
      const emailText = text || this.generateTextFromTemplate(templateId, dynamicData);

      // Prepare email message
      const msg = {
        to,
        from: this.fromEmail,
        subject,
        html: emailHtml,
        text: emailText,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        },
        categories: [templateId || 'general']
      };

      // Send email
      const result = await sgMail.send(msg);

      // Track sent email
      this.trackSentEmail(to);

      logger.info('Email sent successfully', {
        to: '[REDACTED]',
        subject,
        templateId,
        messageId: result[0]?.headers?.['x-message-id']
      });

      return {
        success: true,
        messageId: result[0]?.headers?.['x-message-id']
      };
    } catch (error) {
      logger.error('Email sending failed', {
        to: '[REDACTED]',
        subject,
        error: error.message,
        code: error.code
      });
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send email with retry logic and exponential backoff
   * @param {Object} emailData - Email configuration
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<Object>} Send result
   */
  async sendEmailWithRetry(emailData, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.sendEmail(emailData);
      } catch (error) {
        lastError = error;
        logger.warn(`Email send attempt ${attempt} failed`, {
          to: '[REDACTED]',
          attempt,
          error: error.message
        });

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error(`Email failed after ${maxRetries} attempts`, {
      to: '[REDACTED]',
      error: lastError.message
    });
    throw lastError;
  }

  /**
   * Send task reminder email
   * @param {Object} user - User object
   * @param {Object} task - Task object
   * @returns {Promise<Object>} Send result
   */
  async sendTaskReminderEmail(user, task) {
    try {
      const subject = `Reminder: "${task.title}" is due soon`;
      const dynamicData = {
        userName: user.name,
        taskTitle: task.title,
        taskDescription: task.description || 'No description provided',
        dueDate: task.dueDate,
        priority: task.priority || 'medium',
        taskUrl: `${this.appUrl}/tasks/${task._id}`,
        taskId: task._id
      };

      return await this.sendEmailWithRetry({
        to: user.email,
        subject,
        templateId: this.templates.TASK_REMINDER,
        dynamicData
      });
    } catch (error) {
      logger.error('Failed to send task reminder email', {
        userId: user._id,
        taskId: task._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send task assignment email
   * @param {Object} user - Assigned user
   * @param {Object} task - Task object
   * @param {Object} assignedBy - User who assigned the task
   * @returns {Promise<Object>} Send result
   */
  async sendTaskAssignmentEmail(user, task, assignedBy) {
    try {
      const subject = `New Task Assigned: "${task.title}"`;
      const dynamicData = {
        userName: user.name,
        assignedByName: assignedBy.name,
        taskTitle: task.title,
        taskDescription: task.description || 'No description provided',
        dueDate: task.dueDate,
        priority: task.priority || 'medium',
        taskUrl: `${this.appUrl}/tasks/${task._id}`,
        taskId: task._id
      };

      return await this.sendEmailWithRetry({
        to: user.email,
        subject,
        templateId: this.templates.TASK_ASSIGNED,
        dynamicData
      });
    } catch (error) {
      logger.error('Failed to send task assignment email', {
        userId: user._id,
        taskId: task._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send deadline approaching alert
   * @param {Object} user - User object
   * @param {Object} task - Task object
   * @param {number} hoursRemaining - Hours until deadline
   * @returns {Promise<Object>} Send result
   */
  async sendDeadlineAlertEmail(user, task, hoursRemaining) {
    try {
      const urgencyText = hoursRemaining <= 1 ? 'URGENT' : 'IMPORTANT';
      const subject = `${urgencyText}: Task "${task.title}" due in ${hoursRemaining} hour(s)`;
      const dynamicData = {
        userName: user.name,
        taskTitle: task.title,
        taskDescription: task.description || 'No description provided',
        dueDate: task.dueDate,
        hoursRemaining,
        priority: task.priority || 'medium',
        taskUrl: `${this.appUrl}/tasks/${task._id}`,
        taskId: task._id,
        urgency: urgencyText
      };

      return await this.sendEmailWithRetry({
        to: user.email,
        subject,
        templateId: this.templates.DEADLINE_ALERT,
        dynamicData
      });
    } catch (error) {
      logger.error('Failed to send deadline alert email', {
        userId: user._id,
        taskId: task._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send task update notification
   * @param {Object} user - User object
   * @param {Object} task - Task object
   * @param {Object} updatedBy - User who updated the task
   * @param {Array} changes - List of changes made
   * @returns {Promise<Object>} Send result
   */
  async sendTaskUpdateEmail(user, task, updatedBy, changes) {
    try {
      const subject = `Task Updated: "${task.title}"`;
      const dynamicData = {
        userName: user.name,
        updatedByName: updatedBy.name,
        taskTitle: task.title,
        taskDescription: task.description || 'No description provided',
        changes: changes || [],
        taskUrl: `${this.appUrl}/tasks/${task._id}`,
        taskId: task._id
      };

      return await this.sendEmailWithRetry({
        to: user.email,
        subject,
        templateId: this.templates.TASK_UPDATED,
        dynamicData
      });
    } catch (error) {
      logger.error('Failed to send task update email', {
        userId: user._id,
        taskId: task._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send task completion notification
   * @param {Object} user - User object
   * @param {Object} task - Task object
   * @param {Object} completedBy - User who completed the task
   * @returns {Promise<Object>} Send result
   */
  async sendTaskCompletionEmail(user, task, completedBy) {
    try {
      const subject = `Task Completed: "${task.title}"`;
      const dynamicData = {
        userName: user.name,
        completedByName: completedBy.name,
        taskTitle: task.title,
        taskDescription: task.description || 'No description provided',
        completedAt: new Date(),
        taskUrl: `${this.appUrl}/tasks/${task._id}`,
        taskId: task._id
      };

      return await this.sendEmailWithRetry({
        to: user.email,
        subject,
        templateId: this.templates.TASK_COMPLETED,
        dynamicData
      });
    } catch (error) {
      logger.error('Failed to send task completion email', {
        userId: user._id,
        taskId: task._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param {Object} user - User object
   * @param {string} resetToken - Password reset token
   * @returns {Promise<Object>} Send result
   */
  async sendPasswordResetEmail(user, resetToken) {
    try {
      const subject = 'Password Reset Request';
      const resetUrl = `${this.appUrl}/reset-password?token=${resetToken}`;
      const dynamicData = {
        userName: user.name,
        resetUrl,
        expiryTime: '1 hour'
      };

      return await this.sendEmailWithRetry({
        to: user.email,
        subject,
        templateId: this.templates.PASSWORD_RESET,
        dynamicData
      });
    } catch (error) {
      logger.error('Failed to send password reset email', {
        userId: user._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send welcome email to new user
   * @param {Object} user - User object
   * @returns {Promise<Object>} Send result
   */
  async sendWelcomeEmail(user) {
    try {
      const subject = 'Welcome to Task Manager!';
      const dynamicData = {
        userName: user.name,
        loginUrl: `${this.appUrl}/login`,
        dashboardUrl: `${this.appUrl}/dashboard`
      };

      return await this.sendEmailWithRetry({
        to: user.email,
        subject,
        templateId: this.templates.WELCOME,
        dynamicData
      });
    } catch (error) {
      logger.error('Failed to send welcome email', {
        userId: user._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send email verification
   * @param {Object} user - User object
   * @param {string} verificationToken - Verification token
   * @returns {Promise<Object>} Send result
   */
  async sendVerificationEmail(user, verificationToken) {
    try {
      const subject = 'Verify Your Email Address';
      const verificationUrl = `${this.appUrl}/verify-email?token=${verificationToken}`;
      const dynamicData = {
        userName: user.name,
        verificationUrl
      };

      return await this.sendEmailWithRetry({
        to: user.email,
        subject,
        templateId: this.templates.VERIFICATION,
        dynamicData
      });
    } catch (error) {
      logger.error('Failed to send verification email', {
        userId: user._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send batch emails to multiple recipients
   * @param {Array} emailDataArray - Array of email configurations
   * @returns {Promise<Array>} Array of send results
   */
  async sendBatchEmails(emailDataArray) {
    const results = [];

    for (const emailData of emailDataArray) {
      try {
        const result = await this.sendEmailWithRetry(emailData);
        results.push({ ...result, to: emailData.to });
      } catch (error) {
        results.push({
          success: false,
          to: emailData.to,
          error: error.message
        });
      }
    }

    logger.info('Batch email send completed', {
      total: emailDataArray.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
  }

  /**
   * Generate HTML content from template
   * @param {string} templateId - Template identifier
   * @param {Object} data - Template data
   * @returns {string} HTML content
   */
  generateHtmlFromTemplate(templateId, data) {
    const templates = {
      'task-reminder': `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; }
            .content { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .task-details { background: white; padding: 15px; border-left: 4px solid #007bff; margin: 15px 0; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Task Reminder</h2>
            </div>
            <div class="content">
              <p>Hi ${data.userName},</p>
              <p>This is a reminder about your upcoming task:</p>
              <div class="task-details">
                <h3>${data.taskTitle}</h3>
                <p>${data.taskDescription}</p>
                <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleString()}</p>
                <p><strong>Priority:</strong> <span style="text-transform: uppercase;">${data.priority}</span></p>
              </div>
              <a href="${data.taskUrl}" class="button">View Task</a>
            </div>
            <div class="footer">
              <p>Task Manager - Stay organized, stay productive</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'task-assigned': `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; }
            .content { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .task-details { background: white; padding: 15px; border-left: 4px solid #28a745; margin: 15px 0; }
            .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Task Assignment</h2>
            </div>
            <div class="content">
              <p>Hi ${data.userName},</p>
              <p>${data.assignedByName} has assigned you a new task:</p>
              <div class="task-details">
                <h3>${data.taskTitle}</h3>
                <p>${data.taskDescription}</p>
                <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleString()}</p>
                <p><strong>Priority:</strong> <span style="text-transform: uppercase;">${data.priority}</span></p>
              </div>
              <a href="${data.taskUrl}" class="button">View Task</a>
            </div>
            <div class="footer">
              <p>Task Manager - Stay organized, stay productive</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'deadline-alert': `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .task-details { background: white; padding: 15px; border-left: 4px solid #dc3545; margin: 15px 0; }
            .button { display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .urgent { color: #dc3545; font-weight: bold; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${data.urgency}: Deadline Approaching</h2>
            </div>
            <div class="content">
              <p>Hi ${data.userName},</p>
              <p class="urgent">Your task is due in ${data.hoursRemaining} hour(s)!</p>
              <div class="task-details">
                <h3>${data.taskTitle}</h3>
                <p>${data.taskDescription}</p>
                <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleString()}</p>
                <p><strong>Priority:</strong> <span style="text-transform: uppercase;">${data.priority}</span></p>
              </div>
              <a href="${data.taskUrl}" class="button">Complete Task Now</a>
            </div>
            <div class="footer">
              <p>Task Manager - Stay organized, stay productive</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'password-reset': `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6c757d; color: white; padding: 20px; text-align: center; }
            .content { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .button { display: inline-block; background: #6c757d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Password Reset Request</h2>
            </div>
            <div class="content">
              <p>Hi ${data.userName},</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <a href="${data.resetUrl}" class="button">Reset Password</a>
              <div class="warning">
                <p><strong>Note:</strong> This link will expire in ${data.expiryTime}.</p>
                <p>If you didn't request this reset, please ignore this email.</p>
              </div>
            </div>
            <div class="footer">
              <p>Task Manager - Stay organized, stay productive</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'welcome': `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #17a2b8; color: white; padding: 20px; text-align: center; }
            .content { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .button { display: inline-block; background: #17a2b8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .features { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Welcome to Task Manager!</h2>
            </div>
            <div class="content">
              <p>Hi ${data.userName},</p>
              <p>Welcome aboard! We're excited to have you as part of our community.</p>
              <div class="features">
                <h3>Get Started:</h3>
                <ul>
                  <li>Create your first task</li>
                  <li>Set up reminders and deadlines</li>
                  <li>Collaborate with your team</li>
                  <li>Track your progress</li>
                </ul>
              </div>
              <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
            </div>
            <div class="footer">
              <p>Task Manager - Stay organized, stay productive</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    return templates[templateId] || `<p>${JSON.stringify(data)}</p>`;
  }

  /**
   * Generate plain text content from template
   * @param {string} templateId - Template identifier
   * @param {Object} data - Template data
   * @returns {string} Plain text content
   */
  generateTextFromTemplate(templateId, data) {
    const templates = {
      'task-reminder': `
Task Reminder

Hi ${data.userName},

This is a reminder about your upcoming task:

Task: ${data.taskTitle}
Description: ${data.taskDescription}
Due Date: ${new Date(data.dueDate).toLocaleString()}
Priority: ${data.priority}

View task: ${data.taskUrl}

Task Manager - Stay organized, stay productive
      `,
      'task-assigned': `
New Task Assignment

Hi ${data.userName},

${data.assignedByName} has assigned you a new task:

Task: ${data.taskTitle}
Description: ${data.taskDescription}
Due Date: ${new Date(data.dueDate).toLocaleString()}
Priority: ${data.priority}

View task: ${data.taskUrl}

Task Manager - Stay organized, stay productive
      `,
      'deadline-alert': `
${data.urgency}: Deadline Approaching

Hi ${data.userName},

Your task is due in ${data.hoursRemaining} hour(s)!

Task: ${data.taskTitle}
Description: ${data.taskDescription}
Due Date: ${new Date(data.dueDate).toLocaleString()}
Priority: ${data.priority}

Complete task now: ${data.taskUrl}

Task Manager - Stay organized, stay productive
      `,
      'password-reset': `
Password Reset Request

Hi ${data.userName},

We received a request to reset your password. Use the link below to create a new password:

${data.resetUrl}

This link will expire in ${data.expiryTime}.

If you didn't request this reset, please ignore this email.

Task Manager - Stay organized, stay productive
      `,
      'welcome': `
Welcome to Task Manager!

Hi ${data.userName},

Welcome aboard! We're excited to have you as part of our community.

Get Started:
- Create your first task
- Set up reminders and deadlines
- Collaborate with your team
- Track your progress

Go to Dashboard: ${data.dashboardUrl}

Task Manager - Stay organized, stay productive
      `
    };

    return templates[templateId] || JSON.stringify(data, null, 2);
  }

  /**
   * Validate email address format
   * @param {string} email - Email address to validate
   * @returns {boolean} True if valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check rate limit for user
   * @param {string} email - User email
   * @returns {boolean} True if within limit
   */
  checkRateLimit(email) {
    const now = Date.now();
    const userEmails = this.emailsSentPerUser.get(email) || [];

    // Filter emails sent in the last hour
    const recentEmails = userEmails.filter(timestamp => now - timestamp < 3600000);

    if (recentEmails.length >= this.maxEmailsPerHour) {
      return false;
    }

    return true;
  }

  /**
   * Track sent email for rate limiting
   * @param {string} email - User email
   */
  trackSentEmail(email) {
    const now = Date.now();
    const userEmails = this.emailsSentPerUser.get(email) || [];

    // Add current timestamp
    userEmails.push(now);

    // Keep only emails from the last hour
    const recentEmails = userEmails.filter(timestamp => now - timestamp < 3600000);

    this.emailsSentPerUser.set(email, recentEmails);
  }

  /**
   * Clear rate limit tracking (for testing)
   */
  clearRateLimits() {
    this.emailsSentPerUser.clear();
    logger

}}