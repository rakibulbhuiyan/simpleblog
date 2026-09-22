# SimpleBlog

A modern, full-stack blogging platform: write in Markdown, save drafts, publish, and let readers like, comment and follow along via RSS.

**Stack:** Express 5 · PostgreSQL · Prisma 7 · React 19 · React Router 8 · TanStack Query · Tailwind CSS 4 · Vite 8

## Features

**Reading**
- Editorial home page with a featured story, latest/popular sorting, topic filters and search
- Article pages with syntax-highlighted code, reading progress bar, reading time and view counts
- Author profiles with stats (stories, views, likes)
- Light and dark themes (follows the OS, remembers your choice)
- RSS feed (`/rss.xml`) and sitemap (`/sitemap.xml`)
- Responsive down to small phones; accessible markup (skip link, labelled controls, focus styles)

**Writing**
- Markdown editor with formatting toolbar, live preview, word count and `Ctrl + S` to save
- Drafts that only you can see; publish when ready, or unpublish later
- Cover images, up to 5 tags, optional custom summary (otherwise generated from the story)
- Clean URLs that follow the title while a post is a draft and never change once it's published
- Dashboard with all your stories, drafts and stats

**Community**
- Likes (optimistic UI) and comments
- Post authors and admins can moderate comments on their posts

**Under the hood**
- Cookie-based JWT sessions (`httpOnly`, `SameSite=Lax`), scrypt password hashing
- Input validation with Zod and consistent JSON errors
- Helmet security headers with a strict Content-Security-Policy, rate limiting on auth and comments
- Markdown is rendered without raw HTML, so posts can't inject scripts
- API test suite that runs against a real, in-memory PostgreSQL (PGlite): no setup needed

## Getting started

### Prerequisites

- Node.js **22.22+**
- PostgreSQL **14+** running locally (or a hosted database such as Neon, Supabase or Railway)

### 1. Install dependencies

```bash
npm install
npm install --prefix client
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill it in:

```env
PORT=5000
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/simpleblog?schema=public"
JWT_SECRET="a-long-random-string"
```

Generate a strong secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 3. Create the database

```bash
npm run db:migrate   # creates the "simpleblog" database (if needed) and all tables
npm run db:seed      # optional: demo authors, stories, likes and comments
```

Demo login after seeding: **demo@simpleblog.dev** / **password123**

### 4. Run it

```bash
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:5000/api

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API (nodemon) and React app (Vite) together, with hot reload |
| `npm test` | API test suite on an in-memory PostgreSQL |
| `npm run build` | Generate the Prisma client and build the React app into `client/dist` |
| `npm start` | Production server (serves the API **and** the built React app) |
| `npm run db:migrate` | Create/apply migrations in development (`prisma migrate dev`) |
| `npm run db:deploy` | Apply migrations in production (`prisma migrate deploy`) |
| `npm run db:seed` | Load demo content (safe to re-run; only touches demo accounts) |
| `npm run db:studio` | Browse your data in Prisma Studio |
| `npm run db:reset` | Drop and recreate the database (development only) |

## Changing the database schema

1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate -- --name describe_your_change`
3. Commit the new folder in `prisma/migrations`

## Deploying

Any Node host with PostgreSQL works (Render, Railway, Fly.io, a VPS...):

```bash
npm install
npm run build
npm run db:deploy
NODE_ENV=production npm start
```

Set `DATABASE_URL`, `JWT_SECRET` (32+ characters) and optionally `SITE_URL` (used for links in the RSS feed and sitemap) on the host.

## Project structure

```
├── server.js                 # Starts the API (checks config and DB connection first)
├── prisma/
│   ├── schema.prisma         # Data model: User, Post, Comment, Like
│   ├── migrations/           # SQL migrations (committed)
│   └── seed.js               # Demo content
├── src/
│   ├── app.js                # Express app: security, routes, serves client/dist
│   ├── config/env.js         # Environment loading and validation
│   ├── lib/prisma.js         # Prisma client (PostgreSQL driver adapter)
│   ├── routes/               # /api/auth, /api/posts, /api/users, /api/tags, /api/comments
│   ├── controllers/          # Request handlers
│   ├── middleware/           # Auth, rate limiting, error handling
│   ├── validators/           # Zod schemas
│   └── utils/                # Slugs, excerpts, passwords, tokens, response shapes
├── tests/                    # node:test + supertest API tests
└── client/                   # React app (Vite)
    └── src/
        ├── pages/            # Home, Post, Editor, Dashboard, Profile, Settings, Auth
        ├── components/       # Layout, cards, comments, dialogs, toasts...
        ├── hooks/            # useAuth, useTheme
        └── lib/              # API client and helpers
```

## API reference

All endpoints are under `/api` and return JSON. Authentication uses the `sb_token` cookie set by register/login.

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | – | Create an account `{ name, username, email, password }` |
| POST | `/auth/login` | – | Sign in `{ email, password }` |
| POST | `/auth/logout` | – | Sign out |
| GET | `/auth/me` | – | Current user or `null` |
| PATCH | `/auth/me` | ✓ | Update `{ name, bio, avatar }` |
| PATCH | `/auth/password` | ✓ | Change password `{ currentPassword, newPassword }` |
| GET | `/posts` | – | Published posts: `?page&limit&q&tag&author&sort=latest\|popular` |
| GET | `/posts/mine` | ✓ | Your posts including drafts: `?status=all\|draft\|published` |
| GET | `/posts/:slug` | – | One post (drafts only for their author) |
| POST | `/posts` | ✓ | Create `{ title, content, excerpt?, coverImage?, tags?, status? }` |
| PATCH | `/posts/:id` | author | Update any of the fields above |
| DELETE | `/posts/:id` | author | Delete a post (with its likes and comments) |
| POST / DELETE | `/posts/:id/like` | ✓ | Like / unlike |
| GET | `/posts/:id/comments` | – | Comments, newest first |
| POST | `/posts/:id/comments` | ✓ | Add a comment `{ content }` |
| DELETE | `/comments/:id` | ✓ | Delete (comment author, post author or admin) |
| GET | `/users/:username` | – | Public profile and stats |
| GET | `/tags` | – | Most used tags with counts |
| GET | `/health` | – | Health check (includes a DB ping) |

Errors look like `{ "message": "...", "details": [{ "field": "email", "message": "..." }] }`.
