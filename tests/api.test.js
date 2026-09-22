const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const request = require("supertest");

const { startTestDatabase } = require("./helpers");

let app;
let stopDatabase;

before(async () => {
  stopDatabase = await startTestDatabase();
  app = require("../src/app");
});

after(async () => {
  await stopDatabase();
});

const signUp = async (overrides = {}) => {
  const agent = request.agent(app);
  const username = overrides.username ?? `user_${Math.random().toString(36).slice(2, 8)}`;
  const res = await agent.post("/api/auth/register").send({
    name: "Test User",
    username,
    email: `${username}@example.com`,
    password: "password123",
    ...overrides,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { agent, user: res.body.user };
};

const samplePost = (overrides = {}) => ({
  title: "Hello PostgreSQL",
  content: "# Heading\n\nSome **bold** words about databases and `code`.",
  tags: ["Postgres", "prisma"],
  status: "published",
  ...overrides,
});

describe("health & routing", () => {
  test("health check reports ok", async () => {
    const res = await request(app).get("/api/health");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: "ok" });
  });

  test("unknown API routes return JSON 404", async () => {
    const res = await request(app).get("/api/nope");
    assert.equal(res.status, 404);
    assert.match(res.body.message, /not found/i);
  });

  test("malformed JSON is a 400", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad");
    assert.equal(res.status, 400);
    assert.equal(res.body.message, "Malformed JSON body");
  });
});

describe("auth", () => {
  test("register signs the user in with an httpOnly cookie", async () => {
    const agent = request.agent(app);
    const res = await agent.post("/api/auth/register").send({
      name: "Maya",
      username: "Maya_Writes",
      email: "MAYA@example.com",
      password: "password123",
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.user.username, "maya_writes");
    assert.equal(res.body.user.email, "maya@example.com");
    assert.equal(res.body.user.passwordHash, undefined);
    assert.match(res.headers["set-cookie"][0], /sb_token=.+HttpOnly/i);

    const me = await agent.get("/api/auth/me");
    assert.equal(me.body.user.username, "maya_writes");
  });

  test("duplicate email or username is a 409", async () => {
    await signUp({ username: "taken", email: "taken@example.com" });

    const sameEmail = await request(app)
      .post("/api/auth/register")
      .send({ name: "X", username: "other", email: "taken@example.com", password: "password123" });
    assert.equal(sameEmail.status, 409);
    assert.equal(sameEmail.body.details[0].field, "email");

    const sameUsername = await request(app)
      .post("/api/auth/register")
      .send({ name: "X", username: "taken", email: "new@example.com", password: "password123" });
    assert.equal(sameUsername.status, 409);
    assert.equal(sameUsername.body.details[0].field, "username");
  });

  test("invalid input returns field details", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "", username: "a!", email: "nope", password: "short" });

    assert.equal(res.status, 400);
    const fields = res.body.details.map((detail) => detail.field);
    assert.deepEqual(new Set(fields), new Set(["name", "username", "email", "password"]));
  });

  test("login, wrong password, logout", async () => {
    await signUp({ username: "loginuser", email: "login@example.com" });

    const bad = await request(app).post("/api/auth/login").send({ email: "login@example.com", password: "wrongpass" });
    assert.equal(bad.status, 401);

    const unknown = await request(app).post("/api/auth/login").send({ email: "ghost@example.com", password: "password123" });
    assert.equal(unknown.status, 401);

    const agent = request.agent(app);
    const ok = await agent.post("/api/auth/login").send({ email: "LOGIN@example.com", password: "password123" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.user.username, "loginuser");

    await agent.post("/api/auth/logout").expect(204);
    const me = await agent.get("/api/auth/me");
    assert.equal(me.body.user, null);
  });

  test("anonymous /me returns null, not an error", async () => {
    const res = await request(app).get("/api/auth/me");
    assert.equal(res.status, 200);
    assert.equal(res.body.user, null);
  });

  test("a tampered cookie is ignored", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", "sb_token=not-a-real-token");
    assert.equal(res.body.user, null);
  });

  test("profile update and password change", async () => {
    const { agent } = await signUp({ username: "profiler", email: "profiler@example.com" });

    const updated = await agent
      .patch("/api/auth/me")
      .send({ name: "New Name", bio: "Writes about things", avatar: "https://example.com/a.png" });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.user.name, "New Name");

    const badAvatar = await agent.patch("/api/auth/me").send({ avatar: "javascript:alert(1)" });
    assert.equal(badAvatar.status, 400);

    const wrong = await agent.patch("/api/auth/password").send({ currentPassword: "nope", newPassword: "newpassword1" });
    assert.equal(wrong.status, 400);

    await agent.patch("/api/auth/password").send({ currentPassword: "password123", newPassword: "newpassword1" }).expect(204);
    await request(app).post("/api/auth/login").send({ email: "profiler@example.com", password: "newpassword1" }).expect(200);
  });
});

