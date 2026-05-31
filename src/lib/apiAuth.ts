import { NextResponse } from "next/server";

// Auth is disabled — the app runs open (no passcode). This stays as a no-op so
// the API routes don't need to change if a lock is added back later.
export function requireAuth(): NextResponse | null {
  return null;
}
