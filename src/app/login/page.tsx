"use client";

import { useState } from "react";

export default function LoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (res.ok) {
      window.location.href = "/";
    } else {
      setError("Incorrect passcode");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Memory</h1>
      <p className="text-muted">Enter your passcode</p>
      <input
        className="input max-w-xs text-center"
        type="password"
        inputMode="numeric"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="••••"
      />
      <button className="btn bg-accent w-full max-w-xs" disabled={busy} onClick={submit}>
        {busy ? "…" : "Unlock"}
      </button>
      {error && <p className="text-bad text-sm">{error}</p>}
    </div>
  );
}