describe("posts", () => {
  test("writing requires authentication", async () => {
    const res = await request(app).post("/api/posts").send(samplePost());
    assert.equal(res.status, 401);
  });

  test("create a published post with derived fields", async () => {
    const { agent, user } = await signUp();
    const res = await agent.post("/api/posts").send(samplePost({ title: "Déjà vu: Indexes 101" }));

    assert.equal(res.status, 201);
    const { post } = res.body;
    assert.equal(post.slug, "deja-vu-indexes-101");
    assert.deepEqual(post.tags, ["postgres", "prisma"]);
    assert.equal(post.excerpt, "Some bold words about databases and code.");
    assert.equal(post.customExcerpt, false);
    assert.equal(post.readingTime, 1);
    assert.ok(post.publishedAt);
    assert.equal(post.author.username, user.username);
    assert.equal(post.author.email, undefined);
  });

  test("slugs are unique and keep non-Latin scripts", async () => {
    const { agent } = await signUp();
    const a = await agent.post("/api/posts").send(samplePost({ title: "Same Title" }));
    const b = await agent.post("/api/posts").send(samplePost({ title: "Same Title" }));
    assert.equal(a.body.post.slug, "same-title");
    assert.match(b.body.post.slug, /^same-title-[0-9a-f]{6}$/);

    const bangla = await agent.post("/api/posts").send(samplePost({ title: "আমার প্রথম ব্লগ" }));
    assert.equal(bangla.body.post.slug, "আমার-প্রথম-ব্লগ");

    const fetched = await request(app).get(`/api/posts/${encodeURIComponent(bangla.body.post.slug)}`);
    assert.equal(fetched.status, 200);
  });

  test("drafts are private to their author", async () => {
    const { agent } = await signUp();
    const { body } = await agent.post("/api/posts").send(samplePost({ title: "Secret draft", status: "draft" }));
    assert.equal(body.post.publishedAt, null);

    await request(app).get(`/api/posts/${body.post.slug}`).expect(404);
    await agent.get(`/api/posts/${body.post.slug}`).expect(200);

    const list = await request(app).get("/api/posts?q=secret");
    assert.equal(list.body.pagination.total, 0);

    const mine = await agent.get("/api/posts/mine?status=draft");
    assert.equal(mine.body.posts.length, 1);
  });

  test("draft slug follows the title until published, then stays stable", async () => {
    const { agent } = await signUp();
    const { body } = await agent.post("/api/posts").send(samplePost({ title: "Working title", status: "draft" }));

    const renamed = await agent.patch(`/api/posts/${body.post.id}`).send({ title: "Final title" });
    assert.equal(renamed.body.post.slug, "final-title");

    const published = await agent.patch(`/api/posts/${body.post.id}`).send({ status: "published" });
    assert.ok(published.body.post.publishedAt);

    const retitled = await agent.patch(`/api/posts/${body.post.id}`).send({ title: "Another title" });
    assert.equal(retitled.body.post.slug, "final-title");
  });

  test("auto excerpts follow content, custom excerpts stick", async () => {
    const { agent } = await signUp();
    const { body } = await agent.post("/api/posts").send(samplePost({ content: "First version." }));

    const auto = await agent
      .patch(`/api/posts/${body.post.id}`)
      .send({ content: "Second version.", excerpt: body.post.excerpt });
    assert.equal(auto.body.post.excerpt, "Second version.");

    const custom = await agent.patch(`/api/posts/${body.post.id}`).send({ excerpt: "My own summary" });
    assert.equal(custom.body.post.excerpt, "My own summary");
    assert.equal(custom.body.post.customExcerpt, true);

    const kept = await agent.patch(`/api/posts/${body.post.id}`).send({ content: "Third version." });
    assert.equal(kept.body.post.excerpt, "My own summary");

    const cleared = await agent.patch(`/api/posts/${body.post.id}`).send({ excerpt: "" });
    assert.equal(cleared.body.post.excerpt, "Third version.");
    assert.equal(cleared.body.post.customExcerpt, false);
  });

  test("auto excerpts skip headings and code", async () => {
    const { agent } = await signUp();
    const { body } = await agent.post("/api/posts").send(
      samplePost({
        title: "Excerpt shape",
        content: "Intro paragraph.\n\n## A heading\n\n```js\nconst x = 1;\n```\n\nMore [linked](https://example.com) text.",
      })
    );
    assert.equal(body.post.excerpt, "Intro paragraph. More linked text.");

    const onlyHeading = await agent.post("/api/posts").send(samplePost({ title: "Only heading", content: "# Just a title" }));
    assert.equal(onlyHeading.body.post.excerpt, "Just a title");
  });

  test("only the author can edit or delete", async () => {
    const owner = await signUp();
    const stranger = await signUp();
    const { body } = await owner.agent.post("/api/posts").send(samplePost({ title: "Owned post" }));

    await stranger.agent.patch(`/api/posts/${body.post.id}`).send({ title: "Hacked" }).expect(403);
    await stranger.agent.delete(`/api/posts/${body.post.id}`).expect(403);
    await owner.agent.delete(`/api/posts/${body.post.id}`).expect(204);
    await request(app).get(`/api/posts/${body.post.slug}`).expect(404);
  });

  test("malformed ids are a 404, invalid payloads a 400", async () => {
    const { agent } = await signUp();
    await agent.patch("/api/posts/not-a-uuid").send({ title: "x" }).expect(404);

    const res = await agent
      .post("/api/posts")
      .send(samplePost({ title: "a", tags: ["1", "2", "3", "4", "5", "6"], coverImage: "ftp://x" }));
    assert.equal(res.status, 400);
    const fields = res.body.details.map((detail) => detail.field);
    assert.ok(fields.includes("title") && fields.includes("tags") && fields.includes("coverImage"));
  });

  test("views are counted for readers but not the author", async () => {
    const { agent } = await signUp();
    const { body } = await agent.post("/api/posts").send(samplePost({ title: "View counter" }));

    await agent.get(`/api/posts/${body.post.slug}`);
    await request(app).get(`/api/posts/${body.post.slug}`);
    const res = await request(app).get(`/api/posts/${body.post.slug}`);
    assert.equal(res.body.post.views, 2);
  });
});

