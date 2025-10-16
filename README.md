# 📋 Task Management API

A production-ready REST API for task management with user authentication, built with Node.js, Express, and MongoDB. Features secure JWT-based authentication, role-based access control, task CRUD operations, commenting system, and comprehensive email notifications.

## ✨ Key Features

- 🔐 **Secure Authentication** - JWT access/refresh tokens with bcrypt password hashing
- 👥 **User Management** - Profile management, password reset, email verification
- ✅ **Task Management** - Full CRUD operations with status tracking, priorities, and assignments
- 💬 **Comments System** - Add, edit, and delete comments on tasks with soft-delete support
- 📧 **Email Notifications** - Task reminders, assignments, and deadline alerts via SendGrid
- 🛡️ **Security** - Helmet, CORS, rate limiting, HPP protection, MongoDB injection prevention
- 🚀 **Production Ready** - Comprehensive error handling, logging, health checks, graceful shutdown
- ⚡ **Performance** - Redis caching, connection pooling, request compression
- 📊 **Monitoring** - Winston logging, health check endpoints, detailed error tracking

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MongoDB** >= 5.0
- **Redis** (optional, for caching and rate limiting)
- **SendGrid Account** (optional, for email notifications)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd task-management-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Ensure MongoDB is running locally or have a MongoDB Atlas connection string ready:

```bash
# Start local MongoDB (if using local instance)
mongod --dbpath /path/to/data/directory
```

### 4. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see Environment Variables section below).

### 5. Generate JWT Secrets

Generate secure random secrets for JWT tokens:

```bash
# Generate JWT_ACCESS_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Add these to your `.env` file.

## ⚙️ Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/taskmanager` |
| `JWT_ACCESS_SECRET` | Secret for access tokens (min 32 chars) | Generated via crypto |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (min 32 chars) | Generated via crypto |

### Application Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `API_VERSION` | API version identifier | `v1` |
| `BASE_URL` | Application base URL | `http://localhost:3000` |

### Database Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_TEST_URI` | MongoDB test database URI | `mongodb://localhost:27017/taskmanager_test` |
| `DB_NAME` | Database name | `taskmanager` |

### Authentication & Security

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_ACCESS_EXPIRY` | Access token expiration | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token expiration | `7d` |
| `BCRYPT_ROUNDS` | Bcrypt salt rounds | `10` |
| `SESSION_SECRET` | Session secret key | - |
| `SESSION_TIMEOUT` | Session timeout (ms) | `3600000` |

### CORS Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGIN` | Allowed origins (comma-separated) | `http://localhost:3000,http://localhost:5173` |
| `ALLOWED_ORIGINS` | Additional allowed origins | Same as CORS_ORIGIN |

### Rate Limiting

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Auth rate limit window | `900000` |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | Max auth requests | `5` |

### Email Configuration (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server host | `smtp.example.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASSWORD` | SMTP password | - |
| `EMAIL_FROM` | From email address | `noreply@taskmanager.com` |
| `EMAIL_FROM_NAME` | From name | `Task Manager` |
| `ENABLE_EMAIL_NOTIFICATIONS` | Enable email notifications | `false` |
| `SENDGRID_API_KEY` | SendGrid API key | - |

### File Upload Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `MAX_FILE_SIZE` | Max upload size (bytes) | `5242880` (5MB) |
| `UPLOAD_PATH` | Upload directory | `./uploads` |
| `ALLOWED_FILE_TYPES` | Allowed MIME types | `image/jpeg,image/png,image/gif,application/pdf` |
| `ENABLE_FILE_UPLOADS` | Enable file uploads | `true` |

### Logging Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level | `debug` |
| `LOG_FILE_PATH` | Log file path | `./logs/app.log` |
| `ERROR_LOG_FILE_PATH` | Error log path | `./logs/error.log` |
| `MAX_LOG_FILE_SIZE` | Max log file size | `10485760` (10MB) |
| `MAX_LOG_FILES` | Max log files to keep | `5` |

### Pagination & Features

| Variable | Description | Default |
|----------|-------------|---------|
| `DEFAULT_PAGE_SIZE` | Default pagination size | `20` |
| `MAX_PAGE_SIZE` | Max pagination size | `100` |
| `ENABLE_TASK_COMMENTS` | Enable task comments | `true` |
| `ENABLE_TASK_ATTACHMENTS` | Enable task attachments | `false` |
| `ENABLE_TASK_NOTIFICATIONS` | Enable task notifications | `true` |
| `ENABLE_PROFILE_PICTURES` | Enable profile pictures | `true` |
| `MAINTENANCE_MODE` | Maintenance mode flag | `false` |

### Redis Configuration (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis server host | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `REDIS_PASSWORD` | Redis password | - |
| `REDIS_DB` | Redis database number | `0` |
| `ENABLE_REDIS_CACHE` | Enable Redis caching | `false` |
| `CACHE_TTL` | Cache TTL (seconds) | `3600` |

### Third-Party Services (Optional)

| Variable | Description |
|----------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_REGION` | AWS region |
| `AWS_S3_BUCKET` | S3 bucket name |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `SENTRY_DSN` | Sentry error tracking DSN |
| `GA_TRACKING_ID` | Google Analytics tracking ID |

### Development Tools

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_API_DOCS` | Enable API documentation | `true` |
| `ENABLE_REQUEST_LOGGING` | Enable request logging | `true` |
| `ENABLE_DETAILED_ERRORS` | Show detailed errors | `true` |

