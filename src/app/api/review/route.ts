import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { grade, delay, previewGrades, Grade, SchedulableCard } from "@/lib/scheduler";

// GET /api/review -> the due queue plus per-card grade previews.
export async function GET() {
  const unauth = requireAuth();
  if (unauth) return unauth;

  const now = new Date();
  const due = await prisma.card.findMany({
    where: { due: { lte: now } },
    orderBy: [{ due: "asc" }],
    take: 100,
  });

  const counts = {
    due: await prisma.card.count({ where: { due: { lte: now } } }),
    total: await prisma.card.count(),
    newCards: await prisma.card.count({ where: { state: "new" } }),
  };

  const queue = due.map((c) => ({
    ...c,
    previews: previewGrades(c as SchedulableCard, now),
  }));

  return NextResponse.json({ queue, counts });
}

// POST /api/review  body: { cardId, grade } OR { cardId, delayMinutes }
export async function POST(req: NextRequest) {
  const unauth = requireAuth();
  if (unauth) return unauth;

  const body = await req.json().catch(() => ({}));
  const { cardId } = body;
  if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) return NextResponse.json({ error: "card not found" }, { status: 404 });

  const now = new Date();
  let result;
  let gradeLabel: string;

  if (typeof body.delayMinutes === "number") {
    result = delay(card as SchedulableCard, body.delayMinutes, now);
    gradeLabel = "custom";
  } else if (typeof body.grade === "string") {
    result = grade(card as SchedulableCard, body.grade as Grade, now);
    gradeLabel = body.grade;
  } else {
    return NextResponse.json({ error: "grade or delayMinutes required" }, { status: 400 });
  }

  const [updated] = await prisma.$transaction([
    prisma.card.update({
      where: { id: cardId },
      data: {
        state: result.state,
        intervalMin: result.intervalMin,
        ease: result.ease,
        reps: result.reps,
        lapses: result.lapses,
        due: result.due,
      },
    }),
    prisma.review.create({
      data: { cardId, grade: gradeLabel, intervalMin: result.intervalMin },
    }),
  ]);

  return NextResponse.json({ card: updated, intervalMin: result.intervalMin });
}
