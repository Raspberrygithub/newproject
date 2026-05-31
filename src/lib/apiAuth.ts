import { NextResponse } from "next/server";
import { isAuthed } from "./auth";

/** Returns a 401 response if the request isn't authed, otherwise null. */
export function requireAuth(): NextResponse | null {
  if (!isAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