## 🏃 How to Run

### Development Mode

Runs with hot-reload using nodemon:

```bash
npm run dev
```

Server starts at `http://localhost:3000`

### Production Mode

```bash
npm start
```

### Run Tests

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch
```

### Linting

```bash
# Check for linting errors
npm run lint

# Fix linting errors automatically
npm run lint:fix
```

## 📡 API Endpoints

### Health Check

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/health` | Basic health check | No |
| GET | `/api/v1/health/detailed` | Detailed health with system info | Yes (Token) |

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | Login user | No |
| POST | `/api/v1/auth/logout` | Logout user | Yes |
| POST | `/api/v1/auth/refresh` | Refresh access token | Yes |
| POST | `/api/v1/auth/forgot-password` | Request password reset | No |
| POST | `/api/v1/auth/reset-password` | Reset password with token | No |
| POST | `/api/v1/auth/verify-email` | Verify email address | No |
| POST | `/api/v1/auth/resend-verification` | Resend verification email | No |
| GET | `/api/v1/auth/me` | Get current user profile | Yes |
| PUT | `/api/v1/auth/me` | Update current user profile | Yes |
| POST | `/api/v1/auth/change-password` | Change user password | Yes |

### Users

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/users` | Get all users (admin only) | Yes (Admin) |
| GET | `/api/v1/users/:id` | Get user by ID | Yes |
| POST | `/api/v1/users` | Create user (admin only) | Yes (Admin) |
| PUT | `/api/v1/users/:id` | Update user | Yes |
| DELETE | `/api/v1/users/:id` | Delete user | Yes |
| GET | `/api/v1/users/profile` | Get current user profile | Yes |
| PUT | `/api/v1/users/profile` | Update current user profile | Yes |
| POST | `/api/v1/users/profile/deletion-request` | Request account deletion | Yes |
| DELETE | `/api/v1/users/profile` | Delete account with confirmation | Yes |

### Tasks

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/tasks` | Get all tasks (filtered) | Yes |
| GET | `/api/v1/tasks/:id` | Get task by ID | Yes |
| POST | `/api/v1/tasks` | Create new task | Yes |
| PATCH | `/api/v1/tasks/:id` | Update task | Yes |
| DELETE | `/api/v1/tasks/:id` | Delete task | Yes |
| POST | `/api/v1/tasks/:id/assign/:userId` | Assign task to user | Yes |
| DELETE | `/api/v1/tasks/:id/assign/:userId` | Unassign user from task | Yes |

**Query Parameters for GET /tasks:**
- `status` - Filter by status (pending, in-progress, completed, cancelled)
- `priority` - Filter by priority (low, medium, high, urgent)
- `assignee` - Filter by assigned user ID
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 10, max: 100)
- `sortBy` - Sort field (createdAt, updatedAt, dueDate, priority, status, title)
- `order` - Sort order (asc, desc)
- `search` - Search in title and description
- `startDate` - Filter tasks created after date
- `endDate` - Filter tasks created before date

### Comments

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/tasks/:taskId/comments` | Get all comments for task | Yes |
| POST | `/api/v1/tasks/:taskId/comments` | Create comment on task | Yes |
| GET | `/api/v1/comments/:commentId` | Get comment by ID | Yes |
| PUT | `/api/v1/comments/:commentId` | Update comment | Yes |
| DELETE | `/api/v1/comments/:commentId` | Delete comment (soft delete) | Yes |

**Query Parameters for GET /tasks/:taskId/comments:**
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20, max: 100)
- `sort` - Sort order (createdAt, -createdAt, updatedAt, -updatedAt)
- `includeDeleted` - Include soft-deleted comments (default: false)

## 🏗️ Architecture Overview

### Project Structure

```
├── src/
│   ├── app.js                      # Express app configuration & middleware
│   ├── server.js                   # HTTP server with graceful shutdown
│   ├── config/                     # Configuration files
│   │   ├── database.js             # MongoDB connection with retry logic
│   │   └── env.js                  # Environment validation with Joi
│   ├── controllers/                # Request handlers
│   │   ├── authController.js       # Authentication logic
│   │   ├── taskController.js       # Task CRUD operations
│   │   ├── userController.js       # User management
│   │   └── commentController.js    # Comment management
│   ├── middleware/                 # Express middleware
│   │   ├── auth.js                 # JWT verification
│   │   ├── authorize.js            # Role-based access control
│   │   ├── errorHandler.js         # Global error handling
│   │   ├── rateLimiter.js          # Rate limiting with Redis
│   │   ├── security.js             # Security headers & CORS
│   │   └── validator.js            # Request validation
│   ├── models/                     # Mongoose schemas
│   │   ├── User.js                 # User model with auth methods
│   │   ├── Task.js                 # Task model with virtuals
│   │   └── Comment.js              # Comment model with soft-delete
│   ├── routes/                     # API route definitions
│   │   ├── index.js                # Route aggregator
│   │   ├── authRoutes.js           # Authentication endpoints
│   │   ├── taskRoutes.js           # Task endpoints
│   │   ├── userRoutes.js           # User endpoints
│   │   ├── commentRoutes.js        # Comment endpoints
│   │   └── healthRoutes.js         # Health check endpoints
│   ├── services/                   # Business logic services
│   │   ├── emailService.js         # Email sending with SendGrid
│   │   ├── tokenService.js         # JWT