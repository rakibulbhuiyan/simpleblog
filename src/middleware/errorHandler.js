const { ZodError } = require("zod");

const { Prisma } = require("../generated/prisma");
const env = require("../config/env");
const AppError = require("../utils/AppError");

const notFoundHandler = (req, res, next) => {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: err.issues[0]?.message ?? "Validation failed",
      details: err.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message, details: err.details });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return res.status(409).json({ message: "That value is already taken" });
    if (err.code === "P2025") return res.status(404).json({ message: "Not found" });
  }

  // Errors from body-parser and friends (malformed JSON, payload too large, ...).
  if (err.expose && err.status >= 400 && err.status < 500) {
    const message = err.type === "entity.parse.failed" ? "Malformed JSON body" : err.message;
    return res.status(err.status).json({ message });
  }

  console.error(err);
  res.status(500).json({
    message: env.isProd ? "Something went wrong" : err.message || "Something went wrong",
  });
};

module.exports = { notFoundHandler, errorHandler };
