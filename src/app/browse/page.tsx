"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatInterval } from "@/lib/scheduler";

interface Card {
  id: string;
  front: string;
  back: string;
  tags: string;
  state: string;
  intervalMin: number;
  due: string;
}

export default function BrowsePage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Card | null>(null);

  const load = useCallback((query = "") => {
    api<{ cards: Card[] }>(`/api/cards${query ? `?q=${encodeURIComponent(query)}` : ""}`).then(
      (d) => setCards(d.cards)
    );
  }, []);

  useEffect(() => load(), [load]);

  async function remove(id: string) {
    if (!confirm("Delete this card?")) return;
    await api(`/api/cards/${id}`, { method: "DELETE" });
    load(q);
  }

  async function saveEdit() {
    if (!editing) return;
    await api(`/api/cards/${editing.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        front: editing.front,
        back: editing.back,
        tags: editing.tags.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
    setEditing(null);
    load(q);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Browse</h1>

      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Search cards…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(q)}
        />
        <button className="btn bg-accent" onClick={() => load(q)}>
          Go
        </button>
      </div>

      <div className="text-sm text-muted">{cards.length} cards</div>

      <div className="space-y-2">
        {cards.map((c) => (
          <div key={c.id} className="card-surface p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold">{c.front}</div>
                <div className="truncate text-sm text-muted">{c.back}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button className="pill bg-surface2" onClick={() => setEditing(c)}>
                  Edit
                </button>
                <button className="pill bg-bad/20 text-bad" onClick={() => remove(c.id)}>
                  Del
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="pill bg-surface2 text-muted">{c.state}</span>
              <span className="pill bg-surface2 text-muted">
                next: {formatInterval(c.intervalMin || 0)}
              </span>
              {c.tags
                .split(",")
                .filter(Boolean)
                .map((t) => (
                  <span key={t} className="pill bg-accentDim text-accent">
                    {t}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="card-surface w-full max-w-xl space-y-3 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold">Edit card</h2>
            <input
              className="input"
              value={editing.front}
              onChange={(e) => setEditing({ ...editing, front: e.target.value })}
            />
            <textarea
              className="input min-h-[100px]"
              value={editing.back}
              onChange={(e) => setEditing({ ...editing, back: e.target.value })}
            />
            <input
              className="input text-sm"
              value={editing.tags}
              onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
              placeholder="tags"
            />
            <div className="grid grid-cols-2 gap-2">
              <button className="btn bg-surface2" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn bg-good" onClick={saveEdit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
