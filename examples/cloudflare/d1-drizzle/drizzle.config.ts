import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./app/database/schema.ts",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    token: process.env.CLOUDFLARE_TOKEN!,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
  },
});
