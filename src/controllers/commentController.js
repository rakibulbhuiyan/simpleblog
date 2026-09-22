const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");
const { commentSelect, canManage, parseId } = require("../utils/selects");
const { commentSchema } = require("../validators/schemas");
const { findPublishedPostId } = require("./postController");

// GET /api/posts/:id/comments
const listComments = async (req, res) => {
  const postId = await findPublishedPostId(req.params.id);

  const comments = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: commentSelect,
  });

  res.json({ comments });
};

// POST /api/posts/:id/comments
const createComment = async (req, res) => {
  const postId = await findPublishedPostId(req.params.id);
  const { content } = commentSchema.parse(req.body);

  const comment = await prisma.comment.create({
    data: { content, postId, authorId: req.user.id },
    select: commentSelect,
  });

  res.status(201).json({ comment });
};

// DELETE /api/comments/:id — allowed for the comment author, the post author and admins.
const deleteComment = async (req, res) => {
  const id = parseId(req.params.id, "Comment");

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { authorId: true, post: { select: { authorId: true } } },
  });

  if (!comment) throw AppError.notFound("Comment");
  if (!canManage(req.user, comment.authorId) && !canManage(req.user, comment.post.authorId)) {
    throw AppError.forbidden("You can't delete this comment");
  }

  await prisma.comment.delete({ where: { id } });

  res.status(204).end();
};

module.exports = { listComments, createComment, deleteComment };
