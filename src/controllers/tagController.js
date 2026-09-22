const prisma = require("../lib/prisma");

// GET /api/tags — most used tags across published posts.
const listTags = async (req, res) => {
  const tags = await prisma.$queryRaw`
    SELECT tag AS name, COUNT(*)::int AS count
    FROM posts, unnest(tags) AS tag
    WHERE status = 'published'
    GROUP BY tag
    ORDER BY count DESC, tag ASC
    LIMIT 20
  `;

  res.json({ tags });
};

module.exports = { listTags };
