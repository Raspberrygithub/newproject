"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { DELAY_PRESETS, formatInterval, Grade } from "@/lib/scheduler";

interface QueueCard {
  id: string;
  front: string;
  back: string;
  tags: string;
  previews: { grade: Grade; intervalMin: number }[];
}

const GRADE_META: Record<Grade, { label: string; cls: string }> = {
  again: { label: "Again", cls: "bg-bad" },
  hard: { label: "Hard", cls: "bg-warn" },
  good: { label: "Good", cls: "bg-good" },
  easy: { label: "Easy", cls: "bg-accent" },
};

export default function ReviewPage() {
  const [queue, setQueue] = useState<QueueCard[]>([]);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDelays, setShowDelays] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api<{ queue: QueueCard[] }>("/api/review")
      .then((d) => {
        setQueue(d.queue);
        setI(0);
        setRevealed(false);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const card = queue[i];

  async function answer(payload: { grade?: Grade; delayMinutes?: number }) {
    if (!card) return;
    setShowDelays(false);
    await api("/api/review", {
      method: "POST",
      body: JSON.stringify({ cardId: card.id, ...payload }),
    });
    if (i + 1 < queue.length) {
      setI(i + 1);
      setRevealed(false);
    } else {
      load(); // refetch — some cards may be due again (5-min steps)
    }
  }

  if (loading) return <Centered>Loading…</Centered>;

  if (!card) {
    return (
      <Centered>
        <div className="text-center">
          <div className="mb-2 text-5xl">🎉</div>
          <h2 className="text-xl font-semibold">All caught up</h2>
          <p className="mb-4 text-muted">No cards due right now.</p>
          <Link href="/add" className="btn bg-accent inline-block">
            Add a card
          </Link>
        </div>
      </Centered>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      <div className="mb-3 text-center text-sm text-muted">
        {i + 1} / {queue.length} due
      </div>

      <div
        className="card-surface flex flex-1 cursor-pointer flex-col items-center justify-center gap-4 p-6 text-center"
        onClick={() => !revealed && setRevealed(true)}
      >
        <div className="text-2xl font-semibold">{card.front}</div>
        {revealed && (
          <>
            <div className="h-px w-2/3 bg-white/10" />
            <div className="whitespace-pre-wrap text-lg text-muted">
              {card.back || <span className="italic">No answer yet</span>}
            </div>
          </>
        )}
        {card.tags && (
          <div className="flex flex-wrap justify-center gap-1">
            {card.tags.split(",").filter(Boolean).map((t) => (
              <span key={t} className="pill bg-surface2 text-muted">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        {!revealed ? (
          <button className="btn w-full bg-accent text-lg" onClick={() => setRevealed(true)}>
            Show answer
          </button>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {card.previews.map((p) => (
                <button
                  key={p.grade}
                  className={`btn flex flex-col items-center py-2 ${GRADE_META[p.grade].cls}`}
                  onClick={() => answer({ grade: p.grade })}
                >
                  <span>{GRADE_META[p.grade].label}</span>
                  <span className="text-xs font-normal opacity-90">
                    {formatInterval(p.intervalMin)}
                  </span>
                </button>
              ))}
            </div>

            <button
              className="w-full text-center text-sm text-muted underline"
              onClick={() => setShowDelays((s) => !s)}
            >
              {showDelays ? "Hide" : "Or pick an exact delay"}
            </button>

            {showDelays && (
              <div className="grid grid-cols-5 gap-2">
                {DELAY_PRESETS.map((d) => (
                  <button
                    key={d.label}
                    className="btn bg-surface2 py-2 text-sm"
                    onClick={() => answer({ delayMinutes: d.minutes })}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[70vh] items-center justify-center">{children}</div>;
}
