const express = require("express");

const { register, login, logout, me, updateMe, changePassword } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.get("/me", me);
router.patch("/me", requireAuth, updateMe);
router.patch("/password", requireAuth, authLimiter, changePassword);

module.exports = router;
