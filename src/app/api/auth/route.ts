import { NextRequest, NextResponse } from "next/server";
import { checkPasscode, passcodeRequired, AUTH_COOKIE } from "@/lib/auth";

// POST /api/auth  body: { passcode }  -> sets auth cookie if correct.
export async function POST(req: NextRequest) {
  if (!passcodeRequired()) return NextResponse.json({ ok: true });

  const body = await req.json().catch(() => ({}));
  const passcode = typeof body.passcode === "string" ? body.passcode : "";
  if (!checkPasscode(passcode)) {
    return NextResponse.json({ error: "incorrect passcode" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, passcode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
