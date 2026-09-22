const express = require("express");

const {
  listPosts,
  listMyPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
} = require("../controllers/postController");
const { listComments, createComment } = require("../controllers/commentController");
const { requireAuth } = require("../middleware/auth");
const { commentLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.get("/", listPosts);
router.post("/", requireAuth, createPost);
router.get("/mine", requireAuth, listMyPosts);

// Reads use the human-friendly slug, writes use the stable id.
router.get("/:slug", getPost);
router.patch("/:id", requireAuth, updatePost);
router.delete("/:id", requireAuth, deletePost);

router.post("/:id/like", requireAuth, likePost);
router.delete("/:id/like", requireAuth, unlikePost);

router.get("/:id/comments", listComments);
router.post("/:id/comments", requireAuth, commentLimiter, createComment);

module.exports = router;
