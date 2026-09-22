const { uuid } = require("../validators/schemas");
const AppError = require("./AppError");
const { makeExcerpt } = require("./content");

// Public author info — never includes email or password hash.
const authorSelect = {
  id: true,
  name: true,
  username: true,
  bio: true,
  avatar: true,
};

// The signed-in user's own account.
const accountSelect = {
  ...authorSelect,
  email: true,
  role: true,
  createdAt: true,
};

const postSummarySelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  tags: true,
  status: true,
  readingTime: true,
  views: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: authorSelect },
  _count: { select: { likes: true, comments: true } },
};

const commentSelect = {
  id: true,
  content: true,
  createdAt: true,
  postId: true,
  author: { select: authorSelect },
};

// Flattens Prisma's `_count` into `likes` / `comments` numbers.
const toPost = ({ _count, authorId, ...post }) => ({
  ...post,
  likes: _count.likes,
  comments: _count.comments,
});

// Full post for the article page and editor. `customExcerpt` tells the UI
// whether the author wrote the summary or it was generated from the content.
const toPostDetail = (post) => ({
  ...toPost(post),
  customExcerpt: post.excerpt !== makeExcerpt(post.content),
});

const canManage =(user, ownerId) => Boolean(user) && (user.id === ownerId || user.role === "admin");

// Malformed ids can never match a row, so treat them as "not found".
const parseId = (value, what) => {
  const result = uuid.safeParse(value);
  if (!result.success) throw AppError.notFound(what);
  return result.data;
};

module.exports = {
  authorSelect,
  accountSelect,
  postSummarySelect,
  commentSelect,
  toPost,
  toPostDetail,
  canManage,
  parseId,
};