describe("listing, search and tags", () => {
  let author;

  before(async () => {
    author = await signUp({ username: "lister", email: "lister@example.com" });
    for (let i = 1; i <= 12; i++) {
      await author.agent.post("/api/posts").send(
        samplePost({
          title: `Listing post ${i}`,
          tags: i % 2 ? ["odd", "listing"] : ["even", "listing"],
        })
      );
    }
  });

  test("paginates newest first", async () => {
    const page1 = await request(app).get("/api/posts?author=lister&limit=5");
    assert.equal(page1.body.posts.length, 5);
    assert.equal(page1.body.posts[0].title, "Listing post 12");
    assert.deepEqual(page1.body.pagination, { page: 1, limit: 5, total: 12, totalPages: 3 });

    const page3 = await request(app).get("/api/posts?author=lister&limit=5&page=3");
    assert.equal(page3.body.posts.length, 2);
  });

  test("filters by tag and searches case-insensitively", async () => {
    const odd = await request(app).get("/api/posts?tag=ODD&author=lister");
    assert.equal(odd.body.pagination.total, 6);

    const search = await request(app).get("/api/posts?q=LISTING POST 1");
    assert.deepEqual(
      search.body.posts.map((post) => post.title).sort(),
      ["Listing post 1", "Listing post 10", "Listing post 11", "Listing post 12"]
    );
  });

  test("rejects invalid query params", async () => {
    await request(app).get("/api/posts?limit=500").expect(400);
    await request(app).get("/api/posts?sort=random").expect(400);
  });

  test("tags endpoint counts published posts", async () => {
    const res = await request(app).get("/api/tags");
    const listing = res.body.tags.find((tag) => tag.name === "listing");
    assert.equal(listing.count, 12);
  });

  test("public profile includes stats", async () => {
    const res = await request(app).get("/api/users/LISTER");
    assert.equal(res.status, 200);
    assert.equal(res.body.user.username, "lister");
    assert.equal(res.body.user.email, undefined);
    assert.equal(res.body.stats.posts, 12);

    await request(app).get("/api/users/nobody_here").expect(404);
  });

  test("RSS feed and sitemap list published posts", async () => {
    const rss = await request(app).get("/rss.xml");
    assert.equal(rss.status, 200);
    assert.match(rss.headers["content-type"], /rss\+xml/);
    assert.match(rss.text, /<title>Listing post 12<\/title>/);

    const sitemap = await request(app).get("/sitemap.xml");
    assert.match(sitemap.text, /\/post\/listing-post-1</);
  });
});

