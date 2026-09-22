// Seeds demo authors, posts, likes and comments. Safe to re-run: it only
// replaces content owned by the demo accounts and never touches other users.
const env = require("../src/config/env");
const prisma = require("../src/lib/prisma");
const { hashPassword } = require("../src/utils/password");
const { slugify, randomSuffix, makeExcerpt, readingTime } = require("../src/utils/content");

const DEMO_PASSWORD = "password123";

const users = [
  {
    name: "Maya Chen",
    username: "maya",
    email: "demo@simpleblog.dev",
    role: "admin",
    bio: "Editor of SimpleBlog. Writes about writing, focus and building things slowly.",
  },
  {
    name: "Rafi Ahmed",
    username: "rafi",
    email: "rafi@simpleblog.dev",
    role: "user",
    bio: "Backend engineer. PostgreSQL enthusiast. Occasionally explains indexes at parties.",
  },
  {
    name: "Lena Park",
    username: "lena",
    email: "lena@simpleblog.dev",
    role: "user",
    bio: "Product designer obsessed with type, color and interfaces that feel calm.",
  },
];

const cover = (seed) => `https://picsum.photos/seed/${seed}/1600/900`;

const posts = [
  {
    author: "maya",
    title: "The quiet power of writing things down",
    tags: ["writing", "habits"],
    coverImage: cover("notebook-morning"),
    daysAgo: 2,
    views: 1284,
    content: `Most of my best ideas didn't arrive fully formed. They showed up as a half-sentence in a notebook, a question scribbled in the margin of a meeting agenda, a note to self that made no sense until a week later.

Writing things down is not about producing something. It's about **thinking in a way you can see**.

## Your head is a terrible filing cabinet

When an idea lives only in your head, it competes with everything else for attention: the email you forgot to answer, the bug you didn't fix, the thing someone said at lunch. Written down, the idea gets to sit still. You can look at it, poke it, argue with it.

> Writing is thinking. To write well is to think clearly. That's why it's so hard.

## A tiny practice that works

I keep it simple:

1. **One notebook, always open.** Digital or paper, it doesn't matter. What matters is zero friction.
2. **Date every page.** Future you will want context.
3. **Write questions, not just answers.** A good question will pull you back to the page.
4. **Re-read on Fridays.** Ten minutes. Circle anything that still feels alive.

## From notes to posts

Almost every post on this blog started as a Friday circle. Some notes turn into essays. Most don't — and that's fine. The point was never the output. The point was the thinking.

If you've been meaning to start a blog, start a notebook first. The blog will follow.`,
  },
  {
    author: "rafi",
    title: "A practical guide to PostgreSQL indexes",
    tags: ["postgresql", "database", "performance"],
    coverImage: cover("postgres-indexes"),
    daysAgo: 5,
    views: 2310,
    content: `Indexes are the single biggest lever you have over query performance in PostgreSQL. They're also easy to get wrong. Here's the mental model I wish I'd had earlier.

## What an index actually is

An index is a separate data structure that keeps a *sorted* copy of one or more columns, with pointers back to the table rows. Instead of scanning every row, Postgres can jump straight to the ones it needs.

\`\`\`sql
-- Without an index this scans the whole table
SELECT * FROM posts WHERE author_id = '0199...';

-- With one, it's a quick lookup
CREATE INDEX posts_author_id_idx ON posts (author_id);
\`\`\`

## B-tree: the default for a reason

B-tree indexes handle equality and range queries (\`=\`, \`<\`, \`>\`, \`BETWEEN\`, \`ORDER BY\`). Column order matters in multi-column indexes:

\`\`\`sql
CREATE INDEX posts_status_published_idx
  ON posts (status, published_at DESC);
\`\`\`

This index serves *"published posts, newest first"* perfectly — exactly the query a blog homepage runs.

## GIN: for arrays and full-text

Storing tags in a \`text[]\` column? A GIN index makes "posts tagged X" fast:

\`\`\`sql
CREATE INDEX posts_tags_idx ON posts USING GIN (tags);
SELECT title FROM posts WHERE tags @> ARRAY['postgresql'];
\`\`\`

## Always check with EXPLAIN

Never guess. Ask the planner:

\`\`\`sql
EXPLAIN ANALYZE
SELECT * FROM posts WHERE status = 'published'
ORDER BY published_at DESC LIMIT 10;
\`\`\`

Look for \`Index Scan\` instead of \`Seq Scan\` on big tables.

## Rules of thumb

- Index columns you **filter**, **join** or **sort** on.
- Don't index everything — every index slows down writes.
- Small tables are often faster with a sequential scan. That's fine.

Indexes aren't magic, but with a little intuition they feel close.`,
  },
  {
    author: "rafi",
    title: "Building a clean REST API with Express 5",
    tags: ["node", "express", "javascript"],
    coverImage: cover("express-api-code"),
    daysAgo: 9,
    views: 1876,
    content: `Express 5 finally landed, and the headline feature is small but lovely: **async errors just work**. No more wrapping every handler in try/catch.

## Before and after

\`\`\`js
// Express 4 — every handler needed this dance
router.get("/posts/:id", async (req, res, next) => {
  try {
    const post = await getPost(req.params.id);
    res.json(post);
  } catch (err) {
    next(err);
  }
});

// Express 5 — rejected promises go straight to your error handler
router.get("/posts/:id", async (req, res) => {
  res.json(await getPost(req.params.id));
});
\`\`\`

## One error handler to rule them all

Throw meaningful errors from anywhere and translate them in one place:

\`\`\`js
class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

app.use((err, req, res, next) => {
  const status = err.statusCode ?? 500;
  res.status(status).json({ message: err.message });
});
\`\`\`

## Validate at the edge

Parse input with a schema library such as Zod right where it enters your system. Controllers then work with clean, typed data — and invalid requests get a helpful \`400\` automatically.

## Keep controllers thin

A good controller reads like a sentence: *parse input, check permission, do the thing, respond*. If it's longer than a screen, something wants to be extracted.

Small conventions, consistently applied, are what make an API pleasant to work on six months later.`,
  },
  {
    author: "lena",
    title: "Designing for dark mode without the guesswork",
    tags: ["design", "css"],
    coverImage: cover("dark-mode-night"),
    daysAgo: 12,
    views: 964,
    content: `Dark mode is not "invert the colors." Done well, it's a second, carefully tuned palette that respects the same hierarchy as your light theme.

## Start with tokens, not colors

Name colors by **role**, not by value:

\`\`\`css
:root {
  --bg: #fafaf9;
  --text: #1c1917;
  --muted: #57534e;
}

.dark {
  --bg: #0c0a09;
  --text: #f5f5f4;
  --muted: #a8a29e;
}
\`\`\`

Components only ever reference \`var(--text)\`, so switching themes is a single class change.

## Avoid pure black

Pure \`#000\` backgrounds with pure white text create harsh contrast and "halation" — text that seems to glow and blur. A very dark warm gray is easier on the eyes.

## Reduce saturation for accents

Bright brand colors that look great on white can vibrate on dark backgrounds. Lighten them and pull back the saturation a touch.

## Respect the system, remember the choice

- Default to \`prefers-color-scheme\`.
- Let people override it with a toggle.
- Apply the theme **before first paint** so there's no flash of the wrong colors.

## Test with real content

Screenshots of empty states lie. Check long articles, code blocks, images and forms. That's where dark themes usually break.`,
  },
  {
    author: "maya",
    title: "Ship small, ship often",
    tags: ["productivity", "engineering"],
    coverImage: cover("small-boats-harbor"),
    daysAgo: 16,
    views: 1502,
    content: `The biggest projects I've seen fail didn't fail because of bad ideas. They failed because they stayed invisible for too long.

## Small batches are a superpower

When you ship in small pieces:

- **Feedback arrives early**, while changes are still cheap.
- **Risk stays small**, because each release changes little.
- **Momentum builds**, because progress is visible every week.

## What "small" really means

Small doesn't mean trivial. It means *complete enough to learn from*. A single page that works end-to-end beats five half-built features.

> If you're not a little embarrassed by the first version, you shipped too late.

## A checklist before you start

1. What's the smallest version someone could actually use?
2. How will I know if it's working?
3. What can I deliberately leave out?

Write the answers down before you write any code. You'll be surprised how often the third question saves you a week.`,
  },
  {
    author: "rafi",
    title: "What I learned moving from MongoDB to PostgreSQL",
    tags: ["postgresql", "prisma", "database"],
    coverImage: cover("migration-birds"),
    daysAgo: 20,
    views: 2745,
    content: `This very blog started life on MongoDB. It now runs on PostgreSQL with Prisma. Here's what changed — and what surprised me.

## Relations are a feature, not a burden

In a document store, "who liked this post?" tends to become an ever-growing array inside the post document. In Postgres it's a tiny join table with a composite primary key:

\`\`\`prisma
model Like {
  userId String
  postId String

  @@id([userId, postId])
}
\`\`\`

The primary key makes double-likes impossible *at the database level*. No application code required.

## Constraints catch bugs for free

Unique usernames, required fields, foreign keys with \`ON DELETE CASCADE\` — each one is a class of bug that simply can't happen anymore.

## Arrays are still there when you want them

Postgres has real array columns. Tags as \`text[]\` with a GIN index gave me the document-style convenience I liked, with fast lookups.

## Migrations tell the story

Every schema change is a SQL file in version control. Reviewing a migration in a pull request is far easier than discovering, at runtime, that half your documents have a different shape.

## Would I do it again?

Yes. For content with clear relationships — users, posts, comments, likes — a relational database is simply a better fit.`,
  },
  {
    author: "lena",
    title: "Typography is ninety percent of web design",
    tags: ["design", "typography"],
    coverImage: cover("letterpress-type"),
    daysAgo: 25,
    views: 1133,
    content: `Most of the web is text. Get the text right and you've done most of the design work.

## Measure: keep lines readable

The ideal line length is roughly **60–75 characters**. Longer lines tire the eye; shorter ones break the rhythm of reading. In CSS, \`max-width: 65ch\` is a great starting point.

## Leading: let it breathe

Body text usually wants a line-height between \`1.5\` and \`1.8\`. Headings want less — around \`1.1\` to \`1.25\` — so multi-line titles still read as one unit.

## Pair with purpose

A classic combination: an expressive **serif** for headings and a neutral **sans-serif** for body and interface text. The contrast creates hierarchy without shouting.

## Size with a scale

Pick a ratio and stick to it. Random sizes create visual noise; a scale creates harmony.

| Role       | Size  |
|------------|-------|
| Body       | 18px  |
| Subheading | 24px  |
| Heading    | 36px  |
| Display    | 56px  |

## Details that add up

- Use real quotes (“ ”) and apostrophes (’).
- Balance headline wrapping with \`text-wrap: balance\`.
- Turn on tabular numbers in tables.

None of these are dramatic on their own. Together, they're the difference between a page you skim and a page you read.`,
  },
  {
    author: "maya",
    title: "Notes for a future post on reading slowly",
    tags: ["writing"],
    draft: true,
    content: `Rough notes — not ready yet.

- Why do we skim everything now?
- Reading on paper vs. screens
- The "one article a day" experiment`,
  },
];

