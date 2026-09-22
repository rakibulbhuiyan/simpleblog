const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");
const { slugify, randomSuffix, makeExcerpt, readingTime } = require("../utils/content");
const { postSummarySelect, toPost, toPostDetail, canManage, parseId } = require("../utils/selects");
const {
  createPostSchema,
  updatePostSchema,
  listPostsQuery,
  myPostsQuery,
} = require("../validators/schemas");

const postDetailSelect = { ...postSummarySelect, content: true, authorId: true };

// Finds a free slug for a title; `excludeId` lets a post keep its own slug.
const uniqueSlug = async (title, excludeId) => {
  const base = slugify(title);
  let slug = base;

  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await prisma.post.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${randomSuffix()}`;
  }

  throw AppError.conflict("Could not generate a unique URL for this title");
};

// GET /api/posts — published posts with search, tag/author filters and pagination.
const listPosts = async (req, res) => {
  const { page, limit, q, tag, author, sort } = listPostsQuery.parse(req.query);

  const where = {
    status: "published",
    ...(tag && { tags: { has: tag } }),
    ...(author && { author: { username: author } }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { excerpt: { contains: q, mode: "insensitive" } },
        { tags: { has: q.toLowerCase() } },
      ],
    }),
  };

  const orderBy =
    sort === "popular"
      ? [{ likes: { _count: "desc" } }, { views: "desc" }, { publishedAt: "desc" }]
      : [{ publishedAt: "desc" }, { id: "desc" }];

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: postSummarySelect,
    }),
    prisma.post.count({ where }),
  ]);

  res.json({
    posts: posts.map(toPost),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
};

// GET /api/posts/mine — the signed-in author's posts, drafts included.
const listMyPosts = async (req, res) => {
  const { status } = myPostsQuery.parse(req.query);

  const posts = await prisma.post.findMany({
    where: { authorId: req.user.id, ...(status !== "all" && { status }) },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: postSummarySelect,
  });

  res.json({ posts: posts.map(toPost) });
};

// GET /api/posts/:slug — drafts are only visible to their author (and admins).
const getPost = async (req, res) => {
  const post = await prisma.post.findUnique({
    where: { slug: req.params.slug },
    select: postDetailSelect,
  });

  if (!post || (post.status !== "published" && !canManage(req.user, post.authorId))) {
    throw AppError.notFound("Post");
  }

  const countView = post.status === "published" && req.user?.id !== post.authorId;

  const [like] = await Promise.all([
    req.user
      ? prisma.like.findUnique({
          where: { userId_postId: { userId: req.user.id, postId: post.id } },
          select: { postId: true },
        })
      : null,
    // Raw SQL so a view doesn't bump `updatedAt`.
    countView ? prisma.$executeRaw`UPDATE posts SET views = views + 1 WHERE id = ${post.id}::uuid` : null,
  ]);

  res.json({
    post: {
      ...toPostDetail(post),
      views: post.views + (countView ? 1 : 0),
      likedByMe: Boolean(like),
    },
  });
};

// POST /api/posts
const createPost = async (req, res) => {
  const { title, content, excerpt, coverImage, tags, status = "draft" } = createPostSchema.parse(req.body);

  const post = await prisma.post.create({
    data: {
      title,
      content,
      slug: await uniqueSlug(title),
      excerpt: excerpt || makeExcerpt(content),
      coverImage: coverImage ?? null,
      tags: tags ?? [],
      status,
      readingTime: readingTime(content),
      publishedAt: status === "published" ? new Date() : null,
      authorId: req.user.id,
    },
    select: postDetailSelect,
  });

  res.status(201).json({ post: { ...toPostDetail(post), likedByMe: false } });
};

// PATCH /api/posts/:id
const updatePost = async (req, res) => {
  const id = parseId(req.params.id, "Post");

  const existing = await prisma.post.findUnique({
    where: { id },
    select: { authorId: true, title: true, content: true, excerpt: true, publishedAt: true },
  });

  if (!existing) throw AppError.notFound("Post");
  if (!canManage(req.user, existing.authorId)) throw AppError.forbidden("You can only edit your own posts");

  const data = updatePostSchema.parse(req.body);
  const changes = {};

  if (data.title !== undefined) {
    changes.title = data.title;
    // URLs stay stable once a post has been published.
    if (!existing.publishedAt && data.title !== existing.title) {
      changes.slug = await uniqueSlug(data.title, id);
    }
  }

  const content = data.content ?? existing.content;
  if (data.content !== undefined) {
    changes.content = data.content;
    changes.readingTime = readingTime(data.content);
  }

  // An excerpt the author never customised keeps following the content.
  const excerptWasAuto = existing.excerpt === makeExcerpt(existing.content);
  const requestedExcerpt = data.excerpt ?? existing.excerpt;
  const followContent = !requestedExcerpt || (excerptWasAuto && requestedExcerpt === existing.excerpt);
  changes.excerpt = followContent ? makeExcerpt(content) : requestedExcerpt;

  if (data.coverImage !== undefined) changes.coverImage = data.coverImage;
  if (data.tags !== undefined) changes.tags = data.tags;

  if (data.status !== undefined) {
    changes.status = data.status;
    if (data.status === "published" && !existing.publishedAt) changes.publishedAt = new Date();
  }

  const post = await prisma.post.update({ where: { id }, data: changes, select: postDetailSelect });

  res.json({ post: toPostDetail(post) });
};

// DELETE /api/posts/:id — comments and likes are removed by ON DELETE CASCADE.
const deletePost = async (req, res) => {
  const id = parseId(req.params.id, "Post");

  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) throw AppError.notFound("Post");
  if (!canManage(req.user, post.authorId)) throw AppError.forbidden("You can only delete your own posts");

  await prisma.post.delete({ where: { id } });

  res.status(204).end();
};

const findPublishedPostId = async (rawId) => {
  const id = parseId(rawId, "Post");
  const post = await prisma.post.findUnique({ where: { id }, select: { status: true } });

  if (!post || post.status !== "published") throw AppError.notFound("Post");
  return id;
};

// POST /api/posts/:id/like — idempotent.
const likePost = async (req, res) => {
  const postId = await findPublishedPostId(req.params.id);

  await prisma.like.createMany({ data: [{ userId: req.user.id, postId }], skipDuplicates: true });
  const likes = await prisma.like.count({ where: { postId } });

  res.json({ liked: true, likes });
};

// DELETE /api/posts/:id/like — idempotent.
const unlikePost = async (req, res) => {
  const postId = await findPublishedPostId(req.params.id);

  await prisma.like.deleteMany({ where: { userId: req.user.id, postId } });
  const likes = await prisma.like.count({ where: { postId } });

  res.json({ liked: false, likes });
};

module.exports = {
  listPosts,
  listMyPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  findPublishedPostId,
};
