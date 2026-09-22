const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");
const { accountSelect } = require("../utils/selects");
const { COOKIE_NAME, verifyToken, clearAuthCookie } = require("../utils/token");

// Attaches `req.user` when a valid session cookie is present. Never rejects.
const loadUser = async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();

  let userId;
  try {
    userId = verifyToken(token).sub;
  } catch {
    clearAuthCookie(res);
    return next();
  }

  req.user = await prisma.user.findUnique({ where: { id: userId }, select: accountSelect });
  if (!req.user) clearAuthCookie(res);

  next();
};

const requireAuth = (req, res, next) => {
  if (!req.user) throw AppError.unauthorized();
  next();
};

module.exports = { loadUser, requireAuth };
