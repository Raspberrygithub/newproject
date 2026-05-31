import { PrismaClient } from "@prisma/client";

// Reuse a single Prisma client across hot-reloads in dev and across serverless
// invocations in production.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Ensure there is a default deck and return its id. Single-user convenience. */
export async function getDefaultDeckId(): Promise<string> {
  const existing = await prisma.deck.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing.id;
  const created = await prisma.deck.create({ data: { name: "My Deck" } });
  return created.id;
}
