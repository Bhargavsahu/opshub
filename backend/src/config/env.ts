import { z } from "zod";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : process.env.NODE_ENV === "test"
      ? ".env.test"
      : ".env.development";

// Look in cwd first, then monorepo root (two levels up from this file)
const __dirname = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(__dirname, "..", "..", "..");
const cwdPath = resolve(process.cwd(), envFile);
const rootPath = resolve(monorepoRoot, envFile);
const envPath = existsSync(cwdPath) ? cwdPath : rootPath;

config({ path: envPath });

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
