import { cookies } from "next/headers";

// Minimal single-user auth: an optional passcode protects the deck once it's
// on the public web. If APP_PASSCODE is blank, the app is open (fine for local
// use). The cookie just stores the passcode value; over HTTPS this is adequate
// for a personal app. Swap for real accounts later if you go multi-user.

const COOKIE = "mm_auth";

export function passcodeRequired(): boolean {
  return Boolean(process.env.APP_PASSCODE && process.env.APP_PASSCODE.length > 0);
}

export function isAuthed(): boolean {
  if (!passcodeRequired()) return true;
  const c = cookies().get(COOKIE)?.value;
  return c === process.env.APP_PASSCODE;
}

export function checkPasscode(input: string): boolean {
  return passcodeRequired() && input === process.env.APP_PASSCODE;
}

export const AUTH_COOKIE = COOKIE;
