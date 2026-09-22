const env = require("./src/config/env");

const startServer = async () => {
  env.assertServerConfig();

  const app = require("./src/app");
  const prisma = require("./src/lib/prisma");

  // Fail fast with a readable error if PostgreSQL is unreachable.
  await prisma.$queryRaw`SELECT 1`;
  console.log("PostgreSQL connected");

  const server = app.listen(env.port, () => {
    console.log(`SimpleBlog API running on http://localhost:${env.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

// Turns the most common PostgreSQL setup mistakes into a readable next step.
const databaseHint = (message) => {
  if (/28P01|password authentication failed/i.test(message)) {
    return "PostgreSQL rejected the username/password in DATABASE_URL — fix it in .env.";
  }
  if (/3D000|does not exist/i.test(message)) {
    return "The database doesn't exist yet — run `npm run db:migrate` to create it.";
  }
  if (/ECONNREFUSED|can't reach database/i.test(message)) {
    return "PostgreSQL isn't reachable — is it running, and are the host/port in DATABASE_URL correct?";
  }
  return null;
};

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  const hint = databaseHint(error.message);
  if (hint) console.error(`\nHint: ${hint}\n`);
  process.exit(1);
});
