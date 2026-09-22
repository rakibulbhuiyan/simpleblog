const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");
const { authorSelect } = require("../utils/selects");

// GET /api/users/:username — public profile with writing stats.
const getUser = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username.toLowerCase() },
    select: { ...authorSelect, createdAt: true },
  });

  if (!user) throw AppError.notFound("User");

  const published = { authorId: user.id, status: "published" };

  const [posts, likes] = await Promise.all([
    prisma.post.aggregate({ where: published, _count: { _all: true }, _sum: { views: true } }),
    prisma.like.count({ where: { post: published } }),
  ]);

  res.json({
    user,
    stats: {
      posts: posts._count._all,
      views: posts._sum.views ?? 0,
      likes,
    },
  });
};

module.exports = { getUser };
