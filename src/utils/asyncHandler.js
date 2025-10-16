// File: src/utils/asyncHandler.js
// Generated: 2025-10-16 07:45:43 UTC
// Project ID: proj_aca83c949445
// Task ID: task_cdkk54aiwnwz

* Wraps an async function to catch any errors and pass them to Express error middleware
 *
 * @param {Function} fn - Async route handler function with signature (req, res, next)
 * @returns {Function} Wrapped function that catches errors and forwards to next()
 *
 * @example
 * // Without asyncHandler (repetitive)
 * router.get('/tasks', async (req, res, next) => {
 *   try {
 *     const tasks = await Task.find({ userId: req.user.id });
 *     res.json({ success: true, data: tasks });
 *   } catch (error) {
 *     next(error);
 *   }
 * });
 *
 * @example
 * // With asyncHandler (clean)
 * router.get('/tasks', asyncHandler(async (req, res) => {
 *   const tasks = await Task.find({ userId: req.user.id });
 *   res.json({ success: true, data: tasks });
 * }));
 */


const AsyncHandler = (fn) => {
  // Validate that fn is a function
  if (typeof fn !== 'function') {
    throw new TypeError('asyncHandler expects a function as argument');
  }

  // Return a new function with Express middleware signature
  return (req, res, next) => {
    // Wrap function execution in Promise.resolve to handle both:
    // 1. Functions that return promises (async functions)
    // 2. Functions that return non-promise values (sync functions)
    Promise.resolve(fn(req, res, next))
      .catch(next); // Forward any caught errors to Express error middleware
  };
};

module.exports = AsyncHandler;