const likes = [
  ["rafi", 0],
  ["lena", 0],
  ["maya", 1],
  ["lena", 1],
  ["maya", 2],
  ["maya", 3],
  ["rafi", 3],
  ["rafi", 4],
  ["lena", 4],
  ["maya", 5],
  ["lena", 5],
  ["maya", 6],
];

const comments = [
  ["rafi", 0, "The Friday re-read is such a good idea. Stealing this."],
  ["lena", 0, "“Writing questions, not just answers” — this changed how I keep notes."],
  ["lena", 1, "The EXPLAIN ANALYZE section finally made composite indexes click for me."],
  ["maya", 1, "Bookmarking this for the next time someone asks why their query is slow."],
  ["maya", 3, "Warm grays instead of pure black made a huge difference on our site."],
  ["lena", 5, "The composite primary key trick for likes is so elegant."],
  ["rafi", 6, "Tabular numbers in tables — small detail, big improvement."],
];

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const main = async () => {
  if (!env.databaseUrl) throw new Error("DATABASE_URL is missing — add it to your .env file first.");

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const byUsername = {};

  for (const { email, ...profile } of users) {
    byUsername[profile.username] = await prisma.user.upsert({
      where: { email },
      update: profile,
      create: { ...profile, email, passwordHash },
    });
  }

  const authorIds = Object.values(byUsername).map((user) => user.id);
  await prisma.post.deleteMany({ where: { authorId: { in: authorIds } } });

  const created = [];
  for (const post of posts) {
    let slug = slugify(post.title);
    if (await prisma.post.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${slug}-${randomSuffix()}`;
    }

    const publishedAt = post.draft ? null : daysAgo(post.daysAgo);

    created.push(
      await prisma.post.create({
        data: {
          title: post.title,
          slug,
          content: post.content,
          excerpt: makeExcerpt(post.content),
          coverImage: post.coverImage ?? null,
          tags: post.tags,
          status: post.draft ? "draft" : "published",
          readingTime: readingTime(post.content),
          views: post.views ?? 0,
          publishedAt,
          createdAt: publishedAt ?? new Date(),
          authorId: byUsername[post.author].id,
        },
      })
    );
  }

  await prisma.like.createMany({
    data: likes.map(([username, index]) => ({ userId: byUsername[username].id, postId: created[index].id })),
    skipDuplicates: true,
  });

  await prisma.comment.createMany({
    data: comments.map(([username, index, content], i) => ({
      content,
      postId: created[index].id,
      authorId: byUsername[username].id,
      createdAt: new Date(created[index].publishedAt.getTime() + (i + 1) * 3 * 60 * 60 * 1000),
    })),
  });

  console.log(`Seeded ${users.length} users, ${created.length} posts, ${likes.length} likes, ${comments.length} comments.`);
  console.log(`Sign in with ${users[0].email} / ${DEMO_PASSWORD}`);
};

main()
  .catch((error) => {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
