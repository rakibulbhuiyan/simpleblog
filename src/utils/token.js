const jwt = require("jsonwebtoken");

const env = require("../config/env");

const COOKIE_NAME = "sb_token";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.isProd,
  path: "/",
};

const signToken = (userId) =>
  jwt.sign({ sub: userId }, env.jwtSecret, { algorithm: "HS256", expiresIn: MAX_AGE_SECONDS });

const verifyToken = (token) => jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });

const setAuthCookie = (res, userId) => {
  res.cookie(COOKIE_NAME, signToken(userId), { ...cookieOptions, maxAge: MAX_AGE_SECONDS * 1000 });
};

const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions);
};

module.exports = { COOKIE_NAME, verifyToken, setAuthCookie, clearAuthCookie };
