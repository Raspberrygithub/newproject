import { NextRequest, NextResponse } from "next/server";
import { generateDefinition } from "@/lib/anthropic";

// POST /api/ai/define  body: { front, instructions? }
// "Look up this card / write the definition" — Claude fills the back.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const front = typeof body.front === "string" ? body.front.trim() : "";
  if (!front) return NextResponse.json({ error: "front is required" }, { status: 400 });

  try {
    const back = await generateDefinition(front, body.instructions);
    return NextResponse.json({ back });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
