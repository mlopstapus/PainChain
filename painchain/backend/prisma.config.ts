// Prisma configuration file
// Load dotenv only if available (dev dependency)
try {
  require("dotenv/config");
} catch (e) {
  // In production, environment variables are passed via docker-compose
}

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
