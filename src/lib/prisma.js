const { PrismaPg } = require("@prisma/adapter-pg");

const { PrismaClient } = require("../generated/prisma");
const env = require("../config/env");

const adapter = new PrismaPg({ connectionString: env.databaseUrl, max: env.databasePoolSize });

const prisma = new PrismaClient({
  adapter,
  log: env.isProd || env.isTest ? ["error"] : ["warn", "error"],
});

module.exports = prisma;
