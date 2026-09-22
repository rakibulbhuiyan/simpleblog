const path = require("node:path");

// Load .env (Node's built-in loader). Tests configure process.env themselves.
if (process.env.NODE_ENV !== "test") {
  try {
    process.loadEnvFile(path.join(__dirname, "..", "..", ".env"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const nodeEnv = process.env.NODE_ENV || "development";

const env = {
  nodeEnv,
  isProd: nodeEnv === "production",
  isTest: nodeEnv === "test",
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL,
  // Max connections in the pg pool (driver default is 10).
  databasePoolSize: Number(process.env.DATABASE_POOL_SIZE) || undefined,
  jwtSecret: process.env.JWT_SECRET,
  // Public URL used in RSS/sitemap links. Falls back to the request's host.
  siteUrl: process.env.SITE_URL,
};

// Called on server start so misconfiguration fails fast with a clear message.
env.assertServerConfig = () => {
  const problems = [];

  if (!env.databaseUrl) {
    problems.push("DATABASE_URL is missing (e.g. postgresql://postgres:password@localhost:5432/simpleblog)");
  }
  if (!env.jwtSecret) {
    problems.push("JWT_SECRET is missing (any long random string)");
  } else if (env.isProd && env.jwtSecret.length < 32) {
    problems.push("JWT_SECRET must be at least 32 characters in production");
  }

  if (problems.length) {
    throw new Error(`Invalid configuration — check your .env file:\n  - ${problems.join("\n  - ")}`);
  }
};

module.exports = env;
