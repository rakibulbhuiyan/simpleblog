class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message, details) {
    return new AppError(400, message, details);
  }

  static unauthorized(message = "Please sign in to continue") {
    return new AppError(401, message);
  }

  static forbidden(message = "You are not allowed to do that") {
    return new AppError(403, message);
  }

  static notFound(what = "Resource") {
    return new AppError(404, `${what} not found`);
  }

  static conflict(message, details) {
    return new AppError(409, message, details);
  }
}

module.exports = AppError;
