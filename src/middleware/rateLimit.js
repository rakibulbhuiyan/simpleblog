const { rateLimit } = require("express-rate-limit");

const env = require("../config/env");

const limiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => env.isTest,
    message: { message },
  });

// Slows down password guessing and sign-up spam.
const authLimiter = limiter(15 * 60 * 1000, 20, "Too many attempts. Please try again in a few minutes.");

const commentLimiter = limiter(60 * 1000, 10, "You're commenting too fast. Take a breath and try again.");

module.exports = { authLimiter, commentLimiter };
