const express = require("express");

const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");
const { loadUser, requireAuth } = require("../middleware/auth");
const { deleteComment } = require("../controllers/commentController");
const { getUser } = require("../controllers/userController");
const { listTags } = require("../controllers/tagController");
const authRoutes = require("./authRoutes");
const postRoutes = require("./postRoutes");

const router = express.Router();

router.get("/health", async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok" });
});

router.use(loadUser);

router.use("/auth", authRoutes);
router.use("/posts", postRoutes);
router.delete("/comments/:id", requireAuth, deleteComment);
router.get("/users/:username", getUser);
router.get("/tags", listTags);

// Unknown API routes get a JSON 404 instead of falling through to the React app.
router.use((req, res, next) => {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found`));
});

module.exports = router;
