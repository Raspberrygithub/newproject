"use client";

import { useState } from "react";
import { api } from "@/lib/client";

export default function AddPage() {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [tags, setTags] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [defining, setDefining] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function define() {
    if (!front.trim()) {
      setError("Type the front first (the term/question to look up).");
      return;
    }
    setDefining(true);
    setError("");
    try {
      const { back: generated } = await api<{ back: string }>("/api/ai/define", {
        method: "POST",
        body: JSON.stringify({ front, instructions }),
      });
      setBack(generated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setDefining(false);
    }
  }

  async function save() {
    if (!front.trim()) {
      setError("Front is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/cards", {
        method: "POST",
        body: JSON.stringify({
          front,
          back,
          tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      setMsg("Card saved ✓");
      setFront("");
      setBack("");
      setTags("");
      setInstructions("");
      setTimeout(() => setMsg(""), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Add a card</h1>

      <div className="space-y-2">
        <label className="text-sm text-muted">Front (term / question)</label>
        <input
          className="input"
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="e.g. What is osmosis?"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-muted">Back (answer)</label>
          <button
            className="pill bg-accentDim text-accent"
            disabled={defining}
            onClick={define}
          >
            {defining ? "Claude is writing…" : "✨ Ask Claude"}
          </button>
        </div>
        <textarea
          className="input min-h-[120px]"
          value={back}
          onChange={(e) => setBack(e.target.value)}
          placeholder="Type it, or let Claude write it for you."
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted">
          Optional: instructions for Claude (tone, depth, language…)
        </label>
        <input
          className="input text-sm"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. explain simply for a beginner, in one sentence"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted">Tags</label>
        <input
          className="input text-sm"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="biology, exam"
        />
      </div>

      <button className="btn w-full bg-good" disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save card"}
      </button>

      {error && <p className="text-bad text-sm">{error}</p>}
      {msg && <p className="text-good text-sm">{msg}</p>}
    </div>
  );
}
