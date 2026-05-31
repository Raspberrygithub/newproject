import { NextRequest, NextResponse } from "next/server";
import { prisma, getDefaultDeckId } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";

// GET /api/cards            -> list all cards
// GET /api/cards?q=foo      -> search front/back/tags
export async function GET(req: NextRequest) {
  const unauth = requireAuth();
  if (unauth) return unauth;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const where = q
    ? {
        OR: [
          { front: { contains: q } },
          { back: { contains: q } },
          { tags: { contains: q } },
        ],
      }
    : {};

  const cards = await prisma.card.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ cards });
}

// POST /api/cards   body: { front, back, tags?: string[] } | { cards: DraftCard[] }
// Accepts a single card or a batch (used by voice mode).
export async function POST(req: NextRequest) {
  const unauth = requireAuth();
  if (unauth) return unauth;

  const body = await req.json().catch(() => ({}));
  const deckId = await getDefaultDeckId();

  const incoming: { front: string; back: string; tags?: string[] }[] = Array.isArray(
    body.cards
  )
    ? body.cards
    : [{ front: body.front, back: body.back, tags: body.tags }];

  const valid = incoming.filter(
    (c) => c && typeof c.front === "string" && c.front.trim().length > 0
  );
  if (valid.length === 0) {
    return NextResponse.json({ error: "front is required" }, { status: 400 });
  }

  const created = await prisma.$transaction(
    valid.map((c) =>
      prisma.card.create({
        data: {
          deckId,
          front: c.front.trim(),
          back: (c.back || "").trim(),
          tags: Array.isArray(c.tags) ? c.tags.join(",") : "",
        },
      })
    )
  );

  return NextResponse.json({ created: created.length, cards: created }, { status: 201 });
}
