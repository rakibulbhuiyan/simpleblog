const prisma = require("../lib/prisma");
const env = require("../config/env");

const XML_ESCAPES = { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" };
const escapeXml = (value) => String(value).replace(/[<>&'"]/g, (char) => XML_ESCAPES[char]);

const siteUrl = (req) => (env.siteUrl || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");

const postUrl = (base, slug) => `${base}/post/${encodeURIComponent(slug)}`;

// GET /rss.xml
const rss = async (req, res) => {
  const base = siteUrl(req);
  const posts = await prisma.post.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 20,
    select: { slug: true, title: true, excerpt: true, tags: true, publishedAt: true, author: { select: { name: true } } },
  });

  const items = posts
    .map((post) => {
      const link = postUrl(base, post.slug);
      const categories = post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join("");
      return `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(link)}</link><guid isPermaLink="true">${escapeXml(link)}</guid><description>${escapeXml(post.excerpt)}</description><dc:creator>${escapeXml(post.author.name)}</dc:creator><pubDate>${post.publishedAt.toUTCString()}</pubDate>${categories}</item>`;
    })
    .join("");

  res.type("application/rss+xml").send(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>SimpleBlog</title><link>${escapeXml(base)}</link><description>Stories, ideas and notes worth reading.</description><language>en</language>${items}</channel></rss>`
  );
};

// GET /sitemap.xml
const sitemap = async (req, res) => {
  const base = siteUrl(req);
  const posts = await prisma.post.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    select: { slug: true, updatedAt: true },
  });

  const urls = [`<url><loc>${escapeXml(base)}/</loc></url>`]
    .concat(
      posts.map(
        (post) => `<url><loc>${escapeXml(postUrl(base, post.slug))}</loc><lastmod>${post.updatedAt.toISOString()}</lastmod></url>`
      )
    )
    .join("");

  res.type("application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
  );
};

module.exports = { rss, sitemap };
