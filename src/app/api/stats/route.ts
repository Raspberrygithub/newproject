import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";

// Always run at request time — never prerender (it queries the database).
export const dynamic = "force-dynamic";

// GET /api/stats -> high level deck stats for the dashboard.
export async function GET() {
  const unauth = requireAuth();
  if (unauth) return unauth;

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const [total, due, newCards, learning, review, reviewedToday] = await Promise.all([
    prisma.card.count(),
    prisma.card.count({ where: { due: { lte: now } } }),
    prisma.card.count({ where: { state: "new" } }),
    prisma.card.count({ where: { state: "learning" } }),
    prisma.card.count({ where: { state: "review" } }),
    prisma.review.count({ where: { createdAt: { gte: startOfDay } } }),
  ]);

  return NextResponse.json({
    total,
    due,
    newCards,
    learning,
    review,
    reviewedToday,
  });
}
