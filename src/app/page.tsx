"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getCards,
  getQueue,
  getStats,
  addCard,
  addCards,
  deleteCard,
  gradeCard,
  delayCard,
  exportJSON,
  importJSON,
  type Card,
  type ReviewStats,
} from "@/lib/store";

type Grade = "again" | "hard" | "good" | "easy";
type Tab = "review" | "add" | "browse";

// Tiny helper for the two optional Claude calls. If the key isn't set or the
// network's down, these throw and we show a friendly message — the rest of the
// app keeps working.
async function jsonPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("review");
  const [cards, setCards] = useState<Card[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [queue, setQueue] = useState<Card[]>([]);
  const [current, setCurrent] = useState<Card | null>(null);
  const [showBack, setShowBack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add form
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  // Voice / dictation
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Browse
  const [search, setSearch] = useState("");

  // ---- Data loading (all local & synchronous; refresh() repaints state) ----
  const refresh = useCallback(() => {
    setCards(getCards());
    setStats(getStats());
  }, []);

  const reloadQueue = useCallback(() => {
    const q = getQueue();
    setQueue(q);
    setCurrent(q[0] || null);
    setShowBack(false);
  }, []);

  useEffect(() => {
    refresh();
    reloadQueue();
  }, [refresh, reloadQueue]);

  // ---- Actions ----
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    addCard({
      front,
      back,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setFront("");
    setBack("");
    setTags("");
    refresh();
    reloadQueue();
    setTab("review");
  };

  const handleDelete = (id: string) => {
    deleteCard(id);
    refresh();
    reloadQueue();
  };

  const handleAiDefine = async () => {
    if (!front.trim()) {
      setError("Enter a term on the front first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { back: aiBack } = await jsonPost<{ back: string }>(
        "/api/ai/define",
        { front: front.trim() }
      );
      setBack(aiBack);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGrade = (grade: Grade) => {
    if (!current) return;
    gradeCard(current.id, grade);
    const rest = queue.slice(1);
    setQueue(rest);
    setCurrent(rest[0] || null);
    setShowBack(false);
    setStats(getStats());
  };

  const handleDelay = (minutes: number) => {
    if (!current) return;
    delayCard(current.id, minutes);
    const rest = queue.slice(1);
    setQueue(rest);
    setCurrent(rest[0] || null);
    setShowBack(false);
    setStats(getStats());
  };

  // ---- Voice ----
  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition not supported on this browser.");
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text);
    };
    r.onend = () => setListening(false);
    r.start();
    recognitionRef.current = r;
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const handleParse = async () => {
    if (!transcript.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { cards: parsed } = await jsonPost<{
        cards: { front: string; back: string; tags?: string[] }[];
      }>("/api/ai/parse", { transcript: transcript.trim() });
      addCards(parsed);
      setTranscript("");
      refresh();
      reloadQueue();
      setTab("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  // ---- Backup / restore ----
  const handleExport = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memory-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const n = importJSON(String(reader.result));
        refresh();
        reloadQueue();
        setError(null);
        alert(`Restored ${n} cards.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ---- Render ----
  const filtered = search
    ? cards.filter(
        (c) =>
          c.front.toLowerCase().includes(search.toLowerCase()) ||
          c.back.toLowerCase().includes(search.toLowerCase()) ||
          c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : cards;

  return (
    <main className="container">
      <header className="header">
        <h1>🧠 Memory</h1>
        {stats && (
          <div className="stats">
            <span className="stat">
              <strong>{stats.due}</strong> due
            </span>
            <span className="stat">
              <strong>{stats.total}</strong> total
            </span>
            <span className="stat">
              <strong>{stats.reviewedToday}</strong> today
            </span>
          </div>
        )}
      </header>

      {error && (
        <div className="error" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      <nav className="tabs">
        <button
          className={tab === "review" ? "tab active" : "tab"}
          onClick={() => {
            setTab("review");
            reloadQueue();
          }}
        >
          Review
        </button>
        <button
          className={tab === "add" ? "tab active" : "tab"}
          onClick={() => setTab("add")}
        >
          Add
        </button>
        <button
          className={tab === "browse" ? "tab active" : "tab"}
          onClick={() => setTab("browse")}
        >
          Browse ({cards.length})
        </button>
      </nav>

      {tab === "review" && (
        <section className="card-area">
          {!current && (
            <div className="empty">
              <p>🎉 Nothing due right now.</p>
              <button className="btn" onClick={() => setTab("add")}>
                Add cards
              </button>
            </div>
          )}
          {current && (
            <div className="flashcard">
              <div className="card-front">{current.front}</div>
              {showBack && <div className="card-back">{current.back}</div>}
              {current.tags.length > 0 && (
                <div className="card-tags">
                  {current.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {!showBack ? (
                <button
                  className="btn primary"
                  onClick={() => setShowBack(true)}
                >
                  Show answer
                </button>
              ) : (
                <div className="grades">
                  <button
                    className="grade again"
                    onClick={() => handleGrade("again")}
                  >
                    Again
                  </button>
                  <button
                    className="grade hard"
                    onClick={() => handleGrade("hard")}
                  >
                    Hard
                  </button>
                  <button
                    className="grade good"
                    onClick={() => handleGrade("good")}
                  >
                    Good
                  </button>
                  <button
                    className="grade easy"
                    onClick={() => handleGrade("easy")}
                  >
                    Easy
                  </button>
                </div>
              )}
              {showBack && (
                <div className="delays">
                  <button className="delay" onClick={() => handleDelay(5)}>
                    5 min
                  </button>
                  <button className="delay" onClick={() => handleDelay(1440)}>
                    1 day
                  </button>
                  <button className="delay" onClick={() => handleDelay(2880)}>
                    2 days
                  </button>
                  <button className="delay" onClick={() => handleDelay(4320)}>
                    3 days
                  </button>
                  <button className="delay" onClick={() => handleDelay(20160)}>
                    2 weeks
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {tab === "add" && (
        <section className="form-area">
          <form onSubmit={handleAdd}>
            <label>
              Front
              <textarea
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="Term or question"
                rows={2}
              />
            </label>
            <button
              type="button"
              className="btn ai"
              onClick={handleAiDefine}
              disabled={busy}
            >
              ✨ Ask Claude for the answer
            </button>
            <label>
              Back
              <textarea
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="Answer or definition"
                rows={4}
              />
            </label>
            <label>
              Tags (comma-separated)
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="biology, chapter-3"
              />
            </label>
            <button type="submit" className="btn primary" disabled={busy}>
              Save card
            </button>
          </form>

          <div className="divider">or dictate several</div>

          <div className="voice">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Talk or type a brain-dump; Claude splits it into cards…"
              rows={4}
            />
            <div className="voice-controls">
              {!listening ? (
                <button type="button" className="btn" onClick={startListening}>
                  🎙️ Start
                </button>
              ) : (
                <button
                  type="button"
                  className="btn recording"
                  onClick={stopListening}
                >
                  ⏹ Stop
                </button>
              )}
              <button
                type="button"
                className="btn primary"
                onClick={handleParse}
                disabled={busy || !transcript.trim()}
              >
                {busy ? "Working…" : "Make cards →"}
              </button>
            </div>
          </div>
        </section>
      )}

      {tab === "browse" && (
        <section className="browse-area">
          <input
            className="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards…"
          />
          <div className="card-list">
            {filtered.map((c) => (
              <div key={c.id} className="list-card">
                <div className="list-card-main">
                  <div className="list-front">{c.front}</div>
                  <div className="list-back">{c.back}</div>
                  {c.tags.length > 0 && (
                    <div className="card-tags">
                      {c.tags.map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="del"
                  onClick={() => handleDelete(c.id)}
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
            {filtered.length === 0 && <p className="muted">No cards yet.</p>}
          </div>

          <div className="backup">
            <button type="button" className="btn" onClick={handleExport}>
              ⬇ Export backup
            </button>
            <label className="btn import-label">
              ⬆ Import backup
              <input
                type="file"
                accept="application/json"
                onChange={handleImport}
                hidden
              />
            </label>
          </div>
          <p className="muted small">
            Cards are saved on this device, in this browser. Use Export to back
            up or move them to another device.
          </p>
        </section>
      )}
    </main>
  );
}
