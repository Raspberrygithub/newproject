"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

interface Draft {
  front: string;
  back: string;
  tags: string[];
}

export default function VoicePage() {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(0);
  const [error, setError] = useState("");
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interimText += r[0].transcript;
      }
      if (finalText) setTranscript((t) => (t + finalText).replace(/\s+/g, " "));
      setInterim(interimText);
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e: any) => {
      setError(e.error || "speech error");
      setListening(false);
    };
    recRef.current = rec;
    return () => rec.abort?.();
  }, []);

  function toggle() {
    setError("");
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      setInterim("");
      rec.start();
      setListening(true);
    }
  }

  async function makeCards() {
    const text = (transcript + " " + interim).trim();
    if (!text) return;
    setBusy(true);
    setError("");
    try {
      const { cards } = await api<{ cards: Draft[] }>("/api/ai/parse", {
        method: "POST",
        body: JSON.stringify({ transcript: text }),
      });
      setDrafts(cards);
      if (cards.length === 0) setError("Claude couldn't find any cards in that. Try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveAll() {
    setBusy(true);
    try {
      const { created } = await api<{ created: number }>("/api/cards", {
        method: "POST",
        body: JSON.stringify({ cards: drafts }),
      });
      setSaved(created);
      setDrafts([]);
      setTranscript("");
      setInterim("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  function editDraft(idx: number, field: keyof Draft, value: string) {
    setDrafts((d) =>
      d.map((c, i) =>
        i === idx ? { ...c, [field]: field === "tags" ? value.split(",").map((s) => s.trim()) : value } : c
      )
    );
  }

  if (!supported) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Voice add</h1>
        <p className="text-muted">
          This browser doesn&apos;t support speech recognition. Use Chrome (Android/desktop)
          or Safari on a recent iPhone — or just type your dictation below and Claude will
          still split it into cards.
        </p>
        <textarea
          className="input min-h-[140px]"
          placeholder="Type or paste your notes… e.g. 'Mitochondria — the powerhouse of the cell. Next card: what is osmosis, look it up.'"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
        <button className="btn w-full bg-accent" disabled={busy} onClick={makeCards}>
          {busy ? "Thinking…" : "Make cards with Claude"}
        </button>
        <DraftList drafts={drafts} edit={editDraft} onSave={saveAll} busy={busy} />
        {error && <p className="text-bad text-sm">{error}</p>}
        {saved > 0 && <p className="text-good text-sm">Saved {saved} cards ✓</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Voice add</h1>
      <p className="text-muted text-sm">
        Tap the mic and talk through your cards. Say things like &ldquo;front … back …&rdquo;,
        &ldquo;next card&rdquo;, or just describe a term and say &ldquo;look it up&rdquo; — Claude
        will structure them.
      </p>

      <div className="flex flex-col items-center gap-3 py-2">
        <button
          onClick={toggle}
          className={`flex h-28 w-28 items-center justify-center rounded-full text-5xl transition ${
            listening ? "animate-pulse bg-bad" : "bg-accent"
          }`}
        >
          🎙️
        </button>
        <span className="text-sm text-muted">{listening ? "Listening… tap to stop" : "Tap to talk"}</span>
      </div>

      <textarea
        className="input min-h-[120px]"
        placeholder="Your dictation appears here (and you can edit it)…"
        value={transcript + (interim ? " " + interim : "")}
        onChange={(e) => {
          setTranscript(e.target.value);
          setInterim("");
        }}
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          className="btn bg-surface2"
          onClick={() => {
            setTranscript("");
            setInterim("");
            setDrafts([]);
          }}
        >
          Clear
        </button>
        <button className="btn bg-accent" disabled={busy} onClick={makeCards}>
          {busy ? "Thinking…" : "Make cards →"}
        </button>
      </div>

      <DraftList drafts={drafts} edit={editDraft} onSave={saveAll} busy={busy} />
      {error && <p className="text-bad text-sm">{error}</p>}
      {saved > 0 && <p className="text-good text-sm">Saved {saved} cards ✓</p>}
    </div>
  );
}

function DraftList({
  drafts,
  edit,
  onSave,
  busy,
}: {
  drafts: Draft[];
  edit: (i: number, f: keyof Draft, v: string) => void;
  onSave: () => void;
  busy: boolean;
}) {
  if (drafts.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Review {drafts.length} draft cards</h2>
      {drafts.map((c, i) => (
        <div key={i} className="card-surface space-y-2 p-3">
          <input
            className="input"
            value={c.front}
            onChange={(e) => edit(i, "front", e.target.value)}
            placeholder="Front"
          />
          <textarea
            className="input min-h-[60px]"
            value={c.back}
            onChange={(e) => edit(i, "back", e.target.value)}
            placeholder="Back"
          />
          <input
            className="input text-sm"
            value={c.tags.join(", ")}
            onChange={(e) => edit(i, "tags", e.target.value)}
            placeholder="tags, comma, separated"
          />
        </div>
      ))}
      <button className="btn w-full bg-good" disabled={busy} onClick={onSave}>
        {busy ? "Saving…" : `Save all ${drafts.length} cards`}
      </button>
    </div>
  );
}
