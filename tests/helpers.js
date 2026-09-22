const fs = require("node:fs");
const path = require("node:path");

const { PGlite } = require("@electric-sql/pglite");
const { PGLiteSocketServer } = require("@electric-sql/pglite-socket");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-hs256";
// PGlite is a single-connection database.
process.env.DATABASE_POOL_SIZE = "1";

// Boots an in-memory PostgreSQL (PGlite), applies the Prisma migrations and
// exposes it over the Postgres wire protocol so the real app code can connect.
const startTestDatabase = async () => {
  const db = await PGlite.create();

  const migrationsDir = path.join(__dirname, "..", "prisma", "migrations");
  const migrations = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const name of migrations) {
    await db.exec(fs.readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8"));
  }

  const server = new PGLiteSocketServer({ db, port: 0 });
  await server.start();
  process.env.DATABASE_URL = `postgresql://postgres:postgres@${server.getServerConn()}/postgres`;

  return async () => {
    await require("../src/lib/prisma").$disconnect();
    await server.stop();
    await db.close();
  };
};

module.exports = { startTestDatabase };
