import { NextRequest, NextResponse } from "next/server";
import { parseDictationToCards } from "@/lib/anthropic";

// POST /api/ai/parse  body: { transcript }
// Turns a voice/text dictation into structured draft cards (not yet saved).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript) {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 });
  }

  try {
    const cards = await parseDictationToCards(transcript);
    return NextResponse.json({ cards });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
