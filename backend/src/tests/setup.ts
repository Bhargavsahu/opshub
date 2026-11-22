import { beforeAll, afterAll } from "vitest";
import { seedTestDb } from "./helpers.js";
import { prisma } from "../config/database.js";

beforeAll(async () => {
  await seedTestDb();
}, 30_000);

afterAll(async () => {
  await prisma.$disconnect();
});