describe("likes and comments", () => {
  test("likes are idempotent and reflected on the post", async () => {
    const author = await signUp();
    const reader = await signUp();
    const { body } = await author.agent.post("/api/posts").send(samplePost({ title: "Likeable" }));
    const id = body.post.id;

    await request(app).post(`/api/posts/${id}/like`).expect(401);

    const first = await reader.agent.post(`/api/posts/${id}/like`);
    const second = await reader.agent.post(`/api/posts/${id}/like`);
    assert.deepEqual(first.body, { liked: true, likes: 1 });
    assert.deepEqual(second.body, { liked: true, likes: 1 });

    const seen = await reader.agent.get(`/api/posts/${body.post.slug}`);
    assert.equal(seen.body.post.likedByMe, true);
    assert.equal(seen.body.post.likes, 1);

    const unliked = await reader.agent.delete(`/api/posts/${id}/like`);
    assert.deepEqual(unliked.body, { liked: false, likes: 0 });
  });

  test("popular sort orders by likes", async () => {
    const author = await signUp({ username: "popular_author", email: "popular@example.com" });
    const fans = await Promise.all([signUp(), signUp()]);
    const quiet = await author.agent.post("/api/posts").send(samplePost({ title: "Quiet post" }));
    const loved = await author.agent.post("/api/posts").send(samplePost({ title: "Loved post" }));
    const liked = await author.agent.post("/api/posts").send(samplePost({ title: "Liked once" }));

    for (const fan of fans) await fan.agent.post(`/api/posts/${loved.body.post.id}/like`);
    await fans[0].agent.post(`/api/posts/${liked.body.post.id}/like`);

    const res = await request(app).get("/api/posts?author=popular_author&sort=popular");
    assert.deepEqual(
      res.body.posts.map((post) => post.title),
      ["Loved post", "Liked once", quiet.body.post.title]
    );
  });

  test("comment permissions and cascade on post delete", async () => {
    const author = await signUp();
    const commenter = await signUp();
    const stranger = await signUp();
    const { body } = await author.agent.post("/api/posts").send(samplePost({ title: "Discuss" }));
    const id = body.post.id;

    await request(app).post(`/api/posts/${id}/comments`).send({ content: "hi" }).expect(401);
    await commenter.agent.post(`/api/posts/${id}/comments`).send({ content: "   " }).expect(400);

    const c1 = await commenter.agent.post(`/api/posts/${id}/comments`).send({ content: "Great read!" });
    const c2 = await commenter.agent.post(`/api/posts/${id}/comments`).send({ content: "Second thought" });
    assert.equal(c1.status, 201);
    assert.equal(c1.body.comment.author.username, commenter.user.username);

    const list = await request(app).get(`/api/posts/${id}/comments`);
    assert.deepEqual(list.body.comments.map((comment) => comment.content), ["Second thought", "Great read!"]);

    await stranger.agent.delete(`/api/comments/${c1.body.comment.id}`).expect(403);
    await commenter.agent.delete(`/api/comments/${c1.body.comment.id}`).expect(204);
    await author.agent.delete(`/api/comments/${c2.body.comment.id}`).expect(204);

    await commenter.agent.post(`/api/posts/${id}/comments`).send({ content: "Still here" }).expect(201);
    const counted = await request(app).get(`/api/posts/${body.post.slug}`);
    assert.equal(counted.body.post.comments, 1);

    await author.agent.delete(`/api/posts/${id}`).expect(204);
    await request(app).get(`/api/posts/${id}/comments`).expect(404);
  });

  test("drafts cannot be liked or commented on", async () => {
    const author = await signUp();
    const { body } = await author.agent.post("/api/posts").send(samplePost({ title: "Draft only", status: "draft" }));

    await author.agent.post(`/api/posts/${body.post.id}/like`).expect(404);
    await author.agent.post(`/api/posts/${body.post.id}/comments`).send({ content: "x" }).expect(404);
  });
});
