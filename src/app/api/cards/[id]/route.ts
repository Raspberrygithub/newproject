import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";

// PATCH /api/cards/:id   body: { front?, back?, tags?: string[] }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = requireAuth();
  if (unauth) return unauth;

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.front === "string") data.front = body.front.trim();
  if (typeof body.back === "string") data.back = body.back.trim();
  if (Array.isArray(body.tags)) data.tags = body.tags.join(",");

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const card = await prisma.card.update({ where: { id: params.id }, data });
  return NextResponse.json({ card });
}

// DELETE /api/cards/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = requireAuth();
  if (unauth) return unauth;

  await prisma.card.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
